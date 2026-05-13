# Implementation Plan: ThesisForge

ThesisForge is an AI-powered documentation platform designed to bridge the gap between source code and high-quality technical/academic documentation. It automates the extraction of architectural insights and project context to generate structured, template-compliant reports and manuals.

---

## 1. Project Vision

### Core Problem
Software documentation is often an afterthought, leading to "documentation rot" where the written record diverges from the actual implementation. In academic contexts, students and researchers spend disproportionate time formatting documents and manually describing architecture rather than focusing on core innovation.

### Target Users
*   **CS/Engineering Students:** Automating final year project reports (Thesis/Capstone).
*   **Technical Writers:** Rapidly bootstrapping API and system documentation.
*   **Software Architects:** Visualizing and documenting complex legacy repositories.

### Product Differentiation
Unlike generic LLM wrappers, ThesisForge performs **deep repository understanding** using AST (Abstract Syntax Tree) parsing and hierarchical RAG. It doesn't just "summarize"; it reconstructs the project's logical graph to ensure technical accuracy and template compliance.

### Why It Matters
By treating documentation as a derivative of code, ThesisForge ensures consistency, reduces manual labor, and enables developers to maintain a "living" record of their work that satisfies both industrial and academic standards.

---

## 2. System Architecture

### High-Level Components
*   **Frontend (Next.js/React):** A workspace for repo management, live document editing, and template selection.
*   **Backend (FastAPI/NestJS):** Orchestrates the parsing, analysis, and generation workflows.
*   **AI Layer (LangChain/LlamaIndex):** Handles embeddings, vector search, and LLM reasoning.
*   **Parsing Service (Tree-sitter):** Performs static analysis to extract symbols, dependencies, and structure.
*   **Export Engine (Pandoc/python-docx):** Converts internal markdown representations into polished DOCX/PDF/LaTeX formats.

### Data Flow
1.  **Ingestion:** User connects GitHub URL $\rightarrow$ Backend triggers GitHub Parser.
2.  **Analysis:** Parser extracts AST $\rightarrow$ AI Service chunks code based on logic (not just character count) $\rightarrow$ Embeddings stored in Vector DB.
3.  **Synthesis:** User selects "Academic Report" $\rightarrow$ Documentation Generator queries Vector DB using RAG $\rightarrow$ LLM generates structured sections based on template constraints.
4.  **Refinement:** User edits in UI $\rightarrow$ Feedback loop updates document state.
5.  **Export:** Internal document $\rightarrow$ Pandoc $\rightarrow$ Template-formatted DOCX.

---

## 3. Development Phases

### Phase 1: Repository Parsing & Understanding MVP
**Goal:** Successfully ingest a repository and create a searchable vector representation of its architecture.

*   **Features:**
    *   GitHub OAuth & Repository selector.
    *   Tree-sitter integration for Python, JS/TS, and Java.
    *   Basic RAG pipeline (Indexing -> Retrieval).
*   **Folder Structure:**
    ```text
    /services/parser
    ├── core/           # Tree-sitter grammars
    ├── analyzers/      # Logic for extraction
    └── worker.py       # Background task runner
    /services/ai
    ├── embedding.py
    └── vector_store.py
    ```
*   **Backend Tasks:** Implement Celery/Redis for long-running parse tasks; GitHub API integration; Token usage tracking.
*   **Frontend Tasks:** Repository list view; Import progress dashboard; OAuth flow implementation.
*   **AI Tasks:** Implement **Semantic Chunking** using AST; Embedding generation with `text-embedding-3-small`.
*   **Database Schema:** 
    *   `users`: auth info.
    *   `repositories`: `id, github_id, name, owner, status, last_indexed`.
    *   `files`: `id, repo_id, path, hash, content_summary`.
*   **API Endpoints:** 
    *   `POST /api/v1/repos/import`
    *   `GET /api/v1/repos/:id/status`
    *   `GET /api/v1/repos/:id/tree`
*   **Third-Party Services:** GitHub API, OpenAI (Embeddings), Supabase/Pinecone.
*   **Recommended Tech Stack:** FastAPI, Next.js, PostgreSQL (pgvector), Redis.
*   **Security & Performance:** OAuth token encryption at rest; Rate limiting for GitHub API.
*   **Milestones:** Successful indexing of a 100-file repository in <30 seconds.
*   **Testing Strategy:** Unit tests for Tree-sitter parsers; Mocking GitHub API for ingestion tests.

