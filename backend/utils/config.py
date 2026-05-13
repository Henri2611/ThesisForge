from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/thesisforge"
    github_client_id: str = ""
    github_client_secret: str = ""
    openai_api_key: str = ""
    secret_key: str = "change-me-to-a-random-secret"

    model_config = {"env_file": ".env", "case_sensitive": False}


settings = Settings()
