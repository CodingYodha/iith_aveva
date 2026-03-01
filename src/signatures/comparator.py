"""
comparator.py — Real-time drift detection using Soft-DTW distance.
Compares live batch signals against golden envelopes to detect deviations.
"""

import json
import os
import sys

import numpy as np
import pandas as pd
from tslearn.metrics import soft_dtw

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import PHASE_SENSOR_MAP, CPP_COLS

# ---------------------------------------------------------------------------
# Module-level cache: load golden envelopes once at import time
# ---------------------------------------------------------------------------
_ENVELOPES_PATH = os.path.join(_PROJECT_ROOT, "data", "golden", "golden_envelopes.json")
try:
    with open(_ENVELOPES_PATH) as _f:
        _ENVELOPES_CACHE = json.load(_f)
except FileNotFoundError:
    _ENVELOPES_CACHE = {}


def check_drift(
    current_signal: np.ndarray,
    cluster_name: str,
    phase: str,
    sensor: str,
) -> dict:
    """
    Compute how far a live signal deviates from the golden envelope.

    Parameters
    ----------
    current_signal : np.ndarray
        1D sensor readings for one phase of one batch.
    cluster_name : str
        Which golden cluster to compare against.
    phase : str
        Manufacturing phase name.
    sensor : str
        Sensor column name.

    Returns
    -------
    dict
        drift_score, in_envelope, percent_outside, alarm_level
    """
    # Retrieve envelope
    try:
        envelope = _ENVELOPES_CACHE[cluster_name][phase][sensor]
    except KeyError:
        return {
            "alarm_level": "UNKNOWN",
            "drift_score": 0.0,
            "in_envelope": True,
            "percent_outside": 0.0,
        }

    mean = np.array(envelope["mean"])
    upper = np.array(envelope["upper"])
    lower = np.array(envelope["lower"])

    if len(mean) == 0:
        return {
            "alarm_level": "UNKNOWN",
            "drift_score": 0.0,
            "in_envelope": True,
            "percent_outside": 0.0,
        }

    # Resample current_signal to match envelope length
    target_len = len(mean)
    x_orig = np.linspace(0, 1, len(current_signal))
    x_new = np.linspace(0, 1, target_len)
    resampled = np.interp(x_new, x_orig, current_signal)

    # Soft-DTW distance to golden mean
    sdtw_dist = soft_dtw(
        resampled.reshape(-1, 1),
        mean.reshape(-1, 1),
        gamma=1.0,
    )

    # Pointwise envelope check
    outside = np.sum((resampled < lower) | (resampled > upper))
    percent_outside = float(outside) / len(resampled) * 100.0

    # Alarm level
    if percent_outside <= 20:
        alarm_level = "OK"
    elif percent_outside <= 50:
        alarm_level = "WARNING"
    else:
        alarm_level = "CRITICAL"

    return {
        "drift_score": float(sdtw_dist),
        "in_envelope": percent_outside == 0.0,
        "percent_outside": round(percent_outside, 2),
        "alarm_level": alarm_level,
    }


def compare_batch_to_golden(
    batch_id: str,
    cluster_name: str,
    trajectories_dir: str = "data/processed/batch_trajectories",
) -> dict:
    """
    Compare an entire batch against a golden cluster across all phase/sensor combos.

    Returns
    -------
    dict
        batch_id, cluster_name, overall_alarm, phase_reports
    """
    csv_path = os.path.join(_PROJECT_ROOT, trajectories_dir, f"{batch_id}.csv")
    df = pd.read_csv(csv_path)

    phase_reports = {}
    worst_alarm = "OK"
    alarm_order = {"OK": 0, "WARNING": 1, "CRITICAL": 2, "UNKNOWN": -1}

    for phase, sensors in PHASE_SENSOR_MAP.items():
        phase_reports[phase] = {}
        phase_df = df[df["Phase"] == phase]

        for sensor in sensors:
            if len(phase_df) == 0 or sensor not in phase_df.columns:
                phase_reports[phase][sensor] = {
                    "alarm_level": "UNKNOWN",
                    "drift_score": 0.0,
                    "in_envelope": True,
                    "percent_outside": 0.0,
                }
                continue

            signal = phase_df[sensor].values
            result = check_drift(signal, cluster_name, phase, sensor)
            phase_reports[phase][sensor] = result

            # Track worst alarm
            if alarm_order.get(result["alarm_level"], 0) > alarm_order.get(worst_alarm, 0):
                worst_alarm = result["alarm_level"]

    return {
        "batch_id": batch_id,
        "cluster_name": cluster_name,
        "overall_alarm": worst_alarm,
        "phase_reports": phase_reports,
    }


