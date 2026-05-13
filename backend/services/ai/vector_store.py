from sqlalchemy import text
from utils.database import async_session_factory


class VectorStore:
    DIMENSION = 1536  # text-embedding-3-small

    @classmethod
    async def ensure_pgvector(cls):
        async with async_session_factory() as session:
            await session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await session.commit()

    @classmethod
    async def store_embedding(cls, file_id: str, chunk_index: int, embedding: list[float], content: str):
        async with async_session_factory() as session:
            await session.execute(
                text("""
                    INSERT INTO embeddings (file_id, chunk_index, embedding, content)
                    VALUES (:file_id, :chunk_index, :embedding::vector, :content)
                """),
                {"file_id": file_id, "chunk_index": chunk_index, "embedding": embedding, "content": content},
            )
            await session.commit()

    @classmethod
    async def search(cls, embedding: list[float], top_k: int = 5) -> list[dict]:
        async with async_session_factory() as session:
            rows = await session.execute(
                text("""
                    SELECT file_id, chunk_index, content,
                           1 - (embedding <=> :embedding::vector) AS similarity
                    FROM embeddings
                    ORDER BY embedding <=> :embedding::vector
                    LIMIT :top_k
                """),
                {"embedding": embedding, "top_k": top_k},
            )
            return [dict(row._mapping) for row in rows]
