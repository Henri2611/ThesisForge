import pytest
from typing import AsyncGenerator
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.fixture
def ast_parser():
    from services.parsing.ast_parser import ASTParser
    return ASTParser()


@pytest.fixture
def chunker():
    from services.parsing.chunker import SemanticChunker
    return SemanticChunker()


# API test client — no DB dependency
@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
