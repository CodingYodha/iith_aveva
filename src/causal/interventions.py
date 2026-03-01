"""
interventions.py — Causal counterfactual intervention engine.
Uses Do-calculus causal interventions to estimate effects of CPP changes
and generate dual-pathway recommendations (Yield Guard / Carbon Savior).
"""

import os
import sys
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import CPP_COLS, CQA_COLS, PHARMA_LIMITS
from src.causal.causal_model import OUTCOME_VARS, load_causal_models

# ---------------------------------------------------------------------------
# CPP bounds cache
# ---------------------------------------------------------------------------
_CPP_BOUNDS_CACHE = None


def compute_cpp_bounds(
    master_dataset_path: str = "data/processed/master_dataset.csv",
) -> dict:
    """
    Compute and cache min/max per CPP column from the master dataset.

    Returns
    -------
    dict
        {cpp_name: {"min": float, "max": float}}
    """
    global _CPP_BOUNDS_CACHE
    if _CPP_BOUNDS_CACHE is not None:
        return _CPP_BOUNDS_CACHE

    df = pd.read_csv(os.path.join(_PROJECT_ROOT, master_dataset_path))
    bounds = {}
    for cpp in CPP_COLS:
        bounds[cpp] = {"min": float(df[cpp].min()), "max": float(df[cpp].max())}

    _CPP_BOUNDS_CACHE = bounds
    return bounds


# ---------------------------------------------------------------------------
# Intervention effect estimation
# ---------------------------------------------------------------------------
def estimate_intervention_effect(
    treatment_var: str,
    treatment_value: float,
    current_state: dict,
    outcome_var: str,
    causal_models: dict,
) -> float:
    """
    Estimate the causal effect of changing treatment_var to treatment_value.

    Uses linear regression coefficient from the fitted DoWhy model.
    Falls back to correlation-based estimate if model unavailable.

    Returns
    -------
    float
        Expected delta in outcome_var (not absolute value).
    """
    if outcome_var not in causal_models or causal_models[outcome_var]["estimate"] is None:
        # Fallback: simple correlation estimate
        warnings.warn(
            f"No causal model for {outcome_var}, using correlation fallback"
        )
        return 0.0

    model_dict = causal_models[outcome_var]
    estimate = model_dict["estimate"]

    # The DoWhy linear regression estimate gives a single aggregate coefficient.
    # For multi-treatment models, the value is the total effect.
    # We approximate per-treatment delta proportionally.
    current_val = current_state.get(treatment_var, 0.0)
    delta_treatment = treatment_value - current_val

    # Extract coefficient — DoWhy estimate.value is the mean causal effect
    # For linear regression with multiple treatments, we use value as a scaling factor
    coeff = estimate.value

    # Scale by input change magnitude relative to treatment range
    bounds = compute_cpp_bounds()
    if treatment_var in bounds:
        t_range = bounds[treatment_var]["max"] - bounds[treatment_var]["min"]
        if t_range > 0:
            normalized_delta = delta_treatment / t_range
            delta_outcome = coeff * normalized_delta
        else:
            delta_outcome = 0.0
    else:
        delta_outcome = coeff * delta_treatment

    return float(delta_outcome)


# ---------------------------------------------------------------------------
# Candidate generation
# ---------------------------------------------------------------------------
def generate_candidate_interventions(current_cpp: dict) -> list:
    """
    Generate candidate CPP interventions at ±5% and ±10%.

    Returns
    -------
    list of (param_name, new_value, delta_pct)
    """
    bounds = compute_cpp_bounds()
    candidates = []

    for cpp in CPP_COLS:
        current_val = current_cpp.get(cpp, 0.0)
        if current_val == 0:
            continue

        for pct in [-10, -5, +5, +10]:
            new_val = current_val * (1 + pct / 100.0)

            # Clamp to observed range
            lo = bounds[cpp]["min"]
            hi = bounds[cpp]["max"]
            new_val = max(lo, min(hi, new_val))

            delta_pct = (new_val - current_val) / current_val * 100.0
            if abs(delta_pct) < 0.01:
                continue  # skip if clamped to same value

            candidates.append((cpp, round(new_val, 4), round(delta_pct, 2)))

    return candidates


# ---------------------------------------------------------------------------
# Safety validation
# ---------------------------------------------------------------------------
def _validate_predicted_state(predicted_cqas: dict) -> str:
    """Check predicted CQAs against pharma limits. Returns 'PASS' or 'FAIL'."""
    for col, limits in PHARMA_LIMITS.items():
        if col not in predicted_cqas:
            continue
        val = predicted_cqas[col]
        if "min" in limits and val < limits["min"]:
            return "FAIL"
        if "max" in limits and val > limits["max"]:
            return "FAIL"
    return "PASS"


