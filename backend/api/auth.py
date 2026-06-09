import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.github.client import GitHubClient
from services.github.oauth import GitHubOAuth
from utils.auth import hash_password, verify_password, create_access_token, get_current_user
from utils.database import get_db
from utils.encryption import encrypt_token, decrypt_token
from models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"


class TokenValidationRequest(BaseModel):
    token: str


class SignupRequest(BaseModel):
    email: str
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    name: str | None = None
    github_login: str | None = None
    has_github_token: bool = False


class UserResponse(BaseModel):
    id: str
    email: str | None
    name: str | None
    avatar_url: str | None
    github_login: str | None = None
    has_github_token: bool = False


@router.post("/validate-token")
async def validate_github_token(body: TokenValidationRequest):
    if not body.token or len(body.token.strip()) < 5:
        return {"valid": False, "login": None, "error": "Token is empty or too short"}

    client = GitHubClient(body.token.strip())
    try:
        gh_user = await client.get_user()
        await client.close()
        return {"valid": True, "login": gh_user.get("login"), "avatar_url": gh_user.get("avatar_url")}
    except Exception as e:
        await client.close()
        return {"valid": False, "login": None, "error": str(e)}


@router.get("/github/login")
async def github_login(state: str = Query("")):
    redirect_uri = f"{BACKEND_URL}/auth/github/callback"
    url = GitHubOAuth.get_authorize_url(redirect_uri, state)
    return RedirectResponse(url=url)


@router.get("/github/callback")
async def github_callback_get(code: str = Query(...), db: AsyncSession = Depends(get_db)):
    return await _handle_github_callback(code, db)


@router.post("/github/callback")
async def github_callback_post(code: str = Query(...), db: AsyncSession = Depends(get_db)):
    return await _handle_github_callback(code, db)


async def _handle_github_callback(code: str, db: AsyncSession):
    redirect_uri = f"{BACKEND_URL}/auth/github/callback"
    gh_token = await GitHubOAuth.exchange_code(code, redirect_uri)
    if not gh_token:
        raise HTTPException(status_code=400, detail="Failed to exchange code")

    client = GitHubClient(gh_token)
    try:
        gh_user = await client.get_user()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get GitHub user: {e}")
    finally:
        await client.close()

    github_id = str(gh_user["id"])
    result = await db.execute(select(User).where(User.github_id == github_id))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            id=uuid.uuid4(),
            github_id=github_id,
            github_login=gh_user.get("login"),
            email=gh_user.get("email"),
            name=gh_user.get("name") or gh_user.get("login"),
            avatar_url=gh_user.get("avatar_url"),
            github_token_encrypted=encrypt_token(gh_token),
        )
        db.add(user)
    else:
        user.github_token_encrypted = encrypt_token(gh_token)
        user.github_login = gh_user.get("login") or user.github_login
        user.avatar_url = gh_user.get("avatar_url") or user.avatar_url

    await db.commit()
    await db.refresh(user)

    jwt_token = create_access_token(str(user.id))
    redirect_url = f"{FRONTEND_URL}/callback?token={jwt_token}&user_id={user.id}&email={user.email or ''}&name={user.name or ''}"
    if user.github_login:
        redirect_url += f"&github_login={user.github_login}"
    return RedirectResponse(url=redirect_url, status_code=302)


@router.post("/signup", status_code=201)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        id=uuid.uuid4(),
        email=body.email,
        name=body.name,
        github_id=f"local_{uuid.uuid4().hex[:12]}",
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        email=user.email or "",
        name=user.name,
    )


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        email=user.email or "",
        name=user.name,
        github_login=user.github_login,
        has_github_token=bool(user.github_token_encrypted),
    )


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        github_login=user.github_login,
        has_github_token=bool(user.github_token_encrypted),
    )


@router.post("/store-github-token")
async def store_github_token(body: TokenValidationRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not body.token or len(body.token.strip()) < 5:
        raise HTTPException(status_code=400, detail="Token is empty or too short")

    client = GitHubClient(body.token.strip())
    try:
        gh_user = await client.get_user()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid GitHub token: {e}")
    finally:
        await client.close()

    user.github_token_encrypted = encrypt_token(body.token.strip())
    user.github_login = gh_user.get("login") or user.github_login
    user.avatar_url = gh_user.get("avatar_url") or user.avatar_url
    await db.commit()

    return {"valid": True, "login": gh_user.get("login"), "avatar_url": gh_user.get("avatar_url")}
