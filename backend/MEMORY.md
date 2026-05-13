# Development Progress Notes

## Database & Infrastructure
- **Cloud Database:** Successfully connected to Neon PostgreSQL.
- **Migration System:** Initialized Alembic and applied the initial schema (Users, Repositories, Files, Symbols, Chunks).
- **Environment:** Configured `.env` with `postgresql+asyncpg` driver.
- **Vector Search:** Enabled `pgvector` extension on Neon.

## Features Implemented
- [x] **Transition API to DB:** Updated `backend/api/repos.py` to use SQLAlchemy.
- [x] **Background Ingestion:** Implemented `IngestorService` and `FastAPI.BackgroundTasks`.
- [x] **AST Parser:** Replaced `RegexParser` with a functional `tree-sitter` implementation.
- [x] **Symbol Storage:** Added `symbols` table for deep analysis.
- [x] **Semantic Chunking:** Logic to split code into logical segments based on AST symbols.
- [x] **Vector Store:** Indexing chunks with OpenAI embeddings in `pgvector`.

## Next Strategic Goals (Phase 2)
- [ ] **RAG Retrieval Logic:** Implement similarity search to find relevant code chunks.
- [ ] **Document Generation Engine:** Orchestrate LLM to write chapters using retrieved context.
- [ ] **Markdown Editor:** Implement a live preview editor in the frontend.
- [ ] **Document Persistence:** Create database tables for Docs and Chapters.
