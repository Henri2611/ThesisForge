from pydantic import BaseModel


class ImportRequest(BaseModel):
    github_url: str


class Symbol(BaseModel):
    name: str
    kind: str
    line: int


class FileNode(BaseModel):
    id: str
    path: str
    language: str | None
    size: int
    symbols: list[Symbol]
    summary: str | None = None


class FileAnalysisResponse(BaseModel):
    id: str
    path: str
    language: str | None
    size: int
    summary: str | None = None
    symbols: list[Symbol]
    content: str


class RepoResponse(BaseModel):
    id: str
    full_name: str
    status: str
    files: list[FileNode]
    last_error: str | None = None


class StatusResponse(BaseModel):
    id: str
    status: str
    files_count: int
    last_error: str | None = None
