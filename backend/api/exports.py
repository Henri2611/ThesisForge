import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from utils.database import get_db
from models.document import Document, DocumentStatus
from models.export import Export, ExportStatus
from services.tasks.celery_app import run_export_task

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/docs", tags=["exports"])


class ExportRequest(BaseModel):
    template_id: str | None = None
    format: str = "DOCX"


@router.post("/{doc_id}/export", status_code=201)
async def create_export(
    doc_id: str,
    body: ExportRequest,
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != DocumentStatus.completed:
        raise HTTPException(status_code=400, detail="Document generation not completed yet")

    export = Export(
        doc_id=doc.id,
        template_id=body.template_id,
        format=body.format.upper(),
        status=ExportStatus.pending,
    )
    db.add(export)
    await db.commit()
    await db.refresh(export)

    run_export_task.delay(str(export.id))

    return {
        "id": str(export.id),
        "status": export.status.value,
        "format": export.format,
    }


@router.get("/{doc_id}/exports")
async def list_exports(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    result = await db.execute(
        select(Export).where(Export.doc_id == doc_id).order_by(Export.created_at.desc())
    )
    exports = result.scalars().all()

    return [
        {
            "id": str(e.id),
            "format": e.format,
            "status": e.status.value,
            "error": e.error,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in exports
    ]


@router.get("/{doc_id}/exports/{export_id}/status")
async def get_export_status(doc_id: str, export_id: str, db: AsyncSession = Depends(get_db)):
    export = await db.get(Export, export_id)
    if not export or str(export.doc_id) != doc_id:
        raise HTTPException(status_code=404, detail="Export not found")

    return {
        "id": str(export.id),
        "status": export.status.value,
        "error": export.error,
    }


@router.get("/{doc_id}/exports/{export_id}/download")
async def download_export(doc_id: str, export_id: str, db: AsyncSession = Depends(get_db)):
    export = await db.get(Export, export_id)
    if not export or str(export.doc_id) != doc_id:
        raise HTTPException(status_code=404, detail="Export not found")
    if export.status != ExportStatus.completed:
        raise HTTPException(status_code=400, detail="Export not ready yet")
    if not export.file_path or not os.path.exists(export.file_path):
        raise HTTPException(status_code=404, detail="Export file not found")

    filename = f"thesisforge-export.{export.format.lower()}"
    return FileResponse(
        export.file_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename,
    )
