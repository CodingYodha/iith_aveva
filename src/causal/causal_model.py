"""
causal_model.py — Structural Causal Model fitting using DoWhy.
Fits one causal model per outcome variable on the master dataset.
"""

import os
import sys
import warnings

import joblib
import networkx as nx
import pandas as pd

warnings.filterwarnings("ignore")

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import CPP_COLS
from src.causal.dag_definition import build_dag, get_dag_gml_string

# Outcome variables to model
OUTCOME_VARS = [
    "Hardness",
    "Friability",
    "Dissolution_Rate",
    "Disintegration_Time",
    "Content_Uniformity",
    "total_CO2e_kg",
]


def build_and_fit_causal_model(
    df: pd.DataFrame, outcome_var: str, dag: nx.DiGraph
) -> dict:
    """
    Build and fit a DoWhy Structural Causal Model for one outcome.

    Parameters
    ----------
    df : pd.DataFrame
        Master dataset.
    outcome_var : str
        Target CQA or energy/carbon variable.
    dag : nx.DiGraph
        The causal DAG.

    Returns
    -------
    dict
        {"model", "estimand", "estimate", "outcome"}
    """
    from dowhy import CausalModel

    # Determine treatment variables: CPPs with a path to outcome_var in DAG
    treatment_cols = []
    for cpp in CPP_COLS:
        if cpp in dag.nodes and outcome_var in dag.nodes:
            if nx.has_path(dag, cpp, outcome_var):
                treatment_cols.append(cpp)

    # For CO2e, also include total_energy_kWh as treatment
    if outcome_var == "total_CO2e_kg" and "total_energy_kWh" in dag.nodes:
        if "total_energy_kWh" not in treatment_cols:
            treatment_cols.append("total_energy_kWh")

    if not treatment_cols:
        print(f"  ⚠ No treatment variables found for {outcome_var}")
        return {
            "model": None,
            "estimand": None,
            "estimate": None,
            "outcome": outcome_var,
        }

    # Subset dataframe to only relevant columns
    relevant_nodes = list(dag.nodes)
    available_cols = [c for c in relevant_nodes if c in df.columns]
    df_subset = df[available_cols].copy()

    # Build GML string
    gml_str = get_dag_gml_string(dag)

    # Create DoWhy CausalModel
    model = CausalModel(
        data=df_subset,
        treatment=treatment_cols,
        outcome=outcome_var,
        graph=gml_str,
    )

    # Identify estimand
    identified_estimand = model.identify_effect(proceed_when_unidentifiable=True)

    # Estimate effect
    estimate = model.estimate_effect(
        identified_estimand,
        method_name="backdoor.linear_regression",
    )

    return {
        "model": model,
        "estimand": identified_estimand,
        "estimate": estimate,
        "outcome": outcome_var,
    }


def fit_all_causal_models(
    master_dataset_path: str = "data/processed/master_dataset.csv",
) -> dict:
    """
    Fit causal models for all outcome variables and save as PKL files.

    Returns
    -------
    dict
        {outcome_var: model_dict}
    """
    df = pd.read_csv(os.path.join(_PROJECT_ROOT, master_dataset_path))
    dag = build_dag()

    models_dir = os.path.join(_PROJECT_ROOT, "models")
    os.makedirs(models_dir, exist_ok=True)

    all_models = {}

    print(f"{'='*60}")
    print(f"  Structural Causal Model Fitting (DoWhy)")
    print(f"{'='*60}")

    for outcome_var in OUTCOME_VARS:
        print(f"\n  Fitting: {outcome_var}")

        model_dict = build_and_fit_causal_model(df, outcome_var, dag)
        all_models[outcome_var] = model_dict

        if model_dict["estimate"] is not None:
            # Determine treatment variables for display
            treatment_cols = []
            for cpp in CPP_COLS:
                if cpp in dag.nodes and outcome_var in dag.nodes:
                    if nx.has_path(dag, cpp, outcome_var):
                        treatment_cols.append(cpp)
            if outcome_var == "total_CO2e_kg":
                treatment_cols.append("total_energy_kWh")

            print(f"    Treatments: {treatment_cols}")
            print(f"    Estimate value: {model_dict['estimate'].value:.4f}")

        # Save with joblib
        pkl_path = os.path.join(models_dir, f"causal_{outcome_var}.pkl")
        joblib.dump(model_dict, pkl_path)
        print(f"    Saved → {pkl_path}")

    print(f"\n{'='*60}")
    print(f"  All {len(OUTCOME_VARS)} causal models fitted and saved.")
    print(f"{'='*60}")

    return all_models


def load_causal_models() -> dict:
    """
    Load all fitted causal model PKL files from models/ directory.

    Returns
    -------
    dict
        {outcome_var: model_dict}
    """
    models_dir = os.path.join(_PROJECT_ROOT, "models")
    loaded = {}

    for outcome_var in OUTCOME_VARS:
        pkl_path = os.path.join(models_dir, f"causal_{outcome_var}.pkl")
        if not os.path.exists(pkl_path):
            raise FileNotFoundError(
                f"Model not found: {pkl_path}. "
                f"Run `python -m src.causal.causal_model` first to fit models."
            )
        loaded[outcome_var] = joblib.load(pkl_path)

    return loaded


if __name__ == "__main__":
    all_models = fit_all_causal_models()
    print(f"\nSuccess: {len(all_models)} models fitted.")
    for k, v in all_models.items():
        est = v["estimate"]
        val = f"{est.value:.4f}" if est is not None else "N/A"
        print(f"  {k:25s}: estimate = {val}")
