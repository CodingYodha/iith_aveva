"""
carbon_agent.py — Tracks batch-level CO2 emissions, checks regulatory compliance,
flags deviations, and generates plain-English alerts via OpenClaw.
"""

import os
import sys

import pandas as pd

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from src.agents.base_agent import BaseAgent
from src.carbon.carbon_tracker import carbon_tracker

_ROLE = (
    "You are a carbon emissions compliance officer for pharmaceutical manufacturing. "
    "Track batch-level CO2 against regulatory targets, identify trends, flag deviations. "
    "Be precise with numbers. Reference specific regulatory limits. "
    "Keep your response under 200 words."
)

# Simulated regulatory targets
_REGULATORY_TARGETS = {
    "EU_ETS_Pharma": {"limit_kg": 45.0, "label": "EU ETS Pharma"},
    "EPA_Standard": {"limit_kg": 50.0, "label": "EPA Standard"},
}

_MASTER_CSV = os.path.join(_PROJECT_ROOT, "data", "processed", "master_dataset.csv")


def _load_batch_co2_history() -> list[float]:
    """Load historical CO2e values from master dataset."""
    try:
        df = pd.read_csv(_MASTER_CSV)
        if "total_CO2e_kg" in df.columns:
            return df["total_CO2e_kg"].dropna().tolist()
    except Exception:
        pass
    return []


class CarbonAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="carbon", role=_ROLE)

    def analyze(self, context: dict) -> dict:
        batch_id = context.get("batch_id", "unknown")
        actual_cqas = context.get("actual_cqas", {})

        # Get batch CO2e — from actual_cqas or compute from energy
        batch_co2e = actual_cqas.get("total_CO2e_kg", 0.0)
        total_energy = actual_cqas.get("total_energy_kWh", 0.0)
        if batch_co2e == 0.0 and total_energy > 0:
            batch_co2e = carbon_tracker.compute_batch_carbon(total_energy)

        # Phase breakdown from actual_cqas if available
        phase_energy = {}
        for key, val in actual_cqas.items():
            if key.endswith("_energy_kWh") and key != "total_energy_kWh":
                phase = key.replace("_energy_kWh", "")
                phase_energy[phase] = val
        phase_co2 = carbon_tracker.compute_phase_carbon(phase_energy) if phase_energy else {}

        # Internal target
        targets = carbon_tracker.get_current_targets()
        internal_target = targets["current_target_kg"]
        internal_check = carbon_tracker.check_against_target(batch_co2e, internal_target)

        # Regulatory checks
        regulatory_compliance = {}
        any_over = False
        any_at_risk = False
        for key, reg in _REGULATORY_TARGETS.items():
            check = carbon_tracker.check_against_target(batch_co2e, reg["limit_kg"])
            regulatory_compliance[key] = {
                "label": reg["label"],
                "limit_kg": reg["limit_kg"],
                "status": check["status"],
                "pct_of_target": check["pct_of_target"],
                "headroom_kg": check["headroom_kg"],
            }
            if check["status"] == "OVER":
                any_over = True
            elif check["status"] == "AT_RISK":
                any_at_risk = True

        # Add internal target check
        regulatory_compliance["Internal"] = {
            "label": "Internal Dynamic Target",
            "limit_kg": internal_target,
            "status": internal_check["status"],
            "pct_of_target": internal_check["pct_of_target"],
            "headroom_kg": internal_check["headroom_kg"],
        }
        if internal_check["status"] == "OVER":
            any_over = True
        elif internal_check["status"] == "AT_RISK":
            any_at_risk = True

        # Trend analysis
        history = _load_batch_co2_history()
        rolling_avg = carbon_tracker.get_rolling_average(history, window=5)

        # Trend direction
        trend = "stable"
        if len(history) >= 10:
            recent_5 = sum(history[-5:]) / 5
            prev_5 = sum(history[-10:-5]) / 5
            if recent_5 > prev_5 * 1.05:
                trend = "worsening"
            elif recent_5 < prev_5 * 0.95:
                trend = "improving"

        return {
            "batch_id": batch_id,
            "batch_co2e_kg": round(batch_co2e, 2),
            "phase_breakdown": {k: round(v, 2) for k, v in phase_co2.items()},
            "regulatory_compliance": regulatory_compliance,
            "rolling_avg_5": round(rolling_avg, 2),
            "trend": trend,
            "any_over": any_over,
            "any_at_risk": any_at_risk,
            "co2_history_last10": [round(v, 2) for v in history[-10:]],
        }

    def format_prompt(self, analysis: dict) -> str:
        lines = [
            f"Batch {analysis['batch_id']} carbon report:",
            f"- Total CO2e: {analysis['batch_co2e_kg']:.1f} kg",
            "",
        ]

        if analysis["phase_breakdown"]:
            total = sum(analysis["phase_breakdown"].values()) or 1
            lines.append("Phase breakdown:")
            for phase, co2 in sorted(
                analysis["phase_breakdown"].items(), key=lambda x: -x[1]
            ):
                pct = co2 / total * 100
                lines.append(f"  - {phase}: {co2:.1f} kg ({pct:.0f}%)")
            lines.append("")

        lines.append("Regulatory compliance:")
        for key, comp in analysis["regulatory_compliance"].items():
            lines.append(
                f"  - {comp['label']}: {comp['limit_kg']:.1f} kg limit → "
                f"{comp['status']} ({comp['pct_of_target']:.1f}% of target, "
                f"headroom: {comp['headroom_kg']:+.1f} kg)"
            )

        lines.extend([
            "",
            f"Rolling avg (last 5): {analysis['rolling_avg_5']:.1f} kg",
            f"Trend: {analysis['trend']}",
            "",
            "Generate a carbon compliance alert for the operator. "
            "Highlight any targets that are OVER or AT_RISK.",
        ])
        return "\n".join(lines)

    def needs_operator_action(self, analysis: dict) -> bool:
        return analysis.get("any_over", False) or analysis.get("any_at_risk", False)

    def get_action_type(self, analysis: dict) -> str:
        return "acknowledge_alert"

    def get_confidence(self, analysis: dict) -> float:
        if analysis.get("any_over"):
            return 0.95
        if analysis.get("any_at_risk"):
            return 0.80
        return 0.90
