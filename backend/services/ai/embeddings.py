import logging
from openai import AsyncOpenAI
from utils.config import settings

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self):
        self._primary_client: AsyncOpenAI | None = None
        self._fallback_client: AsyncOpenAI | None = None
        self._primary_model = "text-embedding-3-small"
        self._fallback_model = "text-embedding-3-small"

        if settings.gemini_api_key:
            self._primary_client = AsyncOpenAI(
                api_key=settings.gemini_api_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
            )
            self._primary_model = "text-embedding-004"

        if settings.openai_api_key:
            self._fallback_client = AsyncOpenAI(api_key=settings.openai_api_key)
            self._fallback_model = "text-embedding-3-small"

        if settings.gemini_api_key and not settings.openai_api_key:
            self._fallback_client = None

        if not self._primary_client and not self._fallback_client:
            logger.warning("No embedding provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY for vector search.")

    async def _try_embeddings(self, client: AsyncOpenAI, model: str, texts: list[str]) -> list[list[float]] | None:
        try:
            response = await client.embeddings.create(model=model, input=texts)
            return [data.embedding for data in response.data]
        except Exception as e:
            logger.warning(f"Embedding failed with model {model}: {e}")
            return None

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        if self._primary_client:
            result = await self._try_embeddings(self._primary_client, self._primary_model, texts)
            if result is not None:
                return result
            logger.info("Primary embedding provider failed, trying fallback...")

        if self._fallback_client:
            result = await self._try_embeddings(self._fallback_client, self._fallback_model, texts)
            if result is not None:
                return result

        raise ValueError("No embedding providers available. Set GEMINI_API_KEY or OPENAI_API_KEY for vector search.")

    async def get_single_embedding(self, text: str) -> list[float]:
        embeddings = await self.get_embeddings([text])
        return embeddings[0]

