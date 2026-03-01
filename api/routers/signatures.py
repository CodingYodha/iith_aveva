"""Signatures endpoint: golden signature metadata."""

import os
import sys

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/{cluster_name}")
def get_active_signature(cluster_name: str):
    """Get the current active golden signature for a cluster."""
    try:
        from src.signatures.signature_manager import get_active_signature as _get

        sig = _get(cluster_name)
        if sig is None:
            raise HTTPException(
                status_code=404,
                detail=f"No active signature for '{cluster_name}'",
            )

        return {
            "cluster_name": sig["cluster_name"],
            "version": sig["version"],
            "cpp_params": sig["cpp_params"],
            "predicted_cqas": sig["predicted_cqa"],
            "is_active": sig["is_active"],
            "created_at": sig["created_at"] or "",
            "source": sig["source"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/{cluster_name}/history")
def get_signature_history(cluster_name: str):
    """Get full version history for a cluster's golden signature."""
    try:
        from src.signatures.signature_manager import get_signature_history as _get_hist

        history = _get_hist(cluster_name)
        result = []
        for h in history:
            result.append({
                "cluster_name": h["cluster_name"],
                "version": h["version"],
                "cpp_params": h["cpp_params"],
                "predicted_cqas": h["predicted_cqa"],
                "is_active": h["is_active"],
                "created_at": h["created_at"] or "",
                "source": h["source"],
                "trigger_batch_id": h["trigger_batch_id"],
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
