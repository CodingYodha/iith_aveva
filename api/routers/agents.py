"""Agent endpoints: run agents, view pending actions, respond to proposals."""

import json
import os
import sys

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from constraints import CPP_COLS

router = APIRouter()

_MASTER_CSV = os.path.join(_PROJECT_ROOT, "data", "processed", "master_dataset.csv")


def _load_batch_context(batch_id: str) -> dict:
    """Load batch data from master dataset for agent processing."""
    df = pd.read_csv(_MASTER_CSV)
    row = df[df["Batch_ID"] == batch_id]
    if row.empty:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
    row = row.iloc[0]

    cpp_params = {col: float(row[col]) for col in CPP_COLS if col in row.index}

    # Collect all available CQA and energy columns for actual_cqas
    actual_cqas = {}
    for col in row.index:
        if col in CPP_COLS or col == "Batch_ID":
            continue
        try:
            actual_cqas[col] = float(row[col])
        except (ValueError, TypeError):
            pass

    return {
        "batch_id": batch_id,
        "cpp_params": cpp_params,
        "actual_cqas": actual_cqas,
        "cluster_name": "Balanced Operational Golden",
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/run/{batch_id}")
def run_agents(batch_id: str, cluster_name: str = "Balanced Operational Golden"):
    """Run all 3 agents on a batch."""
    try:
        from src.agents.orchestrator import orchestrator

        context = _load_batch_context(batch_id)
        context["cluster_name"] = cluster_name
        result = orchestrator.run_all(context)

        return {
            "batch_id": result.batch_id,
            "all_clear": result.all_clear,
            "timestamp": str(result.timestamp),
            "agent_results": [
                {
                    "agent_name": r.agent_name,
                    "explanation": r.explanation,
                    "requires_action": r.requires_action,
                    "action_type": r.action_type,
                    "confidence": r.confidence,
                    "analysis": r.analysis,
                }
                for r in result.agent_results
            ],
            "pending_count": len(result.pending_actions),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/pending")
def get_pending_actions():
    """Return all unresolved notifications requiring operator action."""
    try:
        from src.agents.notification_store import get_pending, get_pending_proposals

        notifications = get_pending()
        proposals = get_pending_proposals()

        return {
            "notifications": notifications,
            "proposals": proposals,
            "total_pending": len(notifications),
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


class RespondInput(BaseModel):
    action: str  # accept | modify | reject | acknowledged
    reason: str = ""
    modified_params: Optional[dict] = None


@router.post("/respond/{notification_id}")
def respond_to_notification(notification_id: int, input_data: RespondInput):
    """Operator responds to an agent notification."""
    try:
        from src.agents.notification_store import (
            resolve_notification,
            resolve_signature_proposal,
        )

        # Resolve the notification
        result = resolve_notification(
            notification_id, input_data.action, input_data.reason
        )
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])

        response = {"notification": result, "signature_updated": False}

        # If this is a signature proposal, handle the approval flow
        if result.get("action_type") == "approve_signature":
            proposal_result = resolve_signature_proposal(
                notification_id, input_data.action, input_data.reason
            )
            response["proposal"] = proposal_result

            if input_data.action == "accepted":
                # Actually update the signature now
                from src.signatures.signature_manager import check_and_update_signature

                analysis = result.get("analysis", {})
                batch_id = analysis.get("batch_id", "")
                cluster_name = analysis.get("cluster_name", "Balanced Operational Golden")
                actual_cqas = analysis.get("proposed_cqa", {})

                if actual_cqas and batch_id:
                    sig_result = check_and_update_signature(
                        batch_id, actual_cqas, cluster_name
                    )
                    response["signature_updated"] = sig_result.get("updated", False)
                    response["signature_detail"] = sig_result

            elif input_data.action == "modified" and input_data.modified_params:
                # Use operator's modified params for the update
                from src.signatures.signature_manager import check_and_update_signature

                analysis = result.get("analysis", {})
                batch_id = analysis.get("batch_id", "")
                cluster_name = analysis.get("cluster_name", "Balanced Operational Golden")

                # Merge modified params with proposed CQAs
                actual_cqas = analysis.get("proposed_cqa", {})
                actual_cqas.update(input_data.modified_params)

                if actual_cqas and batch_id:
                    sig_result = check_and_update_signature(
                        batch_id, actual_cqas, cluster_name
                    )
                    response["signature_updated"] = sig_result.get("updated", False)
                    response["signature_detail"] = sig_result

        # Log decision for preference learning
        if input_data.action in ("accepted", "rejected", "modified"):
            try:
                from src.hitl.decision_store import log_decision
                log_decision(
                    batch_id=result.get("batch_id", ""),
                    pathway_a=result.get("analysis", {}),
                    pathway_b={},
                    chosen=input_data.action.upper(),
                    modified=input_data.modified_params,
                    reason=input_data.reason,
                    target_config=result.get("analysis", {}).get("cluster_name", ""),
                )
            except Exception:
                pass  # non-critical

        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/history")
def get_agent_history(limit: int = 50):
    """Return history of all agent runs and operator responses."""
    try:
        from src.agents.notification_store import get_history
        return {"history": get_history(limit=limit)}
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/batch/{batch_id}")
def get_batch_agents(batch_id: str):
    """Return all agent results for a specific batch."""
    try:
        from src.agents.notification_store import get_by_batch
        return {"batch_id": batch_id, "results": get_by_batch(batch_id)}
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
