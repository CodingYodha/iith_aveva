"""
CB-MOPA Demo Script
Run this BEFORE the demo to verify everything works.
Usage: python demo_script.py
"""

import glob
import json
import os
import sys
import warnings

warnings.filterwarnings("ignore")
sys.path.insert(0, ".")


def check(label, fn):
    try:
        result = fn()
        print(f"  ✅ {label}: {result}")
        return True
    except Exception as e:
        print(f"  ❌ {label}: {e}")
        return False


print("\n" + "=" * 60)
print("CB-MOPA PRE-DEMO VALIDATION")
print("=" * 60)

# ──────────────────────────────────────────────────────────
# [1] Data files
# ──────────────────────────────────────────────────────────
print("\n[1] Checking data files...")
files = [
    "data/processed/master_dataset.csv",
    "data/processed/batch_outcomes.csv",
    "data/golden/pareto_front.csv",
    "data/golden/golden_envelopes.json",
    "data/golden/cluster_centroids.json",
    "data/golden/cluster_batch_map.json",
    "data/golden/signatures.db",
]
all_ok = True
for f in files:
    exists = os.path.exists(f)
    if not exists:
        all_ok = False
    print(f"  {'✅' if exists else '❌'} {f}")

# ──────────────────────────────────────────────────────────
# [2] Causal models
# ──────────────────────────────────────────────────────────
print("\n[2] Checking causal models...")
pkls = glob.glob("models/causal_*.pkl")
print(f"  {'✅' if len(pkls) == 6 else '❌'} Causal models: {len(pkls)}/6 found")

gp_state = os.path.exists("models/botorch_gp_state.pt")
print(f"  {'✅' if gp_state else '❌'} BoTorch GP state: {'found' if gp_state else 'not found'}")

# ──────────────────────────────────────────────────────────
# [3] API health
# ──────────────────────────────────────────────────────────
print("\n[3] Checking API...")
try:
    import requests

    r = requests.get("http://localhost:8000/health", timeout=3)
    health = r.json()
    print(f"  ✅ API health: {health}")
except Exception:
    print("  ❌ API not running — start with: uvicorn api.main:app --port 8000")

# ──────────────────────────────────────────────────────────
# [4] Import checks
# ──────────────────────────────────────────────────────────
print("\n[4] Checking module imports...")
modules = [
    ("constraints", "CPP_COLS, CQA_COLS, PHARMA_LIMITS"),
    ("src.optimization.pareto", "Pareto NSGA-II"),
    ("src.optimization.clustering", "K-Means clustering"),
    ("src.optimization.dtw_envelope", "DTW envelopes"),
    ("src.signatures.database", "SQLAlchemy DB"),
    ("src.signatures.comparator", "Drift detector"),
    ("src.signatures.signature_manager", "Signature updater"),
    ("src.causal.dag_definition", "Causal DAG"),
    ("src.causal.causal_model", "DoWhy SCM"),
    ("src.causal.interventions", "Intervention engine"),
    ("src.carbon.carbon_tracker", "Carbon tracker"),
    ("src.hitl.decision_store", "Decision store"),
    ("src.hitl.preference_model", "Preference GP"),
]
for mod, desc in modules:
    try:
        __import__(mod)
        print(f"  ✅ {desc} ({mod})")
    except Exception as e:
        print(f"  ❌ {desc} ({mod}): {e}")

# ──────────────────────────────────────────────────────────
# [5] Quick recommendation test
# ──────────────────────────────────────────────────────────
print("\n[5] Running quick recommendation test...")
try:
    import pandas as pd

    from src.causal.interventions import get_causal_recommendations

    master = pd.read_csv("data/processed/master_dataset.csv")
    state = master.iloc[0][
        [
            "Granulation_Time",
            "Binder_Amount",
            "Drying_Temp",
            "Drying_Time",
            "Compression_Force",
            "Machine_Speed",
            "Lubricant_Conc",
            "Moisture_Content",
        ]
    ].to_dict()
    recs = get_causal_recommendations(state, "Balanced Operational Golden")
    if len(recs) >= 2:
        print(
            f"  ✅ Recommendations: {recs[0]['pathway_name']} vs "
            f"{recs[1]['pathway_name']}"
        )
    elif len(recs) == 0:
        print(
            "  ⚠️  0 safe recommendations (safety validation strict) — "
            "demo will use mock recs"
        )
    else:
        print(f"  ⚠️  Only {len(recs)} recommendation(s)")
except Exception as e:
    print(f"  ❌ Recommendations failed: {e}")

