"""Batch endpoints: drift check, batch completion."""

import os
import sys

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from fastapi import APIRouter, HTTPException, BackgroundTasks
from api.schemas import BatchStateInput, BatchCompleteInput, SimulationCompleteInput, SimulationBatchEmailInput

router = APIRouter()

# In-memory simulation state for HITL feature
SIMULATION_STATE = {
    "paused_for_hitl": False,
    "pending_batch": "T002"  # Just a mock indicator
}


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
def batch_complete(input_data: BatchCompleteInput, background_tasks: BackgroundTasks):
    """Mark a batch as complete: update signature if dominant, track carbon."""
    try:
        from src.signatures.signature_manager import check_and_update_signature
        from src.carbon.carbon_tracker import carbon_tracker
        from src.notifications.email import send_batch_summary_email

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

        carbon_summary_dict = {
            "total_co2e_kg": round(co2e, 2),
            "target_status": target_check,
            "current_targets": targets,
        }

        background_tasks.add_task(
            send_batch_summary_email,
            input_data.batch_id,
            input_data.cluster_name,
            sig_result,
            carbon_summary_dict
        )

        return {
            "signature_updated": sig_result.get("updated", False),
            "signature_detail": sig_result,
            "carbon_summary": carbon_summary_dict,
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/advance-simulation")
def advance_simulation():
    """Attempt to advance the simulation.
    If already paused, reject advancement (requires HITL decision).
    Otherwise, simulate step and pause for next iteration."""
    global SIMULATION_STATE
    
    if SIMULATION_STATE["paused_for_hitl"]:
        return {
            "status": "PAUSED",
            "message": "Simulation paused: Operator decision required before proceeding."
        }
    
    # Simulate an advancement logic here (e.g. queue next batch)
    # Then trigger a pause for HITL to kick in for the new phase
    SIMULATION_STATE["paused_for_hitl"] = True
    
    return {
        "status": "ADVANCED_AND_PAUSED",
        "message": "Simulation advanced successfully, but is now paused. A Causal recommendation requires HITL operator decision."
    }

@router.post("/simulation-complete")
def simulation_complete(input_data: SimulationCompleteInput, background_tasks: BackgroundTasks):
    from src.notifications.email import send_simulation_summary_email
    background_tasks.add_task(
        send_simulation_summary_email,
        input_data.total_batches,
        input_data.alarms,
        input_data.recipient_email
    )
    return {"status": "success", "message": "Simulation email dispatched"}


@router.post("/simulation-batch-email")
def simulation_batch_email(input_data: SimulationBatchEmailInput, background_tasks: BackgroundTasks):
    """Lightweight batchwise email notification from the Real-Time Simulation page."""
    from src.notifications.email import send_batch_summary_email
    # Build minimal sig_result and carbon_summary from the lightweight payload
    sig_result = {"updated": False, "reason": "Simulation mode — no signature update"}
    carbon_summary = {
        "total_co2e_kg": input_data.co2e,
        "target_status": input_data.alarm,
    }
    background_tasks.add_task(
        send_batch_summary_email,
        input_data.batch_id,
        input_data.cluster_name,
        sig_result,
        carbon_summary,
        input_data.recipient_email
    )
    return {"status": "success", "message": f"Batch {input_data.batch_id} email queued"}

