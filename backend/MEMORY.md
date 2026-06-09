# Development Progress Notes

## Database & Infrastructure
- **Cloud Database:** Successfully connected to Neon PostgreSQL.
- **Migration System:** Initialized Alembic and applied the initial schema (7 tables: users, repositories, files, symbols, chunks, documents, chapters).
- **Environment:** Configured `.env` with `postgresql+asyncpg` driver.
- **Vector Search:** Enabled `pgvector` extension on Neon.

## Features Implemented (Phase 1 — Repo Parsing & Understanding)
- [x] **GitHub OAuth:** Login/callback flow for repo access.
- [x] **Repository Import:** Background ingestion via `IngestorService` + `BackgroundTasks`.
- [x] **AST Parser:** tree-sitter parsing for Python, TS/JS, Go, Java with symbol extraction.
- [x] **Symbol Storage:** `symbols` table storing functions, classes, methods, imports.
- [x] **Semantic Chunking:** Code split into logical AST-bounded segments.
- [x] **Vector Store:** Chunks table with pgvector (1536-dim) for embeddings.
- [x] **Dashboard Metrics:** Real DB queries for repos/docs counts.
- [x] **Real File Hashing:** SHA256 content hashing (replaced placeholder).
- [x] **Error Boundaries:** `not-found.tsx`, `error.tsx`, `loading.tsx` on frontend.

## Features Implemented (Phase 2 — Document Generation)
- [x] **Document Model:** `documents` + `chapters` tables with status tracking.
- [x] **TOC Generation:** LLM generates structured table of contents from repo files.
- [x] **RAG Retrieval:** Cosine similarity search over chunk embeddings for context.
- [x] **Chapter Content Generation:** LLM writes chapters using retrieved code context.
- [x] **Fallback Context:** When embeddings unavailable, uses file summaries as context.
- [x] **Dual AI Provider:** Auto-fallback between Gemini and OpenAI for both embeddings + generation.
- [x] **Repo List Endpoint:** `GET /api/v1/repos` returns all imported repos.
- [x] **Frontend Repo List:** Dynamic repo listing on `/repos` page.

## Document Generation Engine
The full pipeline is functional:
1. User clicks "Generate Documentation" on repo detail page
2. Backend creates a `Document` record + triggers background `DocGenerator`
3. `DocGenerator` generates TOC via LLM (file list → structured JSON)
4. For each TOC section: embeds query → RAG over chunks → LLM writes chapter
5. Document status transitions: `pending → generating → completed/failed`
6. Frontend polls `/docs/{id}` every 5s while status is `generating`
7. Chapters rendered as Markdown via `react-markdown` + `remark-gfm`

## Known Issues
- **Embeddings:** Gemini `text-embedding-004` may return 404; code now auto-fallsback to OpenAI `text-embedding-3-small`.
- **LLM Quota:** Gemini free-tier quotas may be exhausted; code falls back to GPT-4o automatically.
- **Missing pages:** `/docs`, `/templates`, `/diagrams`, `/chat`, `/settings` still return 404.
- **No real user sessions:** Single dummy user is created on first import; no session management.

## Next Goals
- [ ] Markdown editor with live preview (split screen) for editing generated chapters
- [ ] PATCH endpoint for individual chapter content edits
- [ ] README generation feature
- [ ] PDF/DOCX export via Pandoc
- [ ] Template engine (IEEE, Harvard, university styles)
- [ ] Mermaid.js diagram generation
