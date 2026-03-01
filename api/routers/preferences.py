"""Preferences endpoint: operator preference summary."""

import os
import sys

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/summary")
def get_preference_summary():
    """Get summary of operator preference model state."""
    try:
        from src.hitl.preference_model import preference_model
        from src.hitl.decision_store import get_preference_training_data

        training_pairs = get_preference_training_data()

        # Compute preference stats
        quality_chosen = 0
        carbon_chosen = 0
        for preferred, rejected in training_pairs:
            if preferred.get("pathway_name") == "Yield Guard":
                quality_chosen += 1
            elif preferred.get("pathway_name") == "Carbon Savior":
                carbon_chosen += 1

        total = len(training_pairs)
        model_fitted = preference_model.model is not None

        return {
            "total_decisions": total,
            "quality_preferred_count": quality_chosen,
            "carbon_preferred_count": carbon_chosen,
            "quality_preference_pct": round(
                quality_chosen / total * 100, 1
            ) if total > 0 else 0.0,
            "model_fitted": model_fitted,
            "datapoints_count": len(preference_model.datapoints),
            "comparisons_count": len(preference_model.comparisons),
            "status": "active" if model_fitted else "cold_start",
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
