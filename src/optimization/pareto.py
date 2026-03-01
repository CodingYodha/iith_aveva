"""
pareto.py — NSGA-II multi-objective Pareto front optimization.
Uses XGBoost surrogate trained on master_dataset to find Pareto-optimal
CPP configurations that jointly optimize CQAs and minimize carbon.
"""

import os
import sys
import warnings

import numpy as np
import pandas as pd
from sklearn.multioutput import MultiOutputRegressor
from xgboost import XGBRegressor
from pymoo.core.problem import Problem
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.optimize import minimize
from pymoo.termination import get_termination

warnings.filterwarnings("ignore", category=FutureWarning)

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import CPP_COLS, CQA_COLS


# Objectives we optimize (subset of CQA_COLS + CO2e)
_OBJ_COLS = [
    "Hardness",
    "Friability",
    "Disintegration_Time",
    "Dissolution_Rate",
    "Content_Uniformity",
    "total_CO2e_kg",
]


def train_surrogate(master_df: pd.DataFrame):
    """
    Train an XGBoost multi-output surrogate: CPPs → CQAs + total_CO2e_kg.

    Returns
    -------
    surrogate : fitted MultiOutputRegressor
    target_cols : list of target column names in prediction order
    """
    target_cols = CQA_COLS + ["total_CO2e_kg"]
    X = master_df[CPP_COLS].values
    Y = master_df[target_cols].values

    surrogate = MultiOutputRegressor(
        XGBRegressor(n_estimators=100, random_state=42, verbosity=0)
    )
    surrogate.fit(X, Y)

    print(f"  Surrogate trained: {len(CPP_COLS)} inputs → {len(target_cols)} outputs")
    return surrogate, target_cols


class TabletOptProblem(Problem):
    """
    pymoo Problem for pharmaceutical tablet optimization.

    Objectives (all minimized):
        0: -Hardness         (maximize → negate)
        1: +Friability       (minimize)
        2: +Disintegration   (minimize)
        3: -Dissolution_Rate (maximize → negate)
        4: +total_CO2e_kg    (minimize)

    Constraints (g ≤ 0 means satisfied):
        0: Friability - 1.0
        1: 80.0 - Dissolution_Rate
        2: 95.0 - Content_Uniformity
        3: Content_Uniformity - 105.0
        4: 60.0 - Hardness
        5: Disintegration_Time - 15.0
    """

    def __init__(self, surrogate, target_cols, master_df):
        self.surrogate = surrogate
        self.target_cols = target_cols
        self._col_idx = {c: i for i, c in enumerate(target_cols)}

        xl = master_df[CPP_COLS].min().values.astype(float)
        xu = master_df[CPP_COLS].max().values.astype(float)

        super().__init__(
            n_var=8,
            n_obj=5,
            n_ieq_constr=6,
            xl=xl,
            xu=xu,
        )

    def _evaluate(self, X, out, *args, **kwargs):
        preds = self.surrogate.predict(X)  # (pop, n_targets)

        hardness = preds[:, self._col_idx["Hardness"]]
        friability = preds[:, self._col_idx["Friability"]]
        disintegration = preds[:, self._col_idx["Disintegration_Time"]]
        dissolution = preds[:, self._col_idx["Dissolution_Rate"]]
        content_unif = preds[:, self._col_idx["Content_Uniformity"]]
        co2e = preds[:, self._col_idx["total_CO2e_kg"]]

        # Objectives (all minimized)
        out["F"] = np.column_stack([
            -hardness,          # maximize → negate
            friability,         # minimize
            disintegration,     # minimize
            -dissolution,       # maximize → negate
            co2e,               # minimize
        ])

        # Constraints: g ≤ 0 means feasible
        out["G"] = np.column_stack([
            friability - 1.0,           # g1: Friability ≤ 1.0
            80.0 - dissolution,         # g2: Dissolution ≥ 80.0
            95.0 - content_unif,        # g3: Content_Uniformity ≥ 95.0
            content_unif - 105.0,       # g4: Content_Uniformity ≤ 105.0
            60.0 - hardness,            # g5: Hardness ≥ 60.0
            disintegration - 15.0,      # g6: Disintegration ≤ 15.0
        ])


def run_pareto_optimization(master_dataset_path: str) -> pd.DataFrame:
    """
    Full pipeline: load data → train surrogate → run NSGA-II → save Pareto front.

    Returns
    -------
    pd.DataFrame
        Pareto-optimal solutions with CPP values + predicted CQAs + CO2e.
    """
    master_df = pd.read_csv(master_dataset_path)

    print(f"{'='*60}")
    print(f"  NSGA-II Pareto Front Optimization")
    print(f"{'='*60}")

    # Train surrogate
    surrogate, target_cols = train_surrogate(master_df)

    # Build problem
    problem = TabletOptProblem(surrogate, target_cols, master_df)

    # Run NSGA-II
    algorithm = NSGA2(pop_size=100)
    termination = get_termination("n_gen", 200)

    print("  Running NSGA-II (pop=100, gen=200)...")
    result = minimize(problem, algorithm, termination, seed=42, verbose=False)

    # Extract solutions
    X_pareto = result.X  # CPP values
    F_pareto = result.F  # objective values (negated where needed)

    # Predict full CQA set for Pareto solutions
    preds = surrogate.predict(X_pareto)

    # Build results DataFrame
    pareto_df = pd.DataFrame(X_pareto, columns=CPP_COLS)
    for i, col in enumerate(target_cols):
        pareto_df[col] = preds[:, i]

    # Filter out solutions that still violate constraints
    col_idx = {c: i for i, c in enumerate(target_cols)}
    mask = (
        (pareto_df["Friability"] <= 1.0)
        & (pareto_df["Dissolution_Rate"] >= 80.0)
        & (pareto_df["Content_Uniformity"] >= 95.0)
        & (pareto_df["Content_Uniformity"] <= 105.0)
        & (pareto_df["Hardness"] >= 60.0)
        & (pareto_df["Disintegration_Time"] <= 15.0)
    )
    pareto_feasible = pareto_df[mask].reset_index(drop=True)

    # Save
    out_dir = os.path.join(_PROJECT_ROOT, "data", "golden")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "pareto_front.csv")
    pareto_feasible.to_csv(out_path, index=False)

    # Print summary
    print(f"\n  Results:")
    print(f"    Total Pareto solutions  : {len(X_pareto)}")
    print(f"    Feasible (after filter) : {len(pareto_feasible)}")
    print(f"\n  Objective ranges (feasible solutions):")
    if len(pareto_feasible) > 0:
        for col in ["Hardness", "Friability", "Disintegration_Time",
                     "Dissolution_Rate", "total_CO2e_kg"]:
            lo = pareto_feasible[col].min()
            hi = pareto_feasible[col].max()
            print(f"    {col:25s}: [{lo:.2f}, {hi:.2f}]")
    print(f"\n  Saved → {out_path}")
    print(f"{'='*60}")

    return pareto_feasible


if __name__ == "__main__":
    pareto = run_pareto_optimization("data/processed/master_dataset.csv")
    print(f"\nPareto front shape: {pareto.shape}")
    if len(pareto) > 0:
        print(f"\nFirst 3 solutions:")
        print(pareto.head(3).to_string())