### Phase 2: Structured Documentation Generation
**Goal:** Generate a multi-chapter technical manual based on the parsed repo.

*   **Features:**
    *   Auto-generated Table of Contents.
    *   "Architecture Overview" and "Component Description" chapters.
    *   LLM-assisted README generation.
*   **Folder Structure:**
    ```text
    /services/generator
    ├── templates/      # Markdown templates
    ├── orchestrator.py # AI generation logic
    └── doc_writer.py   # State management
    ```
*   **Backend Tasks:** Document state management; Markdown-to-HTML rendering for preview; Persistence of generated docs.
*   **Frontend Tasks:** Markdown editor with live preview (split screen); "Generate Section" buttons.
*   **AI Tasks:** **Chain-of-Thought Prompting** for coherent chapter transitions; Context injection for RAG queries.
*   **Database Schema:**
    *   `documents`: `id, repo_id, title, content (JSON/MD), metadata`.
    *   `chapters`: `id, doc_id, title, order, ai_prompt_context`.
*   **API Endpoints:**
    *   `POST /api/v1/docs/generate`
    *   `PATCH /api/v1/docs/:id/chapters/:cid`
    *   `GET /api/v1/docs/:id/preview`
*   **Third-Party Services:** OpenAI (GPT-4o), Vercel (Frontend hosting).
*   **Recommended Tech Stack:** LangChain, Tiptap (for editor), React Markdown.
*   **Security & Performance:** Prompt injection sanitization; Streaming LLM responses for better UX.
*   **Milestones:** A generated 10-page technical manual for a medium-sized project.
*   **Testing Strategy:** Snapshot testing for generated markdown; "Golden dataset" evaluation for RAG accuracy.

### Phase 3: Academic Template Engine
**Goal:** Apply institutional formatting (Headers, Footers, Citations, TOC) to generated docs.

*   **Features:**
    *   Template library (IEEE, Harvard, specific University styles).
    *   DOCX/PDF Export via Pandoc.
    *   Institutional requirement validation.
*   **Folder Structure:**
    ```text
    /services/exporter
    ├── pandoc/         # Pandoc filters and lua scripts
    ├── templates/      # .docx reference files
    └── validator.py    # Requirement checking logic
    ```
*   **Backend Tasks:** Integration with `python-docx` for fine-grained XML manipulation; Pandoc wrapper service.
*   **Frontend Tasks:** Template browser; Style configurator (fonts, margins); Export progress modal.
*   **AI Tasks:** Template-aware generation (ensuring LLM output fits specific section requirements).
*   **Database Schema:**
    *   `templates`: `id, name, organization, config_json, file_path`.
*   **API Endpoints:**
    *   `GET /api/v1/templates`
    *   `POST /api/v1/docs/:id/export`
    *   `GET /api/v1/docs/:id/export/:export_id/download`
*   **Third-Party Services:** AWS S3 (storing generated exports).
*   **Recommended Tech Stack:** Pandoc, python-docx, PyPDF2.
*   **Security & Performance:** Sanitizing user-provided template files; Background export processing.
*   **Milestones:** Exporting a "Final Year Report" that passes a university style check.
*   **Testing Strategy:** Visual regression testing for PDF exports; Validation of DOCX metadata.

### Phase 4: Advanced Repository Intelligence & Diagrams
**Goal:** Extract visual architecture and provide deep code-reasoning.

*   **Features:**
    *   Mermaid.js diagram generation (Class diagrams, Sequence diagrams).
    *   Dependency graph visualization.
    *   AI Chat with "Repo Knowledge" (RAG-based).
*   **Folder Structure:**
    ```text
    /services/analyzer
    ├── graph/          # Dependency graph logic
    ├── mermaid/        # Mermaid syntax generators
    └── chat.py         # Conversational RAG
    ```
*   **Backend Tasks:** Extracting import relationships to build a project graph; Mermaid code serialization.
*   **Frontend Tasks:** Interactive graph visualization (D3.js or React Flow); Chat sidebar.
*   **AI Tasks:** **Graph-RAG** implementation to handle multi-hop queries; Code-to-Mermaid translation.
*   **Database Schema:**
    *   `dependencies`: `id, repo_id, source_file_id, target_file_id, type`.
    *   `chat_history`: `id, user_id, repo_id, messages (JSONB)`.
