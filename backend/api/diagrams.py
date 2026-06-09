from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from utils.database import get_db
from models.repository import Repository
from models.symbol import Symbol
from models.file import File

router = APIRouter(prefix="/api/v1/repos", tags=["diagrams"])


@router.get("/{repo_id}/dependencies")
async def get_dependency_graph(repo_id: str, db: AsyncSession = Depends(get_db)):
    repo = await db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    result = await db.execute(
        select(File).where(File.repo_id == repo_id)
    )
    files = result.scalars().all()
    file_path_set = {f.path for f in files}
    file_map = {f.id: f.path for f in files}

    symbols_result = await db.execute(
        select(Symbol).where(
            Symbol.file_id.in_([f.id for f in files]),
            Symbol.kind == "import"
        )
    )
    symbols = symbols_result.scalars().all()

    nodes = []
    edges = []
    seen = set()
    import re as _re

    for sym in symbols:
        source_path = file_map.get(sym.file_id, "unknown")
        if source_path not in seen:
            nodes.append({"id": source_path, "label": source_path.split("/")[-1]})
            seen.add(source_path)

        parts = _re.split(r"[,\s]+(?=(?:[^\"']*[\"'][^\"']*[\"'])*[^\"']*$)", sym.name)
        for part in parts:
            target = part.strip().strip('"').strip("'")
            if not target:
                continue

            # Resolve relative imports to absolute internal paths
            source_dir = "/".join(source_path.split("/")[:-1])
            resolved = _resolve_import_target(target, source_dir)

            # Only include edges to files that exist in the repo
            internal_targets = [p for p in resolved if p in file_path_set]
            for t in internal_targets:
                if t not in seen:
                    nodes.append({"id": t, "label": t.split("/")[-1]})
                    seen.add(t)
                edges.append({"source": source_path, "target": t, "type": "import"})

    return {"nodes": nodes, "edges": edges}


def _resolve_import_target(target: str, source_dir: str) -> list[str]:
    """Resolve a single import target to candidate internal file paths."""
    candidates = []

    if target.startswith("."):
        # Relative import: resolve against source directory
        parts = source_dir.split("/") if source_dir else []
        for segment in target.split("/"):
            if segment == "." or segment == "":
                continue
            elif segment == "..":
                if parts:
                    parts.pop()
            else:
                parts.append(segment)
        base = "/".join(parts) if parts else ""
        candidates.append(base)
        candidates.append(f"{base}/__init__")
    else:
        # Absolute import — try as-is, it may match a file or directory
        candidates.append(target)
        candidates.append(f"{target}/__init__")
        # Try stripping leading package segments
        parts = target.split(".")
        for i in range(len(parts) - 1):
            candidates.append("/".join(parts[i:]))

    return candidates
