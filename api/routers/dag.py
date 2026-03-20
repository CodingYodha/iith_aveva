"""DAG Editor API endpoints — CRUD for user-defined causal DAGs."""

import os
import sys
import io
import csv

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class EdgeInput(BaseModel):
    cause: str
    effect: str


class SetDAGInput(BaseModel):
    edges: list[dict]


# ---------------------------------------------------------------
# GET /active — return current active DAG
# ---------------------------------------------------------------
@router.get("/active")
def get_active():
    from src.causal.dag_definition import get_active_dag
    dag, source = get_active_dag()
    edges = [{"cause": u, "effect": v} for u, v in dag.edges()]
    return {"edges": edges, "source": source, "num_nodes": dag.number_of_nodes(), "num_edges": dag.number_of_edges()}


# ---------------------------------------------------------------
# POST /set — validate + save a custom DAG from JSON edges
# ---------------------------------------------------------------
@router.post("/set")
def set_dag(input_data: SetDAGInput):
    from src.causal.dag_definition import load_custom_dag, save_custom_dag
    try:
        dag = load_custom_dag(input_data.edges)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    save_custom_dag(input_data.edges)
    return {
        "status": "success",
        "message": f"Custom DAG saved ({dag.number_of_nodes()} nodes, {dag.number_of_edges()} edges).",
        "num_nodes": dag.number_of_nodes(),
        "num_edges": dag.number_of_edges(),
    }


# ---------------------------------------------------------------
# POST /upload-csv — accept a CSV edge list
# ---------------------------------------------------------------
@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    from src.causal.dag_definition import load_custom_dag, save_custom_dag

    content = await file.read()
    text = content.decode("utf-8")

    reader = csv.DictReader(io.StringIO(text))
    if "cause" not in (reader.fieldnames or []) or "effect" not in (reader.fieldnames or []):
        raise HTTPException(status_code=422, detail="CSV must have 'cause' and 'effect' columns.")

    edges = [{"cause": row["cause"].strip(), "effect": row["effect"].strip()} for row in reader]

    try:
        dag = load_custom_dag(edges)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    save_custom_dag(edges)
    return {
        "status": "success",
        "message": f"Custom DAG saved from CSV ({dag.number_of_nodes()} nodes, {dag.number_of_edges()} edges).",
    }


# ---------------------------------------------------------------
# DELETE /reset — revert to hardcoded default
# ---------------------------------------------------------------
@router.delete("/reset")
def reset_dag():
    from src.causal.dag_definition import reset_to_default_dag
    dag = reset_to_default_dag()
    edges = [{"cause": u, "effect": v} for u, v in dag.edges()]
    return {"status": "success", "message": "Reverted to default hardcoded DAG.", "edges": edges, "source": "default"}


# ---------------------------------------------------------------
# GET /valid-nodes — return allowed node names
# ---------------------------------------------------------------
@router.get("/valid-nodes")
def valid_nodes():
    from src.causal.dag_definition import get_valid_nodes
    nodes = sorted(get_valid_nodes())
    return {"nodes": nodes, "count": len(nodes)}


# ---------------------------------------------------------------
# POST /refit-models — trigger background model refitting
# ---------------------------------------------------------------
@router.post("/refit-models")
def refit_models(background_tasks: BackgroundTasks):
    from src.causal.causal_model import fit_all_causal_models
    background_tasks.add_task(fit_all_causal_models)
    return {"status": "success", "message": "Causal model refitting started in background. Check server logs for progress."}
