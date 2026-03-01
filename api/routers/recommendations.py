"""Recommendations endpoint: causal intervention recommendations."""

import os
import sys

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/{batch_id}/{cluster_name}")
def get_recommendations(batch_id: str, cluster_name: str):
    """
    Get dual-pathway causal recommendations for a batch,
    ranked by learned operator preference.
    """
    try:
        from constraints import CPP_COLS, CQA_COLS
        from src.causal.interventions import get_causal_recommendations
        from src.hitl.preference_model import preference_model

        # Load batch state from master dataset
        master_path = os.path.join(_PROJECT_ROOT, "data", "processed", "master_dataset.csv")
        df = pd.read_csv(master_path)
        row = df[df["Batch_ID"] == batch_id]
        if len(row) == 0:
            raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

        batch_state = row.iloc[0].to_dict()

        # Get causal recommendations
        recs = get_causal_recommendations(batch_state, cluster_name)

        if not recs:
            return {
                "batch_id": batch_id,
                "cluster_name": cluster_name,
                "pathway_a": None,
                "pathway_b": None,
                "message": "No safe recommendations found",
            }

        # Score by preference model
        for rec in recs:
            rec["preference_utility"] = round(
                preference_model.predict_utility(rec), 4
            )

        # Sort by utility: highest first
        recs.sort(key=lambda x: x.get("preference_utility", 0), reverse=True)

        # Build response cards
        def build_card(rec):
            return {
                "pathway_name": rec.get("pathway_name", ""),
                "param_changes": [{
                    "param": rec["param"],
                    "old_value": rec["old_value"],
                    "new_value": rec["new_value"],
                    "delta_pct": rec["delta_pct"],
                }],
                "expected_cqa_delta": rec.get("causal_effects", {}),
                "expected_co2_change": rec.get("expected_co2_change", 0.0),
                "safety_check": rec.get("safety_check", "UNKNOWN"),
                "causal_confidence": 0.8,
                "preference_utility": rec.get("preference_utility", 0.5),
            }

        pathway_a = build_card(recs[0]) if len(recs) > 0 else None
        pathway_b = build_card(recs[1]) if len(recs) > 1 else None

        return {
            "batch_id": batch_id,
            "cluster_name": cluster_name,
            "pathway_a": pathway_a,
            "pathway_b": pathway_b,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
