"""Decisions endpoint: log operator choices."""

import os
import sys

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from fastapi import APIRouter, HTTPException
from api.schemas import OperatorDecisionInput

router = APIRouter()


@router.post("/")
def log_operator_decision(input_data: OperatorDecisionInput):
    """Log an operator's pathway choice and update preference model."""
    try:
        from src.hitl.decision_store import log_decision
        from src.hitl.preference_model import preference_model

        # Log to database
        decision_id = log_decision(
            batch_id=input_data.batch_id,
            pathway_a=input_data.pathway_a,
            pathway_b=input_data.pathway_b,
            chosen=input_data.chosen,
            modified=input_data.modified_params,
            reason=input_data.reason,
            target_config=input_data.target_config,
        )

        # Update preference model if A or B was chosen
        if input_data.chosen in ("A", "B"):
            if input_data.chosen == "A":
                preference_model.add_comparison(
                    input_data.pathway_a, input_data.pathway_b
                )
            else:
                preference_model.add_comparison(
                    input_data.pathway_b, input_data.pathway_a
                )

            # Refit if enough data
            if len(preference_model.comparisons) >= 3:
                preference_model.fit()
                preference_model.save_state()

        return {
            "decision_id": decision_id,
            "chosen": input_data.chosen,
            "preference_model_updated": input_data.chosen in ("A", "B"),
            "total_comparisons": len(preference_model.comparisons),
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/history")
def get_history(limit: int = 50):
    """Get recent operator decision history."""
    try:
        from src.hitl.decision_store import get_decision_history
        return get_decision_history(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
