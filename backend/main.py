from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from api.repos import router as api_router
from api.dashboard import router as dashboard_router
from api.auth import router as auth_router
from api.templates import router as templates_router
from api.exports import router as exports_router
from api.diagrams import router as diagrams_router
from api.chat import router as chat_router

app = FastAPI(
    title="ThesisForge API",
    version="0.1.0",
    description="AI-powered documentation platform backend",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(dashboard_router)
app.include_router(auth_router)
app.include_router(templates_router)
app.include_router(exports_router)
app.include_router(diagrams_router)
app.include_router(chat_router)


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}


# GitHub OAuth callback — matches the registered callback URL without /api/v1 prefix
@app.get("/auth/github/callback")
async def github_callback_redirect(code: str = Query(...)):
    return RedirectResponse(url=f"/api/v1/auth/github/callback?code={code}")
