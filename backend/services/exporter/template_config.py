from pydantic import BaseModel


class PageConfig(BaseModel):
    size: str = "A4"
    margin_top: float = 25.4
    margin_bottom: float = 25.4
    margin_left: float = 25.4
    margin_right: float = 25.4
    orientation: str = "portrait"


class FontConfig(BaseModel):
    body: str = "Times New Roman"
    heading: str = "Times New Roman"
    code: str = "Courier New"
    size_body: int = 12
    size_h1: int = 18
    size_h2: int = 16
    size_h3: int = 14


class SpacingConfig(BaseModel):
    line: float = 1.5
    after_para: int = 6
    before_heading: int = 12


class TemplateConfig(BaseModel):
    page: PageConfig = PageConfig()
    fonts: FontConfig = FontConfig()
    spacing: SpacingConfig = SpacingConfig()
    cover_page: bool = True
    heading_numbering: bool = True
    header: str = ""
    footer_page_numbers: bool = True
    color_primary: str = "#1A1A2E"


BUILTIN_TEMPLATES: dict[str, TemplateConfig] = {
    "ieee": TemplateConfig(
        page=PageConfig(margin_top=19.1, margin_bottom=19.1, margin_left=17.8, margin_right=17.8),
        fonts=FontConfig(body="Times New Roman", heading="Times New Roman", size_body=10, size_h1=14, size_h2=12, size_h3=11),
        spacing=SpacingConfig(line=1.0, after_para=3, before_heading=8),
        cover_page=False,
        heading_numbering=True,
        footer_page_numbers=True,
        color_primary="#000000",
    ),
    "harvard": TemplateConfig(
        page=PageConfig(margin_top=25.4, margin_bottom=25.4, margin_left=25.4, margin_right=25.4),
        fonts=FontConfig(body="Times New Roman", heading="Times New Roman", size_body=12, size_h1=18, size_h2=16, size_h3=14),
        spacing=SpacingConfig(line=1.5, after_para=6, before_heading=12),
        cover_page=True,
        heading_numbering=True,
        footer_page_numbers=True,
        color_primary="#1A1A2E",
    ),
    "apa": TemplateConfig(
        page=PageConfig(margin_top=25.4, margin_bottom=25.4, margin_left=25.4, margin_right=25.4),
        fonts=FontConfig(body="Times New Roman", heading="Times New Roman", size_body=12, size_h1=18, size_h2=16, size_h3=14),
        spacing=SpacingConfig(line=2.0, after_para=0, before_heading=12),
        cover_page=True,
        heading_numbering=False,
        footer_page_numbers=True,
        color_primary="#000000",
    ),
    "mla": TemplateConfig(
        page=PageConfig(margin_top=25.4, margin_bottom=25.4, margin_left=25.4, margin_right=25.4),
        fonts=FontConfig(body="Times New Roman", heading="Times New Roman", size_body=12, size_h1=16, size_h2=14, size_h3=13),
        spacing=SpacingConfig(line=2.0, after_para=0, before_heading=12),
        cover_page=False,
        heading_numbering=False,
        header="{last_name} {page_number}",
        footer_page_numbers=False,
        color_primary="#000000",
    ),
    "generic": TemplateConfig(
        page=PageConfig(margin_top=25.4, margin_bottom=25.4, margin_left=25.4, margin_right=25.4),
        fonts=FontConfig(body="Calibri", heading="Calibri Light", code="Consolas", size_body=11, size_h1=20, size_h2=16, size_h3=14),
        spacing=SpacingConfig(line=1.15, after_para=6, before_heading=12),
        cover_page=True,
        heading_numbering=True,
        footer_page_numbers=True,
        color_primary="#2563EB",
    ),
    "ieee-latex": TemplateConfig(
        page=PageConfig(margin_top=25.4, margin_bottom=25.4, margin_left=25.4, margin_right=25.4),
        fonts=FontConfig(body="Computer Modern", heading="Computer Modern", code="Computer Modern", size_body=10, size_h1=14, size_h2=12, size_h3=11),
        spacing=SpacingConfig(line=1.0, after_para=3, before_heading=8),
        cover_page=False,
        heading_numbering=True,
        footer_page_numbers=True,
        color_primary="#000000",
    ),
}
