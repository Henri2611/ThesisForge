import hashlib
import logging
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from services.github.client import GitHubClient
from services.parsing.language_detector import detect_language
from services.parsing.ast_parser import ASTParser
from services.parsing.chunker import SemanticChunker
from services.ai.embeddings import AIService
from models.repository import Repository, RepoStatus
from models.file import File as FileModel
from models.symbol import Symbol as SymbolModel
from models.chunk import Chunk as ChunkModel
from utils.database import async_session_factory

logger = logging.getLogger(__name__)

class IngestorService:
    def __init__(self):
        self.parser = ASTParser()
        self.chunker = SemanticChunker()
        self.ai = AIService()

    def _summarize_file(self, content: str, language: str | None, symbols: list) -> str:
        """Generate a one-line summary for a file from its content and AST symbols."""
        if language == "python":
            m = re.search(r'"""(.*?)"""', content, re.DOTALL)
            if not m:
                m = re.search(r"'''(.*?)'''", content, re.DOTALL)
            if m:
                first = m.group(1).strip().split("\n")[0]
                if first:
                    return first[:120]

        elif language in ("typescript", "javascript", "tsx", "java", "go", "c", "cpp", "c_sharp"):
            m = re.search(r'/\*\*(.*?)\*/', content, re.DOTALL)
            if m:
                first = m.group(1).strip().split("\n")[0].lstrip("* ")
                if first:
                    return first[:120]
            m = re.search(r'//\s*(.+)', content)
            if m:
                first = m.group(1).strip()
                if first and len(first) > 5:
                    return first[:120]

        # Fallback: structural summary from symbols
        kinds: dict[str, list[str]] = {}
        for s in symbols:
            kinds.setdefault(s.kind, []).append(s.name)

        parts = []
        for kind, names in kinds.items():
            if kind == "import":
                continue
            if len(names) <= 3:
                parts.append(f"{kind}s {', '.join(names)}")
            else:
                parts.append(f"{len(names)} {kind}s")

        if parts:
            return f"Defines {'; '.join(parts)}"

        return ""

    async def _update_repo_status(self, repo_id, status: RepoStatus, error: str | None = None):
        """Update repo status in a fresh session (handles stale connections)."""
        try:
            async with async_session_factory() as db:
                result = await db.execute(select(Repository).where(Repository.id == repo_id))
                repo = result.scalar_one_or_none()
                if repo:
                    repo.status = status
                    if error:
                        repo.last_error = error[:500]
                    await db.commit()
        except Exception as e:
            logger.error(f"Failed to update repo {repo_id} status to {status}: {e}")

    async def ingest_repository(self, repo_id: str, github_token: str):
        """Background task to ingest a repository."""
        # Step 1: Fetch repo info and mark as indexing (short-lived sessions)
        owner = None
        name = None
        async with async_session_factory() as db:
            result = await db.execute(select(Repository).where(Repository.id == repo_id))
            repo = result.scalar_one_or_none()
            if not repo:
                logger.error(f"Repository {repo_id} not found")
                return
            owner = repo.owner
            name = repo.name
            repo.status = RepoStatus.indexing
            await db.commit()

        # Step 2: Walk the repository (NO DB connection held during this long operation)
        client = GitHubClient(github_token)
        try:
            raw_files = await client.walk_repo(owner, name)
        except Exception as e:
            logger.error(f"Error walking repo: {e}")
            await self._update_repo_status(repo_id, RepoStatus.failed, str(e))
            return
        finally:
            await client.close()

        # Step 3: Process files with a fresh session after the walk
        async with async_session_factory() as db:
            try:
                result = await db.execute(select(Repository).where(Repository.id == repo_id))
                repo = result.scalar_one_or_none()
                if not repo:
                    logger.error(f"Repository {repo_id} not found")
                    return

                # Clear existing data
                await db.execute(
                    delete(ChunkModel).where(ChunkModel.repo_id == repo.id)
                )
                file_ids_subq = select(FileModel.id).where(FileModel.repo_id == repo.id)
                await db.execute(
                    delete(SymbolModel).where(SymbolModel.file_id.in_(file_ids_subq))
                )
                await db.execute(
                    delete(FileModel).where(FileModel.repo_id == repo.id)
                )

                # Process and save files, symbols, and chunks
                for rf in raw_files:
                    lang = detect_language(rf["path"])
                    symbols_list = []
                    if lang:
                        symbols_list = self.parser.parse(rf["content"], lang)

                    file_summary = self._summarize_file(rf["content"], lang, symbols_list)
                    file_obj = FileModel(
                        repo_id=repo.id,
                        path=rf["path"],
                        hash=hashlib.sha256(rf["content"].encode("utf-8")).hexdigest(),
                        language=lang,
                        size=rf["size"],
                        content_summary=file_summary
                    )
                    db.add(file_obj)
                    await db.flush()

                    for s in symbols_list:
                        symbol_obj = SymbolModel(
                            file_id=file_obj.id,
                            name=s.name,
                            kind=s.kind,
                            line=s.line
                        )
                        db.add(symbol_obj)

                    chunks = self.chunker.chunk_file(repo.id, file_obj.id, rf["content"], symbols_list)
                    if chunks:
                        contents = [c.content for c in chunks]
                        try:
                            embeddings = await self.ai.get_embeddings(contents)
                            for i, chunk in enumerate(chunks):
                                chunk.embedding = embeddings[i]
                                db.add(chunk)
                        except ValueError:
                            for chunk in chunks:
                                db.add(chunk)
                        except Exception as e:
                            logger.warning(f"Failed to generate embeddings for {rf['path']}: {e}")
                            for chunk in chunks:
                                db.add(chunk)

                repo.status = RepoStatus.indexed
                await db.commit()
                logger.info(f"Successfully ingested repository {repo.full_name}")

            except Exception as e:
                logger.error(f"Critical error during ingestion: {e}")
                await self._update_repo_status(repo_id, RepoStatus.failed, str(e))
                try:
                    await db.rollback()
                except Exception:
                    pass
