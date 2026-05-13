import logging
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

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

    async def ingest_repository(self, repo_id: str, github_token: str):
        """
        Background task to ingest a repository.
        """
        async with async_session_factory() as db:
            # 1. Get the repository record
            result = await db.execute(select(Repository).where(Repository.id == repo_id))
            repo = result.scalar_one_or_none()
            
            if not repo:
                logger.error(f"Repository {repo_id} not found for background ingestion")
                return

            try:
                # 2. Update status to indexing
                repo.status = RepoStatus.indexing
                await db.commit()

                # 3. Walk the repository
                client = GitHubClient(github_token)
                try:
                    raw_files = await client.walk_repo(repo.owner, repo.name)
                except Exception as e:
                    logger.error(f"Error walking repo {repo.full_name}: {e}")
                    repo.status = RepoStatus.failed
                    await db.commit()
                    return
                finally:
                    await client.close()

                # 4. Process and save files, symbols, and chunks
                for rf in raw_files:
                    lang = detect_language(rf["path"])

                    # Extract symbols using AST (needed before summary)
                    symbols_list = []
                    if lang:
                        symbols_list = self.parser.parse(rf["content"], lang)

                    # Save File to DB with summary
                    file_summary = self._summarize_file(rf["content"], lang, symbols_list)
                    file_obj = FileModel(
                        repo_id=repo.id,
                        path=rf["path"],
                        hash="hash_placeholder",
                        language=lang,
                        size=rf["size"],
                        content_summary=file_summary
                    )
                    db.add(file_obj)
                    await db.flush() # Get file_obj.id

                    # Save symbols
                    for s in symbols_list:
                        symbol_obj = SymbolModel(
                            file_id=file_obj.id,
                            name=s.name,
                            kind=s.kind,
                            line=s.line
                        )
                        db.add(symbol_obj)

                    # Create semantic chunks
                    chunks = self.chunker.chunk_file(repo.id, file_obj.id, rf["content"], symbols_list)
                    if chunks:
                        # Batch generate embeddings for chunks in this file
                        contents = [c.content for c in chunks]
                        try:
                            embeddings = await self.ai.get_embeddings(contents)
                            for i, chunk in enumerate(chunks):
                                chunk.embedding = embeddings[i]
                                db.add(chunk)
                        except Exception as e:
                            logger.warning(f"Failed to generate embeddings for {rf['path']}: {e}")
                            # Still save chunks without embeddings as fallback
                            for chunk in chunks:
                                db.add(chunk)

                # 5. Finalize
                repo.status = RepoStatus.indexed
                await db.commit()
                logger.info(f"Successfully ingested repository {repo.full_name} with AST symbols and vector chunks")

            except Exception as e:
                logger.error(f"Critical error during ingestion of {repo.full_name}: {e}")
                repo.status = RepoStatus.failed
                await db.commit()
