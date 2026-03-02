"""CB-MOPA FastAPI application — main entry point."""

import os
import sys

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
# Also ensure the project root itself for constraints etc.
_PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="CB-MOPA API",
    version="1.0",
    description="Causal-Bayesian Multi-Objective Process Analytics",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.routers import batch, recommendations, decisions, signatures, carbon, preferences, data

app.include_router(batch.router, prefix="/api/batch", tags=["batch"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])
app.include_router(decisions.router, prefix="/api/decisions", tags=["decisions"])
app.include_router(signatures.router, prefix="/api/signatures", tags=["signatures"])
app.include_router(carbon.router, prefix="/api/carbon", tags=["carbon"])
app.include_router(preferences.router, prefix="/api/preferences", tags=["preferences"])
app.include_router(data.router, prefix="/api/data", tags=["data"])

# Serve web frontend static files (must be after API routes)
_web_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "web", "dist")
if os.path.isdir(_web_dist):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=_web_dist, html=True), name="web")


@app.get("/health")
def health_check():
    try:
        from src.signatures.database import engine
        with engine.connect():
            db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok", "db_connected": db_ok, "version": "1.0"}


@app.get("/")
def root():
    return {"message": "CB-MOPA API running. Visit /docs for Swagger UI."}
