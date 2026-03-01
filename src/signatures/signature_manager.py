"""
signature_manager.py — Continuous learning mechanism for golden signatures.
Auto-updates signatures when a new batch outperforms the current golden,
and logs full audit trail in the SQLite database.
"""

import json
import os
import sys
from datetime import datetime

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from src.signatures.database import (
    GoldenSignature,
    SignatureUpdate,
    get_session,
    init_db,
)


def dominates(a: dict, b: dict) -> bool:
    """
    Check if outcome dict `a` Pareto-dominates `b` on pharma objectives.

    Better means:
        - Higher: Hardness, Dissolution_Rate
        - Lower:  Friability, Disintegration_Time, total_CO2e_kg

    Returns True if `a` is strictly better on at least ONE objective
    and not worse on any.
    """
    # Direction: +1 = higher is better, -1 = lower is better
    objectives = {
        "Hardness": +1,
        "Dissolution_Rate": +1,
        "Friability": -1,
        "Disintegration_Time": -1,
        "total_CO2e_kg": -1,
    }

    strictly_better = False
    for obj, direction in objectives.items():
        if obj not in a or obj not in b:
            continue  # skip missing keys
        va = a[obj]
        vb = b[obj]
        if direction == +1:
            if va < vb:
                return False  # worse on this objective
            if va > vb:
                strictly_better = True
        else:  # direction == -1
            if va > vb:
                return False  # worse on this objective
            if va < vb:
                strictly_better = True

    return strictly_better


def check_and_update_signature(
    batch_id: str, actual_cqas: dict, cluster_name: str
) -> dict:
    """
    Check if a new batch's CQAs dominate the current golden signature.
    If so, update the signature and log the change.

    Returns
    -------
    dict
        {"updated": bool, ...} with details.
    """
    with get_session() as session:
        # Get current active signature for this cluster
        current = (
            session.query(GoldenSignature)
            .filter_by(cluster_name=cluster_name, is_active=True)
            .first()
        )

        if current is None:
            return {"updated": False, "reason": "No active signature found"}

        # Parse reference CQAs
        try:
            reference_cqas = json.loads(current.predicted_cqa_json)
            if not reference_cqas:
                # Fall back to actual_cqa_json if predicted is empty
                if current.actual_cqa_json:
                    reference_cqas = json.loads(current.actual_cqa_json)
        except (json.JSONDecodeError, TypeError):
            reference_cqas = {}

        # Check overlap
        if not actual_cqas or not reference_cqas:
            return {"updated": False, "reason": "Insufficient CQA data"}

        overlap = set(actual_cqas.keys()) & set(reference_cqas.keys())
        if len(overlap) == 0:
            return {"updated": False, "reason": "Insufficient CQA data"}

        # Dominance check
        if not dominates(actual_cqas, reference_cqas):
            return {
                "updated": False,
                "reason": "New batch does not dominate current signature",
            }

        # --- New batch dominates: update signature ---
        old_version = current.version
        new_version = old_version + 1

        # Deactivate old signature
        current.is_active = False

        # Create new signature
        new_sig = GoldenSignature(
            cluster_name=cluster_name,
            version=new_version,
            parent_id=current.id,
            source="updated",
            trigger_batch_id=batch_id,
            cpp_params_json=current.cpp_params_json,  # inherit CPP recipe
            predicted_cqa_json=current.predicted_cqa_json,
            actual_cqa_json=json.dumps(actual_cqas),
            is_active=True,
        )
        session.add(new_sig)

        # Log the update
        update_log = SignatureUpdate(
            signature_id=current.id,
            trigger_batch_id=batch_id,
            delta_json=json.dumps({"before": reference_cqas, "after": actual_cqas}),
            reason="New batch dominates on all objectives",
        )
        session.add(update_log)

        session.commit()

        print(
            f"  ✓ Signature updated for {cluster_name}: "
            f"batch {batch_id} is new golden (v{new_version})"
        )

        return {
            "updated": True,
            "old_version": old_version,
            "new_version": new_version,
            "cluster_name": cluster_name,
        }


