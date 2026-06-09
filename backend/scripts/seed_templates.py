"""Seed built-in templates into the database."""
import asyncio
import json
from sqlalchemy import text
from utils.database import async_session_factory
from services.exporter.template_config import BUILTIN_TEMPLATES


async def seed_templates():
    async with async_session_factory() as db:
        result = await db.execute(text("SELECT count(*) FROM templates"))
        count = result.scalar()
        if count and count > 0:
            print(f"Templates already seeded ({count} found), skipping.")
            return

        templates_meta = [
            {"id": "ieee", "name": "IEEE Conference", "organization": "IEEE",
             "description": "IEEE conference paper format with two-column layout, section numbering, and citation style.",
             "tags": ["engineering", "conference", "technical"], "format": "DOCX"},
            {"id": "harvard", "name": "Harvard Thesis", "organization": "Harvard University",
             "description": "Harvard-style thesis format with title page, table of contents, and Harvard referencing.",
             "tags": ["academic", "thesis", "humanities"], "format": "DOCX"},
            {"id": "apa", "name": "APA Report", "organization": "APA",
             "description": "APA 7th edition format for research papers, with proper heading styles and citation formatting.",
             "tags": ["academic", "research", "social-sciences"], "format": "DOCX"},
            {"id": "mla", "name": "MLA Research Paper", "organization": "MLA",
             "description": "MLA 9th edition format with works cited page, in-text citations, and heading structure.",
             "tags": ["academic", "research", "humanities"], "format": "DOCX"},
            {"id": "generic", "name": "Generic Technical Report", "organization": "Standard",
             "description": "Clean technical report format with cover page, abstract, sections, and appendix support.",
             "tags": ["technical", "report", "general"], "format": "DOCX"},
            {"id": "ieee-latex", "name": "IEEE (LaTeX)", "organization": "IEEE",
             "description": "IEEE format using LaTeX with full bibliography and cross-referencing support.",
             "tags": ["engineering", "latex", "conference"], "format": "LaTeX"},
        ]

        for meta in templates_meta:
            tid = meta["id"]
            config = BUILTIN_TEMPLATES.get(tid)
            tags_json = json.dumps(meta["tags"])
            cfg_json = json.dumps(config.model_dump()) if config else "{}"
            await db.execute(
                text(f"""
                    INSERT INTO templates (id, user_id, name, organization, description, format, tags, config_json, is_global, created_at)
                    VALUES ('{tid}', NULL, :name, :org, :desc, :fmt, '{tags_json}'::jsonb, '{cfg_json}'::jsonb, true, now())
                """),
                {
                    "name": meta["name"],
                    "org": meta["organization"],
                    "desc": meta["description"],
                    "fmt": meta["format"],
                }
            )
            print(f"  Seeded '{tid}'")

        await db.commit()
        print(f"Seeded {len(templates_meta)} built-in templates.")


if __name__ == "__main__":
    asyncio.run(seed_templates())
