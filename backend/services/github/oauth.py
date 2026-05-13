import httpx
from utils.config import settings


class GitHubOAuth:
    AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
    TOKEN_URL = "https://github.com/login/oauth/access_token"
    SCOPES = "read:user,repo"

    @classmethod
    def get_authorize_url(cls, redirect_uri: str, state: str) -> str:
        params = f"client_id={settings.github_client_id}&redirect_uri={redirect_uri}&scope={cls.SCOPES}&state={state}"
        return f"{cls.AUTHORIZE_URL}?{params}"

    @classmethod
    async def exchange_code(cls, code: str, redirect_uri: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                cls.TOKEN_URL,
                data={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("access_token", "")
