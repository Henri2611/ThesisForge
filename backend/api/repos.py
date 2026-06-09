import logging
import time
import uuid
from urllib.parse import urlparse

from fastapi import APIRouter, Header, HTTPException, Depends, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from schemas.repo import FileNode, FileAnalysisResponse, ImportRequest, RepoResponse, StatusResponse, Symbol
from services.github.client import GitHubClient
from services.parsing.language_detector import detect_language
from services.parsing.regex_parser import RegexParser
from services.ai.generator import DocGenerator
from services.parsing.ingestor import IngestorService
from utils.auth import get_current_user_optional
from utils.database import get_db
from utils.encryption import decrypt_token

logger = logging.getLogger(__name__)
from models.repository import Repository, RepoStatus
from models.file import File as FileModel
from models.user import User
from models.document import Document, DocumentStatus
from models.chapter import Chapter

router = APIRouter(prefix="/api/v1", tags=["repos"])

ingestor = IngestorService()


def _parse_github_url(url: str) -> tuple[str, str]:
    path = urlparse(url).path.strip("/")
    parts = path.split("/")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL")
    return parts[0], parts[1]


@router.get("/repos")
async def list_repos(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional),
):
    from sqlalchemy.orm import selectinload

    query = select(Repository).options(selectinload(Repository.files)).order_by(Repository.created_at.desc())
    if current_user:
        query = query.where(Repository.owner_id == current_user.id)
    result = await db.execute(query)
    repos = result.scalars().all()

    return [
        {
            "id": str(r.id),
            "full_name": r.full_name,
            "status": r.status,
            "files_count": len(r.files),
            "created_at": str(r.created_at)
        } for r in repos
    ]


