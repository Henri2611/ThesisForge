from pathlib import Path

from pydantic_settings import BaseSettings

_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/thesisforge"
    github_client_id: str = ""
    github_client_secret: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    deepseek_api_key: str = ""
    secret_key: str = "change-me-to-a-random-secret"
    redis_url: str = "redis://localhost:6379/0"

    model_config = {"env_file": _BACKEND_DIR / ".env", "case_sensitive": False}


settings = Settings()
