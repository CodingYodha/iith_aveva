"""
feature_engineer.py — Compute per-phase energy features from trajectory CSVs
and merge with batch outcomes to create the master dataset.
"""

import os
import sys
import glob
import pandas as pd

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import PHASE_ORDER, CARBON_CONFIG


def engineer_features(trajectories_dir: str, batch_outcomes_path: str) -> pd.DataFrame:
    """
    Compute per-phase energy features from trajectory CSVs and merge
    with batch_outcomes.csv to produce master_dataset.csv.

    Parameters
    ----------
    trajectories_dir : str
        Path to data/processed/batch_trajectories/ containing per-batch CSVs.
    batch_outcomes_path : str
        Path to data/processed/batch_outcomes.csv.

    Returns
    -------
    pd.DataFrame
        Master dataset with CPPs + CQAs + energy features + Reg_Pass.
    """
    # Load batch outcomes
    outcomes = pd.read_csv(batch_outcomes_path)

    # Process each trajectory CSV
    all_features = []
    csv_files = sorted(glob.glob(os.path.join(trajectories_dir, "*.csv")))

    for csv_path in csv_files:
        batch_id = os.path.splitext(os.path.basename(csv_path))[0]  # e.g. "T001"
        df = pd.read_csv(csv_path)

        feature_dict = {"Batch_ID": batch_id}

        # Per-phase features
        for phase in PHASE_ORDER:
            phase_df = df[df["Phase"] == phase]
            if len(phase_df) == 0:
                # Phase not present — fill with 0
                feature_dict[f"{phase}_energy_kWh"] = 0.0
                feature_dict[f"{phase}_peak_power"] = 0.0
                feature_dict[f"{phase}_power_variance"] = 0.0
                feature_dict[f"{phase}_vibration_mean"] = 0.0
                feature_dict[f"{phase}_vibration_max"] = 0.0
                feature_dict[f"{phase}_duration_minutes"] = 0
                continue

            feature_dict[f"{phase}_energy_kWh"] = phase_df["Energy_kWh"].sum()
            feature_dict[f"{phase}_peak_power"] = phase_df["Power_Consumption_kW"].max()
            feature_dict[f"{phase}_power_variance"] = phase_df["Power_Consumption_kW"].std()
            feature_dict[f"{phase}_vibration_mean"] = phase_df["Vibration_mm_s"].mean()
            feature_dict[f"{phase}_vibration_max"] = phase_df["Vibration_mm_s"].max()
            feature_dict[f"{phase}_duration_minutes"] = len(phase_df)

        # Batch-level totals
        energy_cols = [v for k, v in feature_dict.items() if k.endswith("_energy_kWh")]
        duration_cols = [v for k, v in feature_dict.items() if k.endswith("_duration_minutes")]

        feature_dict["total_energy_kWh"] = sum(energy_cols)
        feature_dict["total_duration_minutes"] = sum(duration_cols)
        feature_dict["total_CO2e_kg"] = (
            feature_dict["total_energy_kWh"] * CARBON_CONFIG["grid_emission_factor"]
        )

        all_features.append(feature_dict)

    # Build features DataFrame
    features_df = pd.DataFrame(all_features)

    # Left-join with outcomes on Batch_ID
    master = outcomes.merge(features_df, on="Batch_ID", how="left")

    # Save
    out_path = os.path.join(_PROJECT_ROOT, "data", "processed", "master_dataset.csv")
    master.to_csv(out_path, index=False)

    # Print summary
    print(f"{'='*60}")
    print(f"  Feature Engineering Summary")
    print(f"{'='*60}")
    print(f"  Final shape       : {master.shape}")
    print(f"  Total columns     : {len(master.columns)}")
    print(f"  Column list       :")
    for i, col in enumerate(master.columns):
        print(f"    {i+1:3d}. {col}")
    print(f"\n  Energy stats (kWh per batch):")
    print(f"    Mean : {master['total_energy_kWh'].mean():.2f}")
    print(f"    Min  : {master['total_energy_kWh'].min():.2f}")
    print(f"    Max  : {master['total_energy_kWh'].max():.2f}")
    print(f"\n  CO2e stats (kg per batch):")
    print(f"    Mean : {master['total_CO2e_kg'].mean():.2f}")
    print(f"    Min  : {master['total_CO2e_kg'].min():.2f}")
    print(f"    Max  : {master['total_CO2e_kg'].max():.2f}")
    print(f"\n  Saved → {out_path}")
    print(f"{'='*60}")

    return master


if __name__ == "__main__":
    master = engineer_features(
        trajectories_dir="data/processed/batch_trajectories",
        batch_outcomes_path="data/processed/batch_outcomes.csv",
    )
    print(f"\nResult shape: {master.shape}")
    print(f"\nFirst row (transposed):")
    print(master.iloc[0].to_string())
