"""Tests for the semantic chunker."""

from schemas.repo import Symbol
from models.chunk import Chunk as ChunkModel


class FakeSymbol:
    """Minimal symbol stub for chunker testing."""
    def __init__(self, name: str, kind: str, line: int):
        self.name = name
        self.kind = kind
        self.line = line


class TestSemanticChunker:
    def test_empty_file(self, chunker):
        chunks = chunker.chunk_file("repo1", "file1", "", [])
        assert chunks == []

    def test_no_symbols_simple_split(self, chunker):
        content = "\n".join([f"line {i}" for i in range(100)])
        chunks = chunker.chunk_file("repo1", "file1", content, [])
        assert len(chunks) == 2  # 100 lines / 50 per chunk
        assert chunks[0].start_line == 1
        assert chunks[0].end_line == 50
        assert chunks[1].start_line == 51
        assert chunks[1].end_line == 100

    def test_split_by_symbols(self, chunker):
        content = """import os
import sys

def helper():
    pass

class Main:
    def run(self):
        pass
"""
        symbols = [
            FakeSymbol("os", "import", 1),
            FakeSymbol("helper", "function", 4),
            FakeSymbol("Main", "class", 7),
        ]
        chunks = chunker.chunk_file("repo1", "file1", content, symbols)
        # Should have: pre-first-symbol, helper, Main
        assert len(chunks) >= 3

    def test_chunk_includes_repo_and_file_id(self, chunker):
        content = "def foo():\n    pass\n"
        symbols = [FakeSymbol("foo", "function", 1)]
        chunks = chunker.chunk_file("repo-abc", "file-xyz", content, symbols)
        for c in chunks:
            assert c.repo_id == "repo-abc"
            assert c.file_id == "file-xyz"

    def test_sequential_line_numbers(self, chunker):
        content = "line1\nline2\nline3\nline4\nline5\n"
        symbols = [FakeSymbol("sym1", "function", 2)]
        chunks = chunker.chunk_file("r", "f", content, symbols)
        for c in chunks:
            assert c.start_line <= c.end_line

    def test_no_symbols_single_chunk(self, chunker):
        content = "\n".join([f"line {i}" for i in range(10)])
        chunks = chunker.chunk_file("r", "f", content, [])
        assert len(chunks) == 1
        assert chunks[0].start_line == 1
        assert chunks[0].end_line == 10