*   **API Endpoints:**
    *   `GET /api/v1/repos/:id/graph`
    *   `POST /api/v1/repos/:id/chat`
    *   `GET /api/v1/repos/:id/diagrams`
*   **Third-Party Services:** Neo4j (optional for complex graphs), Mermaid CLI.
*   **Recommended Tech Stack:** D3.js, LlamaIndex (for GraphRAG), React Flow.
*   **Security & Performance:** Query depth limiting for graph analysis; Caching expensive graph computations.
*   **Milestones:** Automatic generation of a system architecture diagram that accurately reflects the code.
*   **Testing Strategy:** Validating Mermaid syntax correctness; Evaluating chat response relevance.

### Phase 5: Collaboration & Scaling
**Goal:** Multi-user support, institutional dashboards, and performance optimization.

*   **Features:**
    *   Shared projects for student groups.
    *   Supervisor review/commenting mode.
    *   Advanced caching for large-scale repo parsing.
*   **Folder Structure:**
    ```text
    /services/org
    ├── roles/          # RBAC logic
    ├── billing/        # Stripe integration
    └── dashboard/      # Analytics logic
    ```
*   **Backend Tasks:** RBAC (Role-Based Access Control) implementation; Organization management logic.
*   **Frontend Tasks:** Admin dashboard for supervisors; Team management UI; Commenting system.
*   **AI Tasks:** Document-wide consistency checks; Multi-document RAG (comparing multiple repos).
*   **Database Schema:**
    *   `organizations`: `id, name, slug`.
    *   `memberships`: `id, org_id, user_id, role`.
    *   `comments`: `id, doc_id, user_id, text, position_data`.
*   **API Endpoints:**
    *   `POST /api/v1/orgs`
    *   `POST /api/v1/docs/:id/comments`
    *   `GET /api/v1/admin/stats`
*   **Third-Party Services:** Stripe (Billing), Posthog (Analytics).
*   **Recommended Tech Stack:** Casbin (for RBAC), Stripe API, Redis Cluster.
*   **Security & Performance:** Multi-tenancy isolation; Horizontal scaling of worker nodes.
*   **Milestones:** Support for repositories >1M LOC with sub-minute indexing.
*   **Testing Strategy:** Load testing with JMeter; Security penetration testing for RBAC.

---

## 4. Technical Deep Dive

### Repository Parsing (The "Under-the-Hood")
We avoid simple regex. Instead:
1.  **Language Detection:** Use `pygments` or `enry` to identify file types.
2.  **AST Extraction:** Use Tree-sitter to build a concrete syntax tree.
3.  **Symbol Indexing:** Map functions, classes, and variables to their locations.
4.  **Reference Tracking:** Identify where symbols are called to build a call graph.

### Chunking & RAG Strategy
Standard 500-token chunks break code logic. ThesisForge uses **Hierarchical Chunking**:
*   **Level 1 (Module):** High-level purpose of the file.
*   **Level 2 (Class/Struct):** Purpose of the object and its state.
*   **Level 3 (Method/Function):** Specific logic and I/O.
Each chunk includes its parent context (e.g., a function chunk includes the class name it belongs to).

### DOCX Formatting System
Pandoc is powerful but lacks fine control over "Professional Academic" styles. We use a hybrid approach:
1.  Generate Markdown via LLM.
2.  Convert to DOCX using Pandoc with a reference document (`reference.docx`).
3.  Post-process the DOCX using `python-docx` to inject institution-specific metadata (Student ID, Supervisor Name) into headers/footers.

---

## 5. Security & Performance

*   **Security:**
    *   **Ephemeral Parsing:** Code is processed and converted to vectors; raw code is not stored long-term unless requested.
    *   **Secrets Detection:** Pre-scan repos for API keys/secrets and mask them before sending to LLMs.
*   **Performance:**
    *   **Delta Parsing:** Only re-parse files that have changed since the last commit.
    *   **Vector Caching:** Cache embeddings for common libraries/frameworks.

---

## 6. Testing Strategy

*   **Unit Tests:** Parser accuracy (verify AST extraction for edge cases).
*   **Integration Tests:** RAG retrieval precision (Top-k accuracy).
*   **E2E Tests:** Full flow from GitHub Import to DOCX Export.
*   **User Acceptance (UAT):** Real students testing against their thesis requirements.
