"""Carbon endpoint: emission targets and rolling averages."""

import os
import sys

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/targets")
def get_carbon_targets():
    """Get current carbon targets plus rolling average from historical batches."""
    try:
        from src.carbon.carbon_tracker import carbon_tracker

        targets = carbon_tracker.get_current_targets()

        # Rolling average from master dataset
        master_path = os.path.join(
            _PROJECT_ROOT, "data", "processed", "master_dataset.csv"
        )
        df = pd.read_csv(master_path)

        if "total_CO2e_kg" in df.columns:
            last_20 = df["total_CO2e_kg"].tail(20).tolist()
            rolling_avg = carbon_tracker.get_rolling_average(last_20, window=20)
        else:
            last_20 = []
            rolling_avg = 0.0

        return {
            **targets,
            "rolling_avg_20": round(rolling_avg, 2),
            "recent_co2e_values": [round(v, 2) for v in last_20],
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
