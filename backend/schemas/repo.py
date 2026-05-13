from pydantic import BaseModel


class ImportRequest(BaseModel):
    github_url: str


class Symbol(BaseModel):
    name: str
    kind: str
    line: int


class FileNode(BaseModel):
    path: str
    language: str | None
    size: int
    symbols: list[Symbol]
    summary: str | None = None


class RepoResponse(BaseModel):
    id: str
    full_name: str
    status: str
    files: list[FileNode]


class StatusResponse(BaseModel):
    id: str
    status: str
    files_count: int
