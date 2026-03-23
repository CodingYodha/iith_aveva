"""
prediction_agent.py — Runs XGBoost predictions + SHAP explanations.
Sends results to OpenClaw for plain-English batch explanation.
"""

import os
import sys

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import PHARMA_LIMITS
from src.agents.base_agent import BaseAgent
from src.agents.shap_explainer import explain_batch

_ROLE = (
    "You are a pharmaceutical manufacturing prediction analyst. "
    "Explain batch quality predictions and their SHAP-based key drivers "
    "in plain English for plant operators. Be concise, specific, actionable. "
    "Reference parameter names and values. Highlight any CQA violations "
    "against pharma limits. Keep your response under 250 words."
)


class PredictionAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="prediction", role=_ROLE)

    def analyze(self, context: dict) -> dict:
        batch_id = context.get("batch_id", "unknown")
        cpp_params = context.get("cpp_params", {})

        # Run SHAP explanations (includes predictions)
        shap_results = explain_batch(cpp_params)

        # Check violations against pharma limits
        violations = []
        predictions = {}
        for entry in shap_results:
            target = entry["target"]
            pred = entry["prediction"]
            predictions[target] = pred

            if target in PHARMA_LIMITS:
                limits = PHARMA_LIMITS[target]
                if "min" in limits and pred < limits["min"]:
                    violations.append({
                        "cqa": target,
                        "predicted": pred,
                        "limit": f">= {limits['min']}",
                        "severity": "VIOLATION",
                    })
                if "max" in limits and pred > limits["max"]:
                    violations.append({
                        "cqa": target,
                        "predicted": pred,
                        "limit": f"<= {limits['max']}",
                        "severity": "VIOLATION",
                    })

        return {
            "batch_id": batch_id,
            "predictions": predictions,
            "shap_results": shap_results,
            "violations": violations,
            "has_violations": len(violations) > 0,
        }

    def format_prompt(self, analysis: dict) -> str:
        batch_id = analysis["batch_id"]
        lines = [f"Batch {batch_id} quality predictions:\n"]

        for entry in analysis["shap_results"]:
            target = entry["target"]
            pred = entry["prediction"]
            # Check limit status
            status = "OK"
            if target in PHARMA_LIMITS:
                lim = PHARMA_LIMITS[target]
                if ("min" in lim and pred < lim["min"]) or \
                   ("max" in lim and pred > lim["max"]):
                    status = "VIOLATION"
            lines.append(f"- {target}: {pred:.2f} ({status})")

            # Top drivers
            if entry["top_positive"]:
                drivers = ", ".join(
                    f"{k} (+{v:.3f})" for k, v in entry["top_positive"][:2]
                )
                lines.append(f"  Top positive drivers: {drivers}")
            if entry["top_negative"]:
                drivers = ", ".join(
                    f"{k} ({v:.3f})" for k, v in entry["top_negative"][:2]
                )
                lines.append(f"  Top negative drivers: {drivers}")

        if analysis["violations"]:
            lines.append("\nVIOLATIONS DETECTED:")
            for v in analysis["violations"]:
                lines.append(f"  - {v['cqa']}: predicted {v['predicted']:.2f}, "
                             f"limit {v['limit']}")

        lines.append(
            "\nGenerate a concise plain-English explanation for the plant operator. "
            "Explain which parameters are driving quality issues and what to watch."
        )
        return "\n".join(lines)

    def needs_operator_action(self, analysis: dict) -> bool:
        return analysis.get("has_violations", False)

    def get_action_type(self, analysis: dict) -> str:
        return "review_explanation"

    def get_confidence(self, analysis: dict) -> float:
        # Higher confidence when no violations
        if not analysis.get("has_violations"):
            return 0.95
        return 0.80
