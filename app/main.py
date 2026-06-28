from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, files, analysis, health

app = FastAPI(
    title="Data Analytics API",
    description="CSV data analytics platform — upload, analyze, visualize.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(files.router)
app.include_router(analysis.router)


@app.get("/")
def root():
    return {"message": "Data Analytics API is running", "docs": "/docs"}