def get_signature_history(cluster_name: str) -> list:
    """
    Get full version history for a cluster's golden signature.

    Returns
    -------
    list[dict]
        Ordered by version.
    """
    with get_session() as session:
        rows = (
            session.query(GoldenSignature)
            .filter_by(cluster_name=cluster_name)
            .order_by(GoldenSignature.version)
            .all()
        )

        history = []
        for r in rows:
            history.append({
                "id": r.id,
                "cluster_name": r.cluster_name,
                "version": r.version,
                "source": r.source,
                "is_active": r.is_active,
                "created_at": str(r.created_at) if r.created_at else None,
                "trigger_batch_id": r.trigger_batch_id,
                "cpp_params": json.loads(r.cpp_params_json) if r.cpp_params_json else {},
                "predicted_cqa": json.loads(r.predicted_cqa_json) if r.predicted_cqa_json else {},
                "actual_cqa": json.loads(r.actual_cqa_json) if r.actual_cqa_json else {},
            })

        return history


def get_active_signature(cluster_name: str) -> dict | None:
    """
    Return the single active signature for a cluster, or None.
    """
    with get_session() as session:
        row = (
            session.query(GoldenSignature)
            .filter_by(cluster_name=cluster_name, is_active=True)
            .first()
        )
        if row is None:
            return None

        return {
            "id": row.id,
            "cluster_name": row.cluster_name,
            "version": row.version,
            "source": row.source,
            "is_active": row.is_active,
            "created_at": str(row.created_at) if row.created_at else None,
            "trigger_batch_id": row.trigger_batch_id,
            "cpp_params": json.loads(row.cpp_params_json) if row.cpp_params_json else {},
            "predicted_cqa": json.loads(row.predicted_cqa_json) if row.predicted_cqa_json else {},
            "actual_cqa": json.loads(row.actual_cqa_json) if row.actual_cqa_json else {},
        }


if __name__ == "__main__":
    init_db()

    print(f"{'='*60}")
    print(f"  Signature Manager — Self-Update Test")
    print(f"{'='*60}")

    cluster = "Max Quality Golden"

    # Show current active signature
    active = get_active_signature(cluster)
    print(f"\n  Current active: v{active['version']}, source={active['source']}")

    # First, seed with some baseline CQAs so dominance can be checked
    # Update the current signature with baseline predicted CQAs
    with get_session() as session:
        sig = (
            session.query(GoldenSignature)
            .filter_by(cluster_name=cluster, is_active=True)
            .first()
        )
        if sig and sig.predicted_cqa_json == "{}":
            baseline = {
                "Hardness": 90.0,
                "Friability": 0.70,
                "Disintegration_Time": 8.0,
                "Dissolution_Rate": 88.0,
                "Content_Uniformity": 98.0,
                "total_CO2e_kg": 60.0,
            }
            sig.predicted_cqa_json = json.dumps(baseline)
            session.commit()
            print(f"  Seeded baseline CQAs for testing")

    # Simulate a batch that dominates the baseline
    outstanding = {
        "Hardness": 100.0,       # higher → better
        "Friability": 0.50,      # lower → better
        "Disintegration_Time": 6.0,  # lower → better
        "Dissolution_Rate": 93.0,    # higher → better
        "Content_Uniformity": 99.0,
        "total_CO2e_kg": 50.0,       # lower → better
    }

    print(f"\n  Simulating outstanding batch 'T_SIM_001'...")
    result = check_and_update_signature("T_SIM_001", outstanding, cluster)
    print(f"  Result: {result}")

    # Check history
    print(f"\n  Signature history for {cluster}:")
    history = get_signature_history(cluster)
    for h in history:
        print(f"    v{h['version']} | source={h['source']:10s} | "
              f"active={h['is_active']} | trigger={h['trigger_batch_id']}")

    # Try again with non-dominating batch
    weak = {
        "Hardness": 80.0,
        "Friability": 0.80,
        "Disintegration_Time": 10.0,
        "Dissolution_Rate": 85.0,
        "total_CO2e_kg": 70.0,
    }
    print(f"\n  Simulating weak batch 'T_SIM_002'...")
    result2 = check_and_update_signature("T_SIM_002", weak, cluster)
    print(f"  Result: {result2}")

    print(f"\n{'='*60}")
