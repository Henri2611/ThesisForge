import logging
from typing import Any
from models.symbol import Symbol
from models.chunk import Chunk as ChunkModel

logger = logging.getLogger(__name__)

class SemanticChunker:
    def __init__(self, max_tokens: int = 500):
        self.max_tokens = max_tokens

    def chunk_file(self, repo_id: Any, file_id: Any, content: str, symbols: list[Any]) -> list[ChunkModel]:
        """
        Splits file content into logical chunks based on AST symbols.
        """
        lines = content.splitlines()
        if not lines:
            return []

        chunks = []
        
        # Sort symbols by line number
        sorted_symbols = sorted(symbols, key=lambda s: s.line)
        
        # If no symbols, do a simple line-based split
        if not sorted_symbols:
            return self._simple_chunk(repo_id, file_id, lines)

        # Create chunks based on symbols (functions, classes)
        for i, symbol in enumerate(sorted_symbols):
            start_line = symbol.line - 1 # 0-indexed
            
            # End line is the start of the next symbol, or end of file
            if i + 1 < len(sorted_symbols):
                end_line = sorted_symbols[i+1].line - 1
            else:
                end_line = len(lines)

            chunk_content = "\n".join(lines[start_line:end_line])
            
            # If chunk is too large, we could further split it, but for now we keep it
            chunks.append(ChunkModel(
                repo_id=repo_id,
                file_id=file_id,
                content=chunk_content,
                start_line=start_line + 1,
                end_line=end_line
            ))

        # Handle code before the first symbol
        if sorted_symbols[0].line > 1:
            first_chunk_content = "\n".join(lines[0:sorted_symbols[0].line - 1])
            if first_chunk_content.strip():
                chunks.insert(0, ChunkModel(
                    repo_id=repo_id,
                    file_id=file_id,
                    content=first_chunk_content,
                    start_line=1,
                    end_line=sorted_symbols[0].line - 1
                ))

        return chunks

    def _simple_chunk(self, repo_id: Any, file_id: Any, lines: list[str]) -> list[ChunkModel]:
        chunks = []
        chunk_size = 50 # lines
        for i in range(0, len(lines), chunk_size):
            end = min(i + chunk_size, len(lines))
            content = "\n".join(lines[i:end])
            chunks.append(ChunkModel(
                repo_id=repo_id,
                file_id=file_id,
                content=content,
                start_line=i + 1,
                end_line=end
            ))
        return chunks
