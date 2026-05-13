from typing import Any
from openai import AsyncOpenAI
from utils.config import settings


class DocGenerator:
    def __init__(self):
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def generate(self, repo: Any) -> list[dict]:
        overview = await self._generate_overview(repo)
        chapters = [overview]
        for file in repo.files[:15]:
            chapter = await self._generate_file_chapter(file)
            chapters.append(chapter)
        return chapters

    async def _generate_overview(self, repo: dict) -> dict:
        paths = "\n".join(f"  - {f['path']} ({f['language'] or 'unknown'})" for f in repo.files[:30])
        prompt = f"""You are a technical documentation writer. Given the following repository file tree, write an "Architecture Overview" chapter.

Repository: {repo['full_name']}
Files:
{paths}

Write a concise architecture overview in markdown. Cover:
- What the project does (infer from file names and structure)
- High-level architecture
- Key modules and how they relate
- Technology stack

Do NOT use placeholders. Write real content based on the file tree."""
        resp = await self._client.chat.completions.create(
            model="gpt-4o", messages=[{"role": "user", "content": prompt}], temperature=0.3
        )
        return {"title": "Architecture Overview", "content": resp.choices[0].message.content or "", "order": 1}

    async def _generate_file_chapter(self, file: dict) -> dict:
        symbols_text = "\n".join(f"  - {s['kind']}: {s['name']} (line {s['line']})" for s in file.get("symbols", [])[:20])
        prompt = f"""You are a technical documentation writer. Given the following file from a repository, write a "Component Description" chapter.

File: {file['path']}
Language: {file['language'] or 'unknown'}
Symbols:
{symbols_text}

Write a brief description of this component in markdown. Cover:
- Purpose of this file
- What each function/class does
- How it fits into the larger system

Be specific. Do NOT use placeholders."""
        resp = await self._client.chat.completions.create(
            model="gpt-4o", messages=[{"role": "user", "content": prompt}], temperature=0.3
        )
        return {"title": f"Module: {file['path']}", "content": resp.choices[0].message.content or "", "order": 0}
