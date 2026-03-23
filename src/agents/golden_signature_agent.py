"""
golden_signature_agent.py — Manages golden signature lifecycle.
Proposes updates (does NOT auto-update) and awaits operator approval.
"""

import json
import os
import sys
from datetime import datetime

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from src.agents.base_agent import BaseAgent
from src.signatures.signature_manager import dominates, get_active_signature
from src.signatures.database import get_session, GoldenSignature

_ROLE = (
    "You are a pharmaceutical golden signature lifecycle manager. "
    "Evaluate whether a batch justifies updating the golden reference. "
    "Explain your proposal with projected impact on energy, yield, and carbon "
    "with confidence scores. The operator must approve before changes take effect. "
    "Keep your response under 200 words."
)

# Objectives and their directions for computing deltas
_OBJECTIVES = {
    "Hardness": +1,        # higher is better
    "Dissolution_Rate": +1,
    "Friability": -1,       # lower is better
    "Disintegration_Time": -1,
    "total_CO2e_kg": -1,
}


class GoldenSignatureAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="golden_signature", role=_ROLE)

    def analyze(self, context: dict) -> dict:
        batch_id = context.get("batch_id", "unknown")
        actual_cqas = context.get("actual_cqas", {})
        cluster_name = context.get("cluster_name", "Balanced Operational Golden")

        # Get current active signature
        active = get_active_signature(cluster_name)
        if active is None:
            return {
                "batch_id": batch_id,
                "cluster_name": cluster_name,
                "dominates": False,
                "reason": "No active signature found",
                "current_version": 0,
            }

        # Parse reference CQAs
        ref_cqas = active.get("predicted_cqa", {})
        if not ref_cqas:
            ref_cqas = active.get("actual_cqa", {})

        if not ref_cqas or not actual_cqas:
            return {
                "batch_id": batch_id,
                "cluster_name": cluster_name,
                "dominates": False,
                "reason": "Insufficient CQA data for comparison",
                "current_version": active.get("version", 1),
            }

        # Dominance check
        does_dominate = dominates(actual_cqas, ref_cqas)

        if not does_dominate:
            return {
                "batch_id": batch_id,
                "cluster_name": cluster_name,
                "dominates": False,
                "reason": "Batch does not dominate current signature",
                "current_version": active.get("version", 1),
                "comparison": {
                    k: {"batch": actual_cqas.get(k), "golden": ref_cqas.get(k)}
                    for k in _OBJECTIVES if k in actual_cqas and k in ref_cqas
                },
            }

        # Compute deltas and projected impact
        deltas = {}
        improvements = 0
        for obj, direction in _OBJECTIVES.items():
            if obj in actual_cqas and obj in ref_cqas:
                batch_val = actual_cqas[obj]
                ref_val = ref_cqas[obj]
                abs_delta = batch_val - ref_val
                pct_delta = (abs_delta / ref_val * 100) if ref_val != 0 else 0
                improved = (abs_delta * direction) > 0
                if improved:
                    improvements += 1
                deltas[obj] = {
                    "batch": round(batch_val, 4),
                    "golden": round(ref_val, 4),
                    "delta": round(abs_delta, 4),
                    "delta_pct": round(pct_delta, 2),
                    "improved": improved,
                }

        # Projected impact
        energy_pct = deltas.get("total_CO2e_kg", {}).get("delta_pct", 0)
        yield_pct = deltas.get("Dissolution_Rate", {}).get("delta_pct", 0)
        carbon_pct = energy_pct  # CO2e is directly tied to energy

        # Confidence: based on number of improved objectives and magnitude
        total_objs = len(_OBJECTIVES)
        confidence = min(0.99, 0.5 + (improvements / total_objs) * 0.4 +
                         min(0.1, abs(energy_pct) / 100))

        return {
            "batch_id": batch_id,
            "cluster_name": cluster_name,
            "dominates": True,
            "current_version": active.get("version", 1),
            "current_signature_id": active.get("id"),
            "deltas": deltas,
            "projected_impact": {
                "energy_pct": round(energy_pct, 2),
                "yield_pct": round(yield_pct, 2),
                "carbon_pct": round(carbon_pct, 2),
            },
            "confidence_score": round(confidence, 3),
            "proposed_cpp": active.get("cpp_params", {}),
            "proposed_cqa": actual_cqas,
        }

    def format_prompt(self, analysis: dict) -> str:
        if not analysis.get("dominates"):
            return (
                f"Batch {analysis['batch_id']} was compared against Golden Signature "
                f"v{analysis.get('current_version', '?')} for cluster "
                f"'{analysis.get('cluster_name', '?')}'. "
                f"Result: {analysis.get('reason', 'No update needed')}. "
                f"Generate a brief status message for the operator."
            )

        lines = [
            f"Batch {analysis['batch_id']} vs Golden Signature "
            f"v{analysis['current_version']} (cluster: {analysis['cluster_name']}):",
            "",
        ]
        for obj, detail in analysis.get("deltas", {}).items():
            arrow = "improved" if detail["improved"] else "worse"
            lines.append(
                f"- {obj}: {detail['batch']:.2f} vs {detail['golden']:.2f} "
                f"({detail['delta_pct']:+.1f}%, {arrow})"
            )

        impact = analysis.get("projected_impact", {})
        lines.extend([
            "",
            "Projected impact if signature updated:",
            f"- Energy: {impact.get('energy_pct', 0):+.1f}% per batch",
            f"- Yield (Dissolution Rate): {impact.get('yield_pct', 0):+.1f}%",
            f"- Carbon: {impact.get('carbon_pct', 0):+.1f}% CO2e per batch",
            f"- Confidence: {analysis.get('confidence_score', 0):.2f}",
            "",
            "Generate a proposal explanation for the operator to approve or reject. "
            "Include the projected benefits and confidence level.",
        ])
        return "\n".join(lines)

    def needs_operator_action(self, analysis: dict) -> bool:
        return analysis.get("dominates", False)

    def get_action_type(self, analysis: dict) -> str:
        return "approve_signature"

    def get_confidence(self, analysis: dict) -> float:
        return analysis.get("confidence_score", 0.0)
