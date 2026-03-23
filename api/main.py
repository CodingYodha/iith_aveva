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

from api.routers import batch, recommendations, decisions, signatures, carbon, preferences, data, dag, agents

app.include_router(batch.router, prefix="/api/batch", tags=["batch"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])
app.include_router(decisions.router, prefix="/api/decisions", tags=["decisions"])
app.include_router(signatures.router, prefix="/api/signatures", tags=["signatures"])
app.include_router(carbon.router, prefix="/api/carbon", tags=["carbon"])
app.include_router(preferences.router, prefix="/api/preferences", tags=["preferences"])
app.include_router(data.router, prefix="/api/data", tags=["data"])
app.include_router(dag.router, prefix="/api/dag", tags=["dag"])
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])


@app.get("/health")
def health_check():
    try:
        from src.signatures.database import engine
        with engine.connect():
            db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok", "db_connected": db_ok, "version": "1.0"}


# Serve web frontend static files (must be LAST — after all API routes)
_web_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "web", "dist")
if os.path.isdir(_web_dist):
    from fastapi.staticfiles import StaticFiles
    from starlette.middleware import Middleware
    from starlette.responses import Response

    @app.middleware("http")
    async def no_cache_html(request, call_next):
        response = await call_next(request)
        if request.url.path == "/" or request.url.path.endswith(".html"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        return response

    app.mount("/", StaticFiles(directory=_web_dist, html=True), name="web")

