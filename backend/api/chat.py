import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from utils.database import get_db
from utils.config import settings
from models.repository import Repository
from models.chunk import Chunk
from models.file import File
from services.ai.embeddings import AIService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/repos", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


@router.post("/{repo_id}/chat")
async def chat_with_repo(repo_id: str, body: ChatRequest, db: AsyncSession = Depends(get_db)):
    repo = await db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    if not settings.deepseek_api_key and not settings.openai_api_key and not settings.gemini_api_key:
        return ChatResponse(response=f"I understand you're asking about {repo.full_name}: \"{body.message}\". AI chat requires an API key to be configured.")

    try:
        from openai import AsyncOpenAI

        if settings.deepseek_api_key:
            client = AsyncOpenAI(
                api_key=settings.deepseek_api_key,
                base_url="https://api.deepseek.com"
            )
            model = "deepseek-chat"
        elif settings.openai_api_key:
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            model = "gpt-4o"
        elif settings.gemini_api_key:
            client = AsyncOpenAI(
                api_key=settings.gemini_api_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
            )
            model = "gemini-2.0-flash"
        else:
            return ChatResponse(response="AI chat requires an API key to be configured.")

        # Ground the chat with repo context via RAG
        context_parts = []
        try:
            from sqlalchemy.orm import selectinload
            ai_service = AIService()
            query_embedding = await ai_service.get_single_embedding(body.message)
            chunk_result = await db.execute(
                select(Chunk)
                .options(selectinload(Chunk.file))
                .where(Chunk.repo_id == repo.id, Chunk.embedding.is_not(None))
                .order_by(Chunk.embedding.cosine_distance(query_embedding))
                .limit(10)
            )
            relevant_chunks = chunk_result.scalars().all()
            if relevant_chunks:
                context_parts.append("Relevant code context:")
                for c in relevant_chunks:
                    file_path = c.file.path if c.file else "unknown"
                    context_parts.append(f"--- {file_path} ---\n{c.content}")
        except Exception as e:
            logger.warning(f"RAG retrieval for chat failed: {e}")
            # Fallback: include file tree
            file_result = await db.execute(
                select(File).where(File.repo_id == repo.id).limit(30)
            )
            files = file_result.scalars().all()
            if files:
                context_parts.append("Repository file structure:")
                for f in files:
                    context_parts.append(f"- {f.path}: {f.content_summary or ''}")

        context = "\n".join(context_parts) if context_parts else "No code context available."
        system_prompt = f"You are a codebase assistant for the repository {repo.full_name}. Answer questions about its architecture, code, and documentation. Use the provided code context to ground your answers.\n\nContext:\n{context}"

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": body.message},
            ],
        )
        return ChatResponse(response=response.choices[0].message.content or "")
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return ChatResponse(response=f"AI chat error: {str(e)}")
