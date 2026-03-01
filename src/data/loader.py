"""
loader.py — Load and validate batch production data.
Produces data/processed/batch_outcomes.csv with Reg_Pass column.
"""

import os
import sys
import pandas as pd

# Ensure project root is on sys.path so we can import constraints
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import CPP_COLS, CQA_COLS, PHARMA_LIMITS, validate_batch


def load_batch_outcomes(path: str) -> pd.DataFrame:
    """
    Load _h_batch_production_data.xlsx, validate, add Reg_Pass, save CSV.

    Parameters
    ----------
    path : str
        Path to the production Excel file (relative to cwd or absolute).

    Returns
    -------
    pd.DataFrame
        60 × 16 dataframe (original 15 cols + Reg_Pass).
    """
    df = pd.read_excel(path)

    # --- Shape check ---
    if df.shape != (60, 15):
        raise ValueError(
            f"Expected shape (60, 15), got {df.shape}. "
            "Check that the correct file is provided."
        )

    # --- Null check ---
    null_count = df.isnull().sum().sum()
    assert null_count == 0, f"Expected 0 nulls, found {null_count}"

    # --- Column existence checks ---
    for col in CPP_COLS:
        assert col in df.columns, f"Missing CPP column: {col}"
    for col in CQA_COLS:
        assert col in df.columns, f"Missing CQA column: {col}"

    # --- Regulatory pass/fail ---
    results = df.apply(lambda row: validate_batch(row.to_dict()), axis=1)
    df["Reg_Pass"] = results.apply(lambda r: r["passed"])

    # --- Summary ---
    n_total = len(df)
    n_pass = df["Reg_Pass"].sum()
    n_fail = n_total - n_pass

    print(f"{'='*50}")
    print(f"  Batch Outcomes Summary")
    print(f"{'='*50}")
    print(f"  Total batches : {n_total}")
    print(f"  Passing       : {n_pass}")
    print(f"  Failing       : {n_fail}")

    # Find which CQAs have violations
    all_violations = []
    for r in results:
        all_violations.extend(r["violations"])
    if all_violations:
        # Extract CQA names from violation strings
        violated_cqas = set()
        for v in all_violations:
            cqa_name = v.split("=")[0]
            violated_cqas.add(cqa_name)
        print(f"  CQAs with violations: {sorted(violated_cqas)}")
    else:
        print("  No CQA violations found.")
    print(f"{'='*50}")

    # --- Save ---
    out_dir = os.path.join(_PROJECT_ROOT, "data", "processed")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "batch_outcomes.csv")
    df.to_csv(out_path, index=False)
    print(f"  Saved → {out_path}")

    return df


if __name__ == "__main__":
    df = load_batch_outcomes("data/raw/_h_batch_production_data.xlsx")
    print(f"\nResult shape: {df.shape}")
    print(f"\nFirst 3 rows:")
    print(df.head(3).to_string())
    print(f"\nReg_Pass value counts:")
    print(df["Reg_Pass"].value_counts().to_string())
