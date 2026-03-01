"""
trajectory_parser.py — Parse all batch process time-series data.
Produces one CSV per batch in data/processed/batch_trajectories/
and a trajectory_summary.json.
"""

import json
import os
import sys
import pandas as pd

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import PHASE_ORDER


def parse_all_trajectories(path: str) -> dict:
    """
    Read all 60 batch sheets from the process Excel file, validate,
    derive Energy_kWh, and save individual CSVs + summary JSON.

    Parameters
    ----------
    path : str
        Path to _h_batch_process_data.xlsx.

    Returns
    -------
    dict[str, pd.DataFrame]
        Mapping of batch_id -> DataFrame.
    """
    xl = pd.ExcelFile(path)
    sheet_names = [s for s in xl.sheet_names if s != "Summary"]

    out_dir = os.path.join(_PROJECT_ROOT, "data", "processed", "batch_trajectories")
    os.makedirs(out_dir, exist_ok=True)

    batch_dict = {}
    summary = {}

    for sheet in sheet_names:
        df = pd.read_excel(xl, sheet_name=sheet)

        # Extract batch_id from sheet name (e.g. "Batch_T001" -> "T001")
        batch_id = sheet.replace("Batch_", "")

        # --- Phase validation ---
        unique_phases = df["Phase"].unique().tolist()
        valid_phases = [p for p in unique_phases if p in PHASE_ORDER]
        if len(valid_phases) < 5:
            raise ValueError(
                f"Batch {batch_id}: only {len(valid_phases)} valid phases "
                f"found ({valid_phases}). Expected at least 5."
            )

        # --- Derived feature: Energy_kWh ---
        df["Energy_kWh"] = df["Power_Consumption_kW"] * (1 / 60)

        # --- Save per-batch CSV ---
        csv_path = os.path.join(out_dir, f"{batch_id}.csv")
        df.to_csv(csv_path, index=False)

        batch_dict[batch_id] = df

        # --- Summary entry ---
        total_energy = df["Energy_kWh"].sum()
        summary[batch_id] = {
            "total_minutes": int(len(df)),
            "phases": unique_phases,
            "total_energy_kWh": round(float(total_energy), 4),
        }

    xl.close()

    # --- Save summary JSON ---
    summary_path = os.path.join(_PROJECT_ROOT, "data", "processed", "trajectory_summary.json")
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)

    # --- Print stats ---
    avg_minutes = sum(s["total_minutes"] for s in summary.values()) / len(summary)
    avg_energy = sum(s["total_energy_kWh"] for s in summary.values()) / len(summary)

    print(f"{'='*50}")
    print(f"  Trajectory Parser Summary")
    print(f"{'='*50}")
    print(f"  Total batches processed : {len(summary)}")
    print(f"  Avg minutes per batch   : {avg_minutes:.1f}")
    print(f"  Avg total energy (kWh)  : {avg_energy:.2f}")
    print(f"  Saved CSVs → {out_dir}")
    print(f"  Saved JSON → {summary_path}")
    print(f"{'='*50}")

    return batch_dict


if __name__ == "__main__":
    batches = parse_all_trajectories("data/raw/_h_batch_process_data.xlsx")

    # Print summary for first 3 batches
    import json as _json

    summary_path = os.path.join(_PROJECT_ROOT, "data", "processed", "trajectory_summary.json")
    with open(summary_path) as f:
        summary = _json.load(f)

    print("\nFirst 3 batch summaries:")
    for bid in list(summary.keys())[:3]:
        s = summary[bid]
        print(f"  {bid}: {s['total_minutes']} min, "
              f"{len(s['phases'])} phases, "
              f"{s['total_energy_kWh']:.2f} kWh")
