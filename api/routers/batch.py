"""Batch endpoints: drift check, batch completion."""

import os
import sys

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from fastapi import APIRouter, HTTPException
from api.schemas import BatchStateInput, BatchCompleteInput

router = APIRouter()


@router.post("/drift-check")
def drift_check(input_data: BatchStateInput):
    """Check how far a batch drifts from the golden envelope."""
    try:
        from src.signatures.comparator import compare_batch_to_golden

        report = compare_batch_to_golden(input_data.batch_id, input_data.cluster_name)

        # Flatten phase_reports for response
        drift_results = []
        for phase, sensors in report["phase_reports"].items():
            for sensor, res in sensors.items():
                drift_results.append({
                    "batch_id": input_data.batch_id,
                    "cluster_name": input_data.cluster_name,
                    "phase": phase,
                    "sensor": sensor,
                    "alarm_level": res["alarm_level"],
                    "drift_score": round(res["drift_score"], 4),
                    "percent_outside": round(res["percent_outside"], 2),
                })

        return {
            "batch_id": report["batch_id"],
            "cluster_name": report["cluster_name"],
            "overall_alarm": report["overall_alarm"],
            "drift_details": drift_results,
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/complete")
def batch_complete(input_data: BatchCompleteInput):
    """Mark a batch as complete: update signature if dominant, track carbon."""
    try:
        from src.signatures.signature_manager import check_and_update_signature
        from src.carbon.carbon_tracker import carbon_tracker

        # Check signature update
        sig_result = check_and_update_signature(
            input_data.batch_id,
            input_data.actual_cqas,
            input_data.cluster_name,
        )

        # Carbon summary
        total_energy = input_data.actual_cqas.get("total_energy_kWh", 0.0)
        co2e = carbon_tracker.compute_batch_carbon(total_energy)
        targets = carbon_tracker.get_current_targets()
        target_check = carbon_tracker.check_against_target(
            co2e, targets["current_target_kg"]
        )

        return {
            "signature_updated": sig_result.get("updated", False),
            "signature_detail": sig_result,
            "carbon_summary": {
                "total_co2e_kg": round(co2e, 2),
                "target_status": target_check,
                "current_targets": targets,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
