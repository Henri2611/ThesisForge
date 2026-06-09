from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import uuid

from utils.database import get_db
from utils.auth import get_current_user, get_current_user_optional
from models.user import User
from models.template import Template
from services.exporter.template_config import BUILTIN_TEMPLATES, TemplateConfig
from services.exporter.template_reader import read_template_from_docx

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])


class TemplateCreate(BaseModel):
    name: str
    organization: str = ""
    description: str = ""
    format: str = "DOCX"
    tags: list[str] = []
    config_json: dict = {}


class TemplateUpdate(BaseModel):
    name: str | None = None
    organization: str | None = None
    description: str | None = None
    format: str | None = None
    tags: list[str] | None = None
    config_json: dict | None = None


def _template_to_dict(t: Template) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "organization": t.organization,
        "description": t.description,
        "format": t.format,
        "tags": t.tags if isinstance(t.tags, list) else [],
        "is_global": t.is_global,
    }


@router.get("")
async def list_templates(user: User | None = Depends(get_current_user_optional), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Template).where(
            (Template.is_global == True) | ((Template.user_id == user.id) if user else False)
        ).order_by(Template.is_global.desc(), Template.name)
    )
    templates = result.scalars().all()
    return [_template_to_dict(t) for t in templates]


@router.get("/{template_id}")
async def get_template(template_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Template).where(Template.id == template_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")

    cfg = t.config_json if isinstance(t.config_json, dict) else {}
    return {
        **_template_to_dict(t),
        "config_json": cfg,
    }


@router.post("", status_code=201)
async def create_template(
    name: str = Form(...),
    organization: str = Form(""),
    description: str = Form(""),
    format: str = Form("DOCX"),
    tags: str = Form("[]"),
    config_json: str = Form("{}"),
    docx_file: UploadFile | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parsed_tags = json.loads(tags)
    parsed_config = json.loads(config_json)

    if docx_file and docx_file.filename and docx_file.filename.endswith(".docx"):
        content = await docx_file.read()
        tmp_path = f"/tmp/{uuid.uuid4().hex}.docx"
        with open(tmp_path, "wb") as f:
            f.write(content)
        try:
            extracted = read_template_from_docx(tmp_path)
            parsed_config = {**extracted.model_dump(), **parsed_config}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read DOCX: {e}")

    tid = f"user_{uuid.uuid4().hex[:12]}"
    t = Template(
        id=tid,
        user_id=user.id,
        name=name,
        organization=organization,
        description=description,
        format=format,
        tags=parsed_tags,
        config_json=parsed_config,
        is_global=False,
    )
    db.add(t)
    await db.commit()
    return _template_to_dict(t)


@router.patch("/{template_id}")
async def update_template(
    template_id: str,
    body: TemplateUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Template).where(Template.id == template_id, Template.user_id == user.id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found or not yours")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(t, key, value)
    await db.commit()
    return _template_to_dict(t)


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Template).where(Template.id == template_id, Template.user_id == user.id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found or not yours")
    await db.delete(t)
    await db.commit()
