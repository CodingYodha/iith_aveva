"""Data endpoints: serve processed data files as JSON for the web frontend."""

import json
import os
import sys

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/centroids")
def get_centroids():
    """Return cluster centroids JSON."""
    path = os.path.join(_PROJECT_ROOT, "data", "golden", "cluster_centroids.json")
    try:
        with open(path) as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/envelopes")
def get_envelopes():
    """Return golden envelopes JSON."""
    path = os.path.join(_PROJECT_ROOT, "data", "golden", "golden_envelopes.json")
    try:
        with open(path) as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pareto")
def get_pareto():
    """Return Pareto front as JSON array."""
    path = os.path.join(_PROJECT_ROOT, "data", "golden", "pareto_front.csv")
    try:
        df = pd.read_csv(path)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/master-stats")
def get_master_stats():
    """Return CPP min/max/mean ranges, batch IDs, and sample CQA values."""
    path = os.path.join(_PROJECT_ROOT, "data", "processed", "master_dataset.csv")
    try:
        from constraints import CPP_COLS, CQA_COLS

        df = pd.read_csv(path)
        cpp_ranges = {}
        for col in CPP_COLS:
            if col in df.columns:
                cpp_ranges[col] = {
                    "min": float(df[col].min()),
                    "max": float(df[col].max()),
                    "mean": float(df[col].mean()),
                }
        batch_ids = df["Batch_ID"].tolist()

        # Per-batch CQA + CO2e data for quick lookup
        batch_data = {}
        for _, row in df.iterrows():
            bid = row["Batch_ID"]
            batch_data[bid] = {}
            for c in CQA_COLS:
                if c in row:
                    batch_data[bid][c] = round(float(row[c]), 4)
            if "total_CO2e_kg" in row:
                batch_data[bid]["total_CO2e_kg"] = round(float(row["total_CO2e_kg"]), 4)
            if "total_energy_kWh" in row:
                batch_data[bid]["total_energy_kWh"] = round(float(row["total_energy_kWh"]), 4)

        return {
            "cpp_ranges": cpp_ranges,
            "batch_ids": batch_ids,
            "batch_count": len(batch_ids),
            "batch_data": batch_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trajectory/{batch_id}")
def get_trajectory(batch_id: str):
    """Return trajectory data for a batch as JSON."""
    path = os.path.join(
        _PROJECT_ROOT, "data", "processed", "batch_trajectories", f"{batch_id}.csv"
    )
    try:
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail=f"No trajectory for {batch_id}")
        df = pd.read_csv(path)
        return df.to_dict(orient="records")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cluster-batch-map")
def get_cluster_batch_map():
    """Return cluster → batch ID mapping."""
    path = os.path.join(_PROJECT_ROOT, "data", "golden", "cluster_batch_map.json")
    try:
        with open(path) as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/constraints")
def get_constraints():
    """Return project constants for the frontend."""
    try:
        from constraints import (
            CPP_COLS, CQA_COLS, PHARMA_LIMITS,
            PHASE_SENSOR_MAP, CARBON_CONFIG, GOLDEN_CLUSTER_NAMES,
        )
        return {
            "CPP_COLS": CPP_COLS,
            "CQA_COLS": CQA_COLS,
            "PHARMA_LIMITS": PHARMA_LIMITS,
            "PHASE_SENSOR_MAP": PHASE_SENSOR_MAP,
            "CARBON_CONFIG": CARBON_CONFIG,
            "GOLDEN_CLUSTER_NAMES": GOLDEN_CLUSTER_NAMES,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