def get_parameter_deviations(current_cpp: dict, cluster_name: str) -> dict:
    """
    Compute percentage deviations of current CPPs from golden centroid.

    Parameters
    ----------
    current_cpp : dict
        {cpp_name: current_value, ...}
    cluster_name : str
        Golden cluster to compare against.

    Returns
    -------
    dict
        {cpp_name: {"current": val, "golden": val, "pct_deviation": float}}
    """
    centroids_path = os.path.join(
        _PROJECT_ROOT, "data", "golden", "cluster_centroids.json"
    )
    with open(centroids_path) as f:
        centroids = json.load(f)

    golden = centroids.get(cluster_name, {})
    deviations = {}

    for cpp in CPP_COLS:
        current_val = current_cpp.get(cpp, 0.0)
        golden_val = golden.get(cpp, 0.0)
        if golden_val != 0:
            pct_dev = (current_val - golden_val) / golden_val * 100.0
        else:
            pct_dev = 0.0

        deviations[cpp] = {
            "current": current_val,
            "golden": golden_val,
            "pct_deviation": round(pct_dev, 2),
        }

    return deviations


if __name__ == "__main__":
    print(f"{'='*60}")
    print(f"  Drift Detector — Quick Test")
    print(f"{'='*60}")

    # Test 1: Simulated signal against golden envelope
    cluster = list(_ENVELOPES_CACHE.keys())[0] if _ENVELOPES_CACHE else "Max Quality Golden"
    phase = "Granulation"
    sensor = "Temperature_C"

    print(f"\n  Test signal vs {cluster} / {phase} / {sensor}")
    np.random.seed(42)
    test_signal = np.random.normal(60, 5, 20)  # simulated temperature readings
    result = check_drift(test_signal, cluster, phase, sensor)
    print(f"    drift_score    : {result['drift_score']:.2f}")
    print(f"    in_envelope    : {result['in_envelope']}")
    print(f"    percent_outside: {result['percent_outside']:.1f}%")
    print(f"    alarm_level    : {result['alarm_level']}")

    # Test 2: Full batch comparison
    print(f"\n  Full batch comparison: T001 vs {cluster}")
    report = compare_batch_to_golden("T001", cluster)
    print(f"    overall_alarm: {report['overall_alarm']}")
    for phase_name, sensors in report["phase_reports"].items():
        for sensor_name, res in sensors.items():
            print(f"    {phase_name}/{sensor_name}: "
                  f"{res['alarm_level']} ({res['percent_outside']:.0f}% outside)")

    # Test 3: Parameter deviations
    print(f"\n  CPP deviations for T001 vs {cluster}:")
    test_cpp = {
        "Granulation_Time": 15, "Binder_Amount": 8.5, "Drying_Temp": 60,
        "Drying_Time": 25, "Compression_Force": 12.5, "Machine_Speed": 150,
        "Lubricant_Conc": 1.0, "Moisture_Content": 2.1,
    }
    devs = get_parameter_deviations(test_cpp, cluster)
    for cpp, d in devs.items():
        print(f"    {cpp:25s}: current={d['current']:.1f}  golden={d['golden']:.1f}  "
              f"dev={d['pct_deviation']:+.1f}%")

    print(f"\n{'='*60}")
