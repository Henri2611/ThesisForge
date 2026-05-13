import base64
from typing import Any

import httpx


SKIP_DIRS = {"node_modules", ".git", "__pycache__", "venv", ".venv", ".next", "dist", "build", "vendor", ".idea", ".vscode", "target", ".tox", "eggs", ".eggs", ".terraform", ".serverless"}
SKIP_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".avi", ".zip", ".tar", ".gz", ".exe", ".dll", ".so", ".dylib", ".bin", ".o", ".obj", ".pyc", ".class"}


class GitHubClient:
    def __init__(self, token: str):
        self.token = token
        self._client = httpx.AsyncClient(
            base_url="https://api.github.com",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.v3+json"},
        )

    async def get_user(self) -> dict[str, Any]:
        resp = await self._client.get("/user")
        resp.raise_for_status()
        return resp.json()

    async def get_repo(self, owner: str, name: str) -> dict[str, Any]:
        resp = await self._client.get(f"/repos/{owner}/{name}")
        resp.raise_for_status()
        return resp.json()

    async def walk_repo(self, owner: str, name: str, path: str = "") -> list[dict[str, Any]]:
        files: list[dict[str, Any]] = []
        contents = await self._list_contents(owner, name, path)
        for item in contents:
            if item["type"] == "dir":
                if item["name"] in SKIP_DIRS:
                    continue
                sub_files = await self.walk_repo(owner, name, item["path"])
                files.extend(sub_files)
            elif item["type"] == "file":
                ext = "." + item["name"].rsplit(".", 1)[-1].lower() if "." in item["name"] else ""
                if ext in SKIP_EXTS:
                    continue
                content = await self.get_file_content(owner, name, item["path"])
                files.append({"path": item["path"], "content": content, "size": item.get("size", 0)})
        return files

    async def _list_contents(self, owner: str, name: str, path: str = "") -> list[dict[str, Any]]:
        url = f"/repos/{owner}/{name}/contents/{path}"
        resp = await self._client.get(url)
        if resp.status_code == 403:
            return []
        resp.raise_for_status()
        return resp.json()

    async def get_file_content(self, owner: str, name: str, path: str) -> str:
        url = f"/repos/{owner}/{name}/contents/{path}"
        resp = await self._client.get(url)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list):
            return ""
        return base64.b64decode(data["content"]).decode("utf-8")

    async def close(self):
        await self._client.aclose()
