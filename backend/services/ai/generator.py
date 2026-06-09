import uuid
import json
import logging
from sqlalchemy import select
from openai import AsyncOpenAI

from models.repository import Repository
from models.document import Document, DocumentStatus
from models.chapter import Chapter
from models.chunk import Chunk
from services.ai.embeddings import AIService
from utils.config import settings
from utils.database import async_session_factory

logger = logging.getLogger(__name__)

class DocGenerator:
    def __init__(self):
        self.ai_service = AIService()
        self._clients: list[tuple[AsyncOpenAI, str]] = []

        if settings.deepseek_api_key:
            self._clients.append((
                AsyncOpenAI(
                    api_key=settings.deepseek_api_key,
                    base_url="https://api.deepseek.com"
                ),
                "deepseek-chat"
            ))

        if settings.gemini_api_key:
            self._clients.append((
                AsyncOpenAI(
                    api_key=settings.gemini_api_key,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
                ),
                "gemini-2.0-flash"
            ))

        if settings.openai_api_key:
            self._clients.append((
                AsyncOpenAI(api_key=settings.openai_api_key),
                "gpt-4o"
            ))

        if not self._clients:
            raise ValueError("No AI API keys configured. Set DEEPSEEK_API_KEY, GEMINI_API_KEY or OPENAI_API_KEY.")

    async def generate_document(self, repo_id: uuid.UUID, document_id: uuid.UUID) -> None:
        """
        Background task to generate a full document for a repository.
        DB sessions are short-lived and never held during LLM calls.
        """
        repo_name = ""
        paths = ""

        # 1. Fetch repo, document, and file tree in one fast session
        async with async_session_factory() as db:
            try:
                result = await db.execute(select(Repository).where(Repository.id == repo_id))
                repo = result.scalar_one_or_none()

                result = await db.execute(select(Document).where(Document.id == document_id))
                document = result.scalar_one_or_none()

                if not repo or not document:
                    logger.error(f"Repo or Document not found. repo_id={repo_id}, doc_id={document_id}")
                    return

                repo_name = repo.full_name
                from models.file import File
                file_result = await db.execute(select(File).where(File.repo_id == repo.id))
                files = file_result.scalars().all()
                paths = "\n".join([f"- {f.path}" for f in files[:50]])
            except Exception as e:
                logger.error(f"Failed to fetch repo/document: {e}")
                return

        # 2. Generate TOC (no DB session held)
        logger.info(f"Starting TOC generation for repo {repo_id}")
        toc = await self._generate_toc(repo_name, paths)

        # 3. Iterate through TOC and generate chapters using RAG
        for idx, section in enumerate(toc):
            # Check cancellation in a fresh session
            async with async_session_factory() as db:
                doc_check = await db.get(Document, document_id)
                if doc_check and doc_check.status == DocumentStatus.cancelled:
                    logger.info(f"Document {document_id} cancelled, stopping generation")
                    return

                chapter = Chapter(
                    doc_id=document_id,
                    title=section.get("title", f"Chapter {idx + 1}"),
                    order=idx + 1,
                )
                db.add(chapter)
                await db.commit()
                chapter_id = chapter.id

            # Generate content (opens its own short sessions, closes before LLM)
            content, context = await self._generate_chapter_content(repo_id, section)

            # Save content in a fresh session
            async with async_session_factory() as db:
                result = await db.execute(select(Chapter).where(Chapter.id == chapter_id))
                saved_chapter = result.scalar_one_or_none()
                if saved_chapter:
                    saved_chapter.content = content
                    saved_chapter.ai_prompt_context = context
                    await db.commit()

        # Final check and mark complete
        async with async_session_factory() as db:
            try:
                doc_check = await db.get(Document, document_id)
                if doc_check and doc_check.status == DocumentStatus.cancelled:
                    logger.info(f"Document {document_id} cancelled after last chapter, stopping")
                    return

                doc_check.status = DocumentStatus.completed
                await db.commit()
                logger.info(f"Successfully generated document {document_id} for repo {repo_id}")
            except Exception as e:
                logger.error(f"Failed to mark document {document_id} as completed: {e}")
                doc_check.status = DocumentStatus.failed
                await db.commit()

    async def _generate_toc(self, full_name: str, paths: str) -> list[dict]:
        prompt = f"""You are an expert technical writer. You need to create a Table of Contents for a comprehensive architecture and technical document for a repository.
Repository name: {full_name}

Here are the main files in the repository:
{paths}

Respond ONLY with a JSON array of objects, where each object has a "title" and a "description" field. The description should explain what will be covered in that section and will be used later as a search query to find relevant code snippets.
Example:
[
  {{"title": "1. Introduction", "description": "Overview of the project and its core purpose."}},
  {{"title": "2. High-Level Architecture", "description": "Main components, modules, and how they interact."}}
]
"""
        resp = None
        for client, model in self._clients:
            try:
                resp = await client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                    timeout=30
                )
                if resp:
                    break
            except Exception as e:
                logger.warning(f"TOC generation failed with {model}: {e}")
                continue

        if not resp:
            logger.error("All LLM providers failed for TOC generation")
            return [
                {"title": "Architecture Overview", "description": "High level overview of the system architecture."},
                {"title": "Core Components", "description": "Description of the main classes, functions and files."}
            ]
        
        content = resp.choices[0].message.content
        try:
            toc = json.loads(content)
            if isinstance(toc, dict):
                for v in toc.values():
                    if isinstance(v, list):
                        return v
            return toc if isinstance(toc, list) else [toc]
        except Exception as e:
            logger.error(f"Error parsing TOC JSON: {e}")
            # Fallback TOC
            return [
                {"title": "Architecture Overview", "description": "High level overview of the system architecture."},
                {"title": "Core Components", "description": "Description of the main classes, functions and files."}
            ]

    async def _generate_chapter_content(self, repo_id: uuid.UUID, section: dict) -> tuple[str, dict]:
        query_text = f"{section.get('title', '')}: {section.get('description', '')}"

        context_text = ""
        retrieved_chunk_ids = []

        # Short-lived session for RAG retrieval
        try:
            async with async_session_factory() as db:
                query_embedding = await self.ai_service.get_single_embedding(query_text)

                stmt = (
                    select(Chunk)
                    .where(Chunk.repo_id == repo_id)
                    .where(Chunk.embedding.is_not(None))
                    .order_by(Chunk.embedding.cosine_distance(query_embedding))
                    .limit(10)
                )
                result = await db.execute(stmt)
                chunks = result.scalars().all()

                if chunks:
                    context_snippets = [c.content for c in chunks]
                    context_text = "\n\n---\n\n".join(context_snippets)
                    retrieved_chunk_ids = [str(c.id) for c in chunks]
        except Exception as e:
            logger.warning(f"RAG retrieval failed for section '{section.get('title')}': {e}. Falling back to file tree context.")

        # Fallback: separate session for file tree context
        if not context_text:
            try:
                async with async_session_factory() as db:
                    from models.file import File as FileModel
                    file_result = await db.execute(
                        select(FileModel).where(FileModel.repo_id == repo_id).limit(30)
                    )
                    files = file_result.scalars().all()
                    file_summaries = "\n".join([
                        f"- {f.path}: {f.content_summary or 'No summary'}" for f in files
                    ])
                    context_text = f"Repository file structure:\n{file_summaries}"
            except Exception as e:
                logger.warning(f"File tree fallback failed: {e}")

        # Build prompt (no DB session needed for LLM call)
        prompt = f"""You are writing a technical documentation chapter. 
Chapter Title: {section.get('title')}
Description: {section.get('description')}

Here is relevant context extracted from the codebase:
{context_text}

Write the content for this chapter in Markdown. Make it professional, accurate, and base it strictly on the provided context. Do NOT use placeholders. If the context is insufficient, write what you can logically infer based on the context. Focus entirely on writing the content.
"""
        resp = None
        for client, model in self._clients:
            try:
                resp = await client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                    timeout=30
                )
                if resp:
                    break
            except Exception as e:
                logger.warning(f"Chapter generation failed with {model}: {e}")
                continue

        content = resp.choices[0].message.content if resp else f"*Content for {section.get('title')} could not be generated due to API unavailability.*"

        ai_context = {
            "query": query_text,
            "retrieved_chunks": retrieved_chunk_ids,
            "prompt_length": len(prompt)
        }

        return content or "", ai_context