@router.post("/repos/import", response_model=RepoResponse)
async def import_repo(
    body: ImportRequest, 
    background_tasks: BackgroundTasks,
    authorization: str = Header(""), 
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    # Resolve GitHub token: check stored token, fall back to header for legacy requests
    token = ""
    token_error = None
    if current_user and current_user.github_token_encrypted:
        try:
            token = decrypt_token(current_user.github_token_encrypted)
        except Exception as e:
            token_error = str(e)
            logger.warning("Failed to decrypt stored token for user %s: %s", current_user.id, e)
    if not token and not current_user:
        token = authorization.removeprefix("Bearer ").strip()
    if not token:
        detail = (
            "Your stored GitHub token could not be decrypted. "
            "Please re-enter it on the Dashboard."
            if token_error
            else "No GitHub token found. Connect GitHub in the Dashboard first."
        )
        raise HTTPException(status_code=400, detail=detail)

    owner, name = _parse_github_url(body.github_url)
    full_name = f"{owner}/{name}"
    
    # Determine owner: use authenticated user, or fall back to first user
    user = current_user
    if not user:
        result = await db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
    if not user:
        user = User(github_id="dummy_user", name="Dummy User")
        db.add(user)
        await db.flush()

    # Check if repo already exists for this user
    existing_repo_result = await db.execute(
        select(Repository).where(Repository.full_name == full_name, Repository.owner_id == user.id)
    )
    repo = existing_repo_result.scalar_one_or_none()
    
    if repo:
        if repo.status in [RepoStatus.indexed, RepoStatus.indexing]:
            # If already exists and good, just return it
            return RepoResponse(
                id=str(repo.id),
                full_name=repo.full_name,
                status=repo.status,
                files=[], # Tree endpoint will load files
                last_error=repo.last_error,
            )
        else:
            # If failed/pending, reset it
            repo.status = RepoStatus.pending
            repo.last_error = None
    else:
        # Create new Repository record
        # We need to get the github_id, so we still do a quick light-weight call to GitHub
        client = GitHubClient(token)
        try:
            repo_info = await client.get_repo(owner, name)
            github_id = str(repo_info["id"])
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
        finally:
            await client.close()

        repo = Repository(
            github_id=github_id,
            name=name,
            owner=owner,
            full_name=full_name,
            url=body.github_url,
            status=RepoStatus.pending,
            owner_id=user.id
        )
        db.add(repo)
    
    await db.commit()
    await db.refresh(repo)

    # Trigger background ingestion
    background_tasks.add_task(ingestor.ingest_repository, repo.id, token)
    
    return RepoResponse(
        id=str(repo.id),
        full_name=repo.full_name,
        status=repo.status,
        files=[], # Files will be populated in background
        last_error=repo.last_error,
    )


@router.get("/repos/{repo_id}/status", response_model=StatusResponse)
async def get_repo_status(repo_id: str, db: AsyncSession = Depends(get_db)):
    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Repo ID format")

    result = await db.execute(select(Repository).where(Repository.id == repo_uuid))
    repo = result.scalar_one_or_none()
    
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")
        
    # Count files
    from sqlalchemy import func
    count_result = await db.execute(select(func.count()).select_from(FileModel).where(FileModel.repo_id == repo.id))
    files_count = count_result.scalar() or 0
    
    return StatusResponse(id=str(repo.id), status=repo.status, files_count=files_count, last_error=repo.last_error)


@router.get("/repos/{repo_id}/tree", response_model=RepoResponse)
async def get_repo_tree(repo_id: str, db: AsyncSession = Depends(get_db)):
    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Repo ID format")

    result = await db.execute(select(Repository).where(Repository.id == repo_uuid))
    repo = result.scalar_one_or_none()
    
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")

    # Load files with symbols
    from sqlalchemy.orm import selectinload
    file_result = await db.execute(
        select(FileModel)
        .where(FileModel.repo_id == repo.id)
        .options(selectinload(FileModel.symbols))
    )
    db_files = file_result.scalars().all()
    
    files_response = [
        FileNode(
            id=str(f.id),
            path=f.path,
            language=f.language,
            size=f.size,
            summary=f.content_summary,
            symbols=[
                Symbol(name=s.name, kind=s.kind, line=s.line) 
                for s in f.symbols
            ]
        ) for f in db_files
    ]

    return RepoResponse(
        id=str(repo.id),
        full_name=repo.full_name,
        status=repo.status,
        files=files_response,
        last_error=repo.last_error,
    )


@router.get("/repos/{repo_id}/file-analysis/{file_id}", response_model=FileAnalysisResponse)
async def get_file_analysis(
    repo_id: str,
    file_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        file_uuid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid File ID format")

    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(FileModel)
        .where(FileModel.id == file_uuid)
        .options(selectinload(FileModel.symbols))
    )
    file = result.scalar_one_or_none()

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Get file content from chunks
    from models.chunk import Chunk
    chunk_result = await db.execute(
        select(Chunk)
        .where(Chunk.file_id == file.id)
        .order_by(Chunk.start_line)
    )
    chunks = chunk_result.scalars().all()
    content = "\n".join(c.content for c in chunks) if chunks else ""

    return FileAnalysisResponse(
        id=str(file.id),
        path=file.path,
        language=file.language,
        size=file.size,
        summary=file.content_summary,
        symbols=[
            Symbol(name=s.name, kind=s.kind, line=s.line)
            for s in file.symbols
        ],
        content=content,
    )


@router.post("/docs/generate")
async def generate_docs(
    body: dict, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    repo_id_str = body.get("repo_id")
    if not repo_id_str:
        raise HTTPException(status_code=400, detail="repo_id is required")

    try:
        repo_uuid = uuid.UUID(repo_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Repo ID format")

    result = await db.execute(select(Repository).where(Repository.id == repo_uuid))
    repo = result.scalar_one_or_none()
    
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found. Import it first.")

    # Validate AI config before creating document record
    try:
        generator = DocGenerator()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Create the Document model
    document = Document(
        repo_id=repo.id,
        title=body.get("title", f"Documentation for {repo.name}"),
        status=DocumentStatus.generating
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    # Trigger background generation
    background_tasks.add_task(generator.generate_document, repo.id, document.id)

    return {"id": str(document.id), "repo_id": str(repo.id), "status": document.status}


@router.get("/docs")
async def list_docs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Document).order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return [
        {
            "id": str(d.id),
            "title": d.title,
            "status": d.status.value if hasattr(d.status, 'value') else d.status,
            "repo_id": str(d.repo_id),
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]


@router.get("/docs/{doc_id}")
async def get_doc(doc_id: str, db: AsyncSession = Depends(get_db)):
    try:
        doc_uuid = uuid.UUID(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Doc ID format")

    result = await db.execute(select(Document).where(Document.id == doc_uuid))
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Doc not found")

    # Load chapters
    chapters_result = await db.execute(
        select(Chapter)
        .where(Chapter.doc_id == document.id)
        .order_by(Chapter.order)
    )
    chapters = chapters_result.scalars().all()

    return {
        "id": str(document.id),
        "title": document.title,
        "status": document.status,
        "repo_id": str(document.repo_id),
        "created_at": document.created_at,
        "chapters": [
            {
                "id": str(c.id),
                "title": c.title,
                "order": c.order,
                "content": c.content
            } for c in chapters
        ]
    }


@router.delete("/repos/{repo_id}")
async def delete_repo(
    repo_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Repo ID format")

    result = await db.execute(select(Repository).where(Repository.id == repo_uuid))
    repo = result.scalar_one_or_none()

    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    await db.delete(repo)
    await db.commit()

    return {"id": str(repo_uuid), "deleted": True}


@router.post("/repos/{repo_id}/readme")
async def generate_readme(
    repo_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    try:
        repo_uuid = uuid.UUID(repo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Repo ID format")

    result = await db.execute(select(Repository).where(Repository.id == repo_uuid))
    repo = result.scalar_one_or_none()

    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found")

    from sqlalchemy.orm import selectinload
    file_result = await db.execute(
        select(FileModel)
        .where(FileModel.repo_id == repo.id)
        .options(selectinload(FileModel.symbols))
    )
    db_files = file_result.scalars().all()

    file_list = "\n".join([
        f"- {f.path} ({f.language or 'unknown'}, {f.size}B)"
        + (f" — {f.content_summary}" if f.content_summary else "")
        + (f" — symbols: {', '.join(s.name for s in f.symbols[:5])}" if f.symbols else "")
        for f in db_files[:80]
    ])

    # Release the DB session before the LLM call to avoid connection timeouts
    full_name = repo.full_name
    url = repo.url
    await db.close()

    prompt = f"""You are writing a README.md for a GitHub repository.

Repository: {full_name}
Description: {url}

Here is the repository file structure with summaries and detected symbols:
{file_list}

Write a comprehensive README.md in Markdown. Include:
1. A title and short description of what this project does
2. Key features (inferred from the code structure)
3. Installation instructions
4. Usage guide
5. Architecture overview based on the file structure
6. Technologies used (inferred from file extensions)
7. Contributing guidelines (generic)

Make it professional, accurate, and well-structured. Do NOT use placeholders. Base everything on the provided file tree.
"""

    from openai import AsyncOpenAI
    from utils.config import settings

    clients: list[tuple[AsyncOpenAI, str]] = []
    if settings.deepseek_api_key:
        clients.append((
            AsyncOpenAI(
                api_key=settings.deepseek_api_key,
                base_url="https://api.deepseek.com"
            ),
            "deepseek-chat"
        ))
    if settings.gemini_api_key:
        clients.append((
            AsyncOpenAI(
                api_key=settings.gemini_api_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
            ),
            "gemini-2.0-flash"
        ))
    if settings.openai_api_key:
        clients.append((AsyncOpenAI(api_key=settings.openai_api_key), "gpt-4o"))

    if not clients:
        raise HTTPException(status_code=500, detail="No AI API keys configured")

    import logging
    logger = logging.getLogger(__name__)

    resp = None
    for client, model in clients:
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            if resp:
                break
        except Exception as e:
            logger.warning(f"README generation failed with {model}: {e}")
            continue

    content = resp.choices[0].message.content if resp else "# README\n\nCould not generate README."
    return {"readme": content}


@router.post("/docs/{doc_id}/cancel")
async def cancel_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        doc_uuid = uuid.UUID(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Doc ID format")

    result = await db.execute(select(Document).where(Document.id == doc_uuid))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.status not in (DocumentStatus.generating, DocumentStatus.pending):
        raise HTTPException(status_code=400, detail=f"Cannot cancel document with status '{document.status.value}'")

    document.status = DocumentStatus.cancelled
    await db.commit()

    return {"id": str(document.id), "status": document.status.value}


@router.post("/docs/{doc_id}/regenerate")
async def regenerate_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    try:
        doc_uuid = uuid.UUID(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Doc ID format")

    result = await db.execute(select(Document).where(Document.id == doc_uuid))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete existing chapters
    from sqlalchemy import delete
    await db.execute(delete(Chapter).where(Chapter.doc_id == document.id))

    # Reset document
    document.status = DocumentStatus.generating
    await db.commit()

    # Validate AI config and trigger regeneration
    try:
        generator = DocGenerator()
    except ValueError as e:
        document.status = DocumentStatus.failed
        await db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    background_tasks.add_task(generator.generate_document, document.repo_id, document.id)

    return {"id": str(document.id), "repo_id": str(document.repo_id), "status": document.status.value}


@router.patch("/docs/{doc_id}/chapters/{chapter_id}")
async def update_chapter(
    doc_id: str,
    chapter_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db)
):
    try:
        doc_uuid = uuid.UUID(doc_id)
        chapter_uuid = uuid.UUID(chapter_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    result = await db.execute(
        select(Chapter).where(Chapter.id == chapter_uuid, Chapter.doc_id == doc_uuid)
    )
    chapter = result.scalar_one_or_none()

    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    if "content" in body:
        chapter.content = body["content"]
    if "title" in body:
        chapter.title = body["title"]

    await db.commit()
    await db.refresh(chapter)

    return {
        "id": str(chapter.id),
        "title": chapter.title,
        "order": chapter.order,
        "content": chapter.content
    }
