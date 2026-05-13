import time
import uuid
from urllib.parse import urlparse

from fastapi import APIRouter, Header, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from schemas.repo import FileNode, ImportRequest, RepoResponse, StatusResponse, Symbol
from services.github.client import GitHubClient
from services.parsing.language_detector import detect_language
from services.parsing.regex_parser import RegexParser
from services.ai.generator import DocGenerator
from services.parsing.ingestor import IngestorService
from utils.database import get_db
from models.repository import Repository, RepoStatus
from models.file import File as FileModel
from models.user import User

router = APIRouter(prefix="/api/v1", tags=["repos"])

# Note: docs_store remains in-memory for now until we implement Document models
docs_store: dict[str, dict] = {}
parser = RegexParser()
ingestor = IngestorService()


def _parse_github_url(url: str) -> tuple[str, str]:
    path = urlparse(url).path.strip("/")
    parts = path.split("/")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL")
    return parts[0], parts[1]


@router.post("/repos/import", response_model=RepoResponse)
async def import_repo(
    body: ImportRequest, 
    background_tasks: BackgroundTasks,
    authorization: str = Header(""), 
    db: AsyncSession = Depends(get_db)
):
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="GitHub token required")

    owner, name = _parse_github_url(body.github_url)
    full_name = f"{owner}/{name}"
    
    # Get or create a dummy user
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
                files=[] # Tree endpoint will load files
            )
        else:
            # If failed/pending, reset it
            repo.status = RepoStatus.pending
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
    
    return StatusResponse(id=str(repo.id), status=repo.status, files_count=files_count)


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
        files=files_response
    )


@router.post("/docs/generate")
async def generate_docs(body: dict, authorization: str = Header("")):
    repo_id = body.get("repo_id")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="GitHub token required")

    repo = repos_store.get(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repo not found. Import it first.")

    generator = DocGenerator()
    doc = await generator.generate(repo)

    doc_id = f"doc-{repo_id}-{int(time.time())}"
    docs_store[doc_id] = {"id": doc_id, "repo_id": repo_id, "chapters": doc}
    return {"id": doc_id, "repo_id": repo_id, "chapters": doc}


@router.get("/docs/{doc_id}")
async def get_doc(doc_id: str):
    doc = docs_store.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doc not found")
    return doc