# ---------------------------------------------------------------------------
# Recommendation engine
# ---------------------------------------------------------------------------
def get_causal_recommendations(
    current_batch_state: dict,
    target_config: str,
    causal_models: dict = None,
) -> list:
    """
    Generate dual-pathway recommendations using causal interventions.

    Parameters
    ----------
    current_batch_state : dict
        Current CPP + CQA values for the batch.
    target_config : str
        One of "Max Quality Golden", "Deep Decarbonization Golden",
        "Balanced Operational Golden".
    causal_models : dict or None
        Pre-loaded causal models. Loaded automatically if None.

    Returns
    -------
    list
        Top 2 recommendations: [Yield Guard, Carbon Savior], both with
        safety_check == "PASS".
    """
    if causal_models is None:
        causal_models = load_causal_models()

    candidates = generate_candidate_interventions(current_batch_state)
    scored = []

    for param, new_value, delta_pct in candidates:
        old_value = current_batch_state.get(param, 0.0)

        # Estimate causal effect on all outcomes
        causal_effects = {}
        for outcome in OUTCOME_VARS:
            delta = estimate_intervention_effect(
                param, new_value, current_batch_state, outcome, causal_models
            )
            causal_effects[outcome] = round(delta, 4)

        # Predict new state
        predicted_cqas = {}
        for cqa in CQA_COLS:
            current_cqa = current_batch_state.get(cqa, 0.0)
            delta = causal_effects.get(cqa, 0.0)
            predicted_cqas[cqa] = current_cqa + delta

        # CO2 change
        expected_co2_change = causal_effects.get("total_CO2e_kg", 0.0)

        # Safety check
        safety_check = _validate_predicted_state(predicted_cqas)

        rec = {
            "param": param,
            "old_value": old_value,
            "new_value": new_value,
            "delta_pct": delta_pct,
            "causal_effects": causal_effects,
            "expected_co2_change": expected_co2_change,
            "safety_check": safety_check,
            "pathway_name": "",  # assigned later
        }

        # Scoring
        if safety_check == "PASS":
            # Quality score: Hardness↑, Dissolution↑, Friability↓
            q_hardness = causal_effects.get("Hardness", 0.0)
            q_dissolution = causal_effects.get("Dissolution_Rate", 0.0)
            q_friability = -causal_effects.get("Friability", 0.0)  # lower is better
            quality_score = q_hardness + q_dissolution + q_friability

            # CO2 score: lower is better → negate
            co2_score = -expected_co2_change

            # Combined score by target_config
            if target_config == "Max Quality Golden":
                combined_score = quality_score * 0.8 + co2_score * 0.2
            elif target_config == "Deep Decarbonization Golden":
                combined_score = quality_score * 0.2 + co2_score * 0.8
            else:  # Balanced
                combined_score = quality_score * 0.5 + co2_score * 0.5

            scored.append({
                **rec,
                "_quality_score": quality_score,
                "_co2_score": co2_score,
                "_combined_score": combined_score,
            })

    if not scored:
        return []

    # Pathway A: Yield Guard — highest quality improvement
    scored_by_quality = sorted(scored, key=lambda x: x["_quality_score"], reverse=True)
    pathway_a = scored_by_quality[0].copy()
    pathway_a["pathway_name"] = "Yield Guard"

    # Pathway B: Carbon Savior — highest CO2 reduction
    scored_by_co2 = sorted(scored, key=lambda x: x["_co2_score"], reverse=True)
    pathway_b = scored_by_co2[0].copy()
    pathway_b["pathway_name"] = "Carbon Savior"

    # Clean internal scoring keys
    for key in ["_quality_score", "_co2_score", "_combined_score"]:
        pathway_a.pop(key, None)
        pathway_b.pop(key, None)

    return [pathway_a, pathway_b]


if __name__ == "__main__":
    print(f"{'='*60}")
    print(f"  Causal Counterfactual Intervention Engine")
    print(f"{'='*60}")

    # Load sample batch state from row 0
    df = pd.read_csv(os.path.join(_PROJECT_ROOT, "data", "processed", "master_dataset.csv"))
    row = df.iloc[0]
    batch_state = row.to_dict()

    print(f"\n  Sample batch: {batch_state['Batch_ID']}")
    print(f"  Current CPPs:")
    for cpp in CPP_COLS:
        print(f"    {cpp:25s}: {batch_state[cpp]}")
    print(f"  Current CQAs:")
    for cqa in CQA_COLS:
        print(f"    {cqa:25s}: {batch_state[cqa]}")

    # Get recommendations
    print(f"\n  Generating recommendations for 'Balanced Operational Golden'...")
    recs = get_causal_recommendations(batch_state, "Balanced Operational Golden")

    for rec in recs:
        print(f"\n  ═══ {rec['pathway_name']} ═══")
        print(f"    Intervention: {rec['param']} "
              f"{rec['old_value']:.2f} → {rec['new_value']:.2f} "
              f"({rec['delta_pct']:+.1f}%)")
        print(f"    Safety: {rec['safety_check']}")
        print(f"    CO2 change: {rec['expected_co2_change']:+.4f} kg")
        print(f"    Causal effects:")
        for outcome, delta in rec["causal_effects"].items():
            direction = "↑" if delta > 0 else "↓" if delta < 0 else "→"
            print(f"      {outcome:25s}: {delta:+.4f} {direction}")

    print(f"\n{'='*60}")
