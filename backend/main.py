from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.repos import router as api_router

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


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
