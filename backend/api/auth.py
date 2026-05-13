from fastapi import APIRouter, HTTPException, Query
from services.github.oauth import GitHubOAuth

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.get("/github/login")
async def github_login(redirect_uri: str = Query(...), state: str = Query("")):
    url = GitHubOAuth.get_authorize_url(redirect_uri, state)
    return {"authorize_url": url}


@router.post("/github/callback")
async def github_callback(code: str = Query(...), redirect_uri: str = Query(...)):
    token = await GitHubOAuth.exchange_code(code, redirect_uri)
    if not token:
        raise HTTPException(status_code=400, detail="Failed to exchange code")
    return {"access_token": token}