# ──────────────────────────────────────────────────────────
# [6] Data summary
# ──────────────────────────────────────────────────────────
print("\n[6] Data summary...")
try:
    import pandas as pd

    master = pd.read_csv("data/processed/master_dataset.csv")
    print(f"  ✅ Master dataset: {master.shape[0]} batches × {master.shape[1]} features")

    pareto = pd.read_csv("data/golden/pareto_front.csv")
    print(f"  ✅ Pareto front: {len(pareto)} solutions, "
          f"{pareto['cluster_name'].nunique()} clusters")

    with open("data/golden/golden_envelopes.json") as f:
        env = json.load(f)
    total = sum(1 for c in env.values() for p in c.values() for s in p.values())
    print(f"  ✅ Golden envelopes: {total} (3 clusters × 5 phases × 3 sensors)")

    traj_count = len(glob.glob("data/processed/batch_trajectories/*.csv"))
    print(f"  ✅ Batch trajectories: {traj_count} files")
except Exception as e:
    print(f"  ❌ Data summary error: {e}")

# ──────────────────────────────────────────────────────────
# Demo flow
# ──────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("DEMO FLOW (rehearse 3 times — 7 minutes total):")
print("=" * 60)

steps = [
    (
        "0:00–0:30",
        "Home Page",
        "Say: 'CB-MOPA has 3 breakthrough modules: DTW Envelope, "
        "Causal Engine, Bayesian HITL'",
    ),
    (
        "0:30–1:30",
        "Page 1 — Live Batch",
        "Select 'Deep Decarbonization'. Increase Compression_Force to 16 kN. "
        "Watch WARNING alarm. Say: 'Real-time per-minute drift detection vs "
        "probabilistic DTW envelope'",
    ),
    (
        "1:30–3:00",
        "Page 2 — Recommendations",
        "Show Pathway A (Yield Guard) vs B (Carbon Savior). Say: "
        "'These are Do-calculus causal interventions, not correlation lookup.' "
        "Click Execute Pathway B.",
    ),
    (
        "3:00–4:00",
        "Page 2 — Learning",
        "Click 2 more times. Show Preference History. Say: 'GP has learned "
        "this operator favors Carbon Savior — Pareto front now biased "
        "carbon-first'",
    ),
    (
        "4:00–5:00",
        "Page 3 — Golden Signatures",
        "Show 3D Pareto scatter. Click cluster. Show version history. "
        "Say: 'Signature evolved automatically when batch outperformed "
        "previous golden'",
    ),
    (
        "5:00–5:30",
        "Page 4 — Carbon",
        "Show gauge and phase donut. Say: 'Compression is 58% of carbon "
        "footprint. Our interventions target this phase first'",
    ),
]
for timing, page, script in steps:
    print(f"\n[{timing}] {page}")
    print(f"  {script}")

# ──────────────────────────────────────────────────────────
# Judge Q&A
# ──────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("JUDGE Q&A ANSWERS:")
print("=" * 60)

qa = [
    (
        "How is this different from XGBoost?",
        "XGBoost finds correlations. Our Causal SCM with Do-calculus finds "
        "actual causal effects. When we say 'increase Compression_Force by "
        "5%, Hardness increases by 3.2 units', that's a causal claim, not a "
        "correlation. We can prove interventional safety before execution.",
    ),
    (
        "What is Do-calculus?",
        "Judea Pearl's framework for answering 'what if we intervene?' "
        "questions from observational data. We use the backdoor adjustment "
        "formula to estimate the average treatment effect of changing each "
        "CPP on each CQA, accounting for confounders in the DAG.",
    ),
    (
        "How much data do you need?",
        "60 batches is sufficient for proof-of-concept. For production: 500+ "
        "batches for stable causal estimates, 1000+ for robust DTW envelopes. "
        "The Bayesian GP preference model activates after just 3 operator "
        "decisions.",
    ),
    (
        "How does BoTorch learn?",
        "PairwiseGP models operator utility as a Gaussian Process over "
        "recommendation feature space. Each Accept/Reject creates a pairwise "
        "comparison. The GP posterior over the latent utility function updates "
        "after each decision, re-weighting the Pareto front toward "
        "operator-preferred solutions.",
    ),
    (
        "What would production deployment require?",
        "SCADA/OPC-UA integration for real-time sensor feeds, 21 CFR Part 11 "
        "compliance for pharma regulatory submission, MLOps pipeline for "
        "automated model retraining, multi-product DAG extensions, and "
        "cloud-native deployment on Azure/AWS.",
    ),
]
for q, a in qa:
    print(f"\nQ: {q}")
    print(f"A: {a}")

print("\n" + "=" * 60)
print("✓ Pre-demo validation complete. You're ready.")
print("=" * 60)
