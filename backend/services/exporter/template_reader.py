import logging
from docx import Document as DocxDocument
from docx.shared import Cm, Pt

from services.exporter.template_config import TemplateConfig, FontConfig, PageConfig, SpacingConfig

logger = logging.getLogger(__name__)


def read_template_from_docx(filepath: str) -> TemplateConfig:
    doc = DocxDocument(filepath)

    config = TemplateConfig()

    section = doc.sections[0] if doc.sections else None
    if section:
        config.page.margin_top = round(section.top_margin / Cm(1) * 10, 1)
        config.page.margin_bottom = round(section.bottom_margin / Cm(1) * 10, 1)
        config.page.margin_left = round(section.left_margin / Cm(1) * 10, 1)
        config.page.margin_right = round(section.right_margin / Cm(1) * 10, 1)

    try:
        normal = doc.styles["Normal"]
        font = normal.font
        if font.name:
            config.fonts.body = font.name
        if font.size:
            config.fonts.size_body = round(font.size / Pt(1))
        pf = normal.paragraph_format
        if pf.line_spacing:
            config.spacing.line = round(pf.line_spacing, 2)
        if pf.space_after:
            config.spacing.after_para = round(pf.space_after / Pt(1))
    except Exception as e:
        logger.warning(f"Could not read Normal style: {e}")

    for level, attr in [(1, "size_h1"), (2, "size_h2"), (3, "size_h3")]:
        try:
            style = doc.styles[f"Heading {level}"]
            if style.font.size:
                setattr(config.fonts, attr, round(style.font.size / Pt(1)))
            if style.font.name:
                config.fonts.heading = style.font.name
            if style.font.color and style.font.color.rgb:
                config.color_primary = str(style.font.color.rgb)
        except Exception:
            pass

    return config
