from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from utils.database import get_db
from utils.auth import get_current_user_optional
from models.user import User
from models.repository import Repository, RepoStatus
from models.document import Document, DocumentStatus
from models.export import Export, ExportStatus

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

@router.get("/metrics")
async def get_dashboard_metrics(user: User | None = Depends(get_current_user_optional), db: AsyncSession = Depends(get_db)):
    if not user:
        return {"repositories_indexed": 0, "documents_generated": 0, "export_count": 0}

    result = await db.execute(
        select(func.count()).select_from(Repository).where(
            Repository.status == RepoStatus.indexed,
            Repository.owner_id == user.id,
        )
    )
    indexed_repos = result.scalar() or 0

    docs_result = await db.execute(
        select(func.count()).select_from(Document)
        .join(Repository, Document.repo_id == Repository.id)
        .where(
            Repository.owner_id == user.id,
            Document.status == DocumentStatus.completed,
        )
    )
    docs_generated = docs_result.scalar() or 0

    exports_result = await db.execute(
        select(func.count()).select_from(Export)
        .join(Document, Export.doc_id == Document.id)
        .join(Repository, Document.repo_id == Repository.id)
        .where(
            Repository.owner_id == user.id,
            Export.status == ExportStatus.completed,
        )
    )
    export_count = exports_result.scalar() or 0

    return {
        "repositories_indexed": indexed_repos,
        "documents_generated": docs_generated,
        "export_count": export_count,
    }
