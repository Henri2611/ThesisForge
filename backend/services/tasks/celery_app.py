import asyncio
import logging

from celery import Celery

logger = logging.getLogger(__name__)

from utils.config import settings

celery_app = Celery(
    "thesisforge",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def run_export_task(self, export_id: str):
    from services.exporter.docx_exporter import DocxExporter
    from models.export import Export, ExportStatus
    from models.document import Document
    from models.chapter import Chapter
    from models.template import Template
    from utils.database import async_session_factory
    from sqlalchemy import select

    exporter = DocxExporter()

    async def _run():
        async with async_session_factory() as db:
            export = await db.get(Export, export_id)
            if not export:
                logger.error(f"Export {export_id} not found")
                return

            try:
                export.status = ExportStatus.processing
                await db.commit()

                doc = await db.get(Document, export.doc_id)
                if not doc:
                    raise ValueError("Document not found")

                result = await db.execute(
                    select(Chapter)
                    .where(Chapter.doc_id == export.doc_id)
                    .order_by(Chapter.order)
                )
                chapters = result.scalars().all()

                chapters_data = [
                    {"order": c.order, "title": c.title, "content": c.content}
                    for c in chapters
                ]

                template_id = export.template_id
                if template_id and not template_id.startswith(("ieee", "harvard", "apa", "mla", "generic")):
                    t_result = await db.execute(select(Template).where(Template.id == template_id))
                    t = t_result.scalar_one_or_none()
                    if t and t.config_json:
                        from services.exporter.template_config import TemplateConfig
                        custom_config = TemplateConfig(**t.config_json) if isinstance(t.config_json, dict) else None
                        filepath = exporter.export(doc.title, chapters_data, config=custom_config)
                    else:
                        filepath = exporter.export(doc.title, chapters_data, template_id)
                else:
                    filepath = exporter.export(doc.title, chapters_data, template_id)

                export.status = ExportStatus.completed
                export.file_path = filepath
            except Exception as e:
                logger.error(f"Export {export_id} failed: {e}")
                export.status = ExportStatus.failed
                export.error = str(e)
            finally:
                await db.commit()

    try:
        asyncio.run(_run())
    except Exception as exc:
        logger.error(f"Export task {export_id} failed: {exc}")
        raise self.retry(exc=exc)
