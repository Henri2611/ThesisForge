from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from utils.config import settings
from utils.database import get_db

SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
        return None


async def _lookup_user_by_github_token(token: str, db: AsyncSession) -> User | None:
    """Try to authenticate using a GitHub personal access token."""
    try:
        from services.github.client import GitHubClient
        client = GitHubClient(token)
        try:
            github_user = await client.get_user()
        finally:
            await client.close()
        github_id = str(github_user["id"])
        result = await db.execute(select(User).where(User.github_id == github_id))
        return result.scalar_one_or_none()
    except Exception:
        return None


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    raw_token = credentials.credentials

    # Try JWT first
    user_id = decode_access_token(raw_token)
    if user_id:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            return user

    # Fallback: try as GitHub PAT
    user = await _lookup_user_by_github_token(raw_token, db)
    if user:
        return user

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None

    raw_token = credentials.credentials

    # Try JWT first
    user_id = decode_access_token(raw_token)
    if user_id:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            return user

    # Fallback: try as GitHub PAT
    return await _lookup_user_by_github_token(raw_token, db)
