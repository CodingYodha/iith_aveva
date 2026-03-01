"""
dtw_envelope.py — Module 1: DTW Barycenter Averaging & Probabilistic Envelope.
Computes DBA trajectories and ±3σ envelopes for each golden cluster/phase/sensor.
"""

import json
import os
import sys

import numpy as np
import pandas as pd
from tslearn.barycenters import dtw_barycenter_averaging

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import PHASE_SENSOR_MAP


def load_phase_signal(
    batch_id: str,
    phase: str,
    sensor: str,
    trajectories_dir: str = "data/processed/batch_trajectories",
) -> np.ndarray:
    """
    Load a single sensor signal for a given batch and phase.

    Returns
    -------
    np.ndarray
        1D array of sensor values, or empty array if phase not found.
    """
    csv_path = os.path.join(_PROJECT_ROOT, trajectories_dir, f"{batch_id}.csv")
    df = pd.read_csv(csv_path)
    phase_df = df[df["Phase"] == phase]
    if len(phase_df) == 0:
        return np.array([])
    return phase_df[sensor].values


def compute_dba_trajectory(
    batch_ids: list, phase: str, sensor: str
) -> np.ndarray:
    """
    Compute the DTW Barycenter Average trajectory across multiple batches.

    Returns
    -------
    np.ndarray
        1D DBA mean trajectory.
    """
    signals = []
    for bid in batch_ids:
        sig = load_phase_signal(bid, phase, sensor)
        if len(sig) > 0:
            signals.append(sig.reshape(-1, 1))

    if len(signals) == 0:
        return np.array([])

    dba = dtw_barycenter_averaging(signals)
    return dba.flatten()


def compute_envelope(batch_ids: list, phase: str, sensor: str) -> dict:
    """
    Build ±3σ probabilistic envelope for a given set of batch signals.

    All signals are resampled to max_length via linear interpolation,
    then pointwise mean/std are computed.

    Returns
    -------
    dict
        {"mean": [...], "upper": [...], "lower": [...],
         "n_samples": int, "phase": str, "sensor": str}
    """
    raw_signals = []
    for bid in batch_ids:
        sig = load_phase_signal(bid, phase, sensor)
        if len(sig) > 0:
            raw_signals.append(sig)

    if len(raw_signals) == 0:
        return {
            "mean": [],
            "upper": [],
            "lower": [],
            "n_samples": 0,
            "phase": phase,
            "sensor": sensor,
        }

    # Resample all to max_length using linear interpolation
    max_length = max(len(s) for s in raw_signals)
    aligned = np.zeros((len(raw_signals), max_length))
    for i, sig in enumerate(raw_signals):
        x_orig = np.linspace(0, 1, len(sig))
        x_new = np.linspace(0, 1, max_length)
        aligned[i, :] = np.interp(x_new, x_orig, sig)

    # Pointwise statistics
    mean = aligned.mean(axis=0)
    std = aligned.std(axis=0)
    upper = mean + 3 * std
    lower = mean - 3 * std

    return {
        "mean": mean.tolist(),
        "upper": upper.tolist(),
        "lower": lower.tolist(),
        "n_samples": len(raw_signals),
        "phase": phase,
        "sensor": sensor,
    }


def build_all_envelopes(
    cluster_batch_map_path: str = "data/golden/cluster_batch_map.json",
) -> dict:
    """
    Build envelopes for every (cluster, phase, sensor) combination.

    Returns
    -------
    dict
        Nested: envelopes[cluster_name][phase][sensor] = envelope_dict
    """
    map_path = os.path.join(_PROJECT_ROOT, cluster_batch_map_path)
    with open(map_path) as f:
        cluster_batch_map = json.load(f)

    envelopes = {}
    total = 0
    failures = 0

    print(f"{'='*60}")
    print(f"  Building Golden Envelopes (DBA + ±3σ)")
    print(f"{'='*60}")

    for cluster_name, batch_ids in cluster_batch_map.items():
        envelopes[cluster_name] = {}
        print(f"\n  Cluster: {cluster_name} ({len(batch_ids)} batches)")

        for phase, sensors in PHASE_SENSOR_MAP.items():
            envelopes[cluster_name][phase] = {}

            for sensor in sensors:
                env = compute_envelope(batch_ids, phase, sensor)
                envelopes[cluster_name][phase][sensor] = env
                total += 1

                if env["n_samples"] == 0:
                    failures += 1
                    print(f"    ⚠ {phase}/{sensor}: no data")
                else:
                    print(
                        f"    ✓ {phase}/{sensor}: "
                        f"{env['n_samples']} samples, "
                        f"len={len(env['mean'])}"
                    )

    # Save
    out_path = os.path.join(_PROJECT_ROOT, "data", "golden", "golden_envelopes.json")
    with open(out_path, "w") as f:
        json.dump(envelopes, f)

    print(f"\n  Total envelopes computed : {total}")
    print(f"  Failures (no data)      : {failures}")
    print(f"  Saved → {out_path}")
    print(f"{'='*60}")

    return envelopes


if __name__ == "__main__":
    envelopes = build_all_envelopes()

    # Verify structure
    print(f"\nVerification:")
    print(f"  Top-level keys (clusters) : {len(envelopes)}")
    for cname, phases in envelopes.items():
        print(f"  {cname}: {len(phases)} phases")
        for phase, sensors in phases.items():
            print(f"    {phase}: {list(sensors.keys())}")
