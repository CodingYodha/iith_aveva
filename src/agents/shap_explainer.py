"""
shap_explainer.py — SHAP-based batch explanation engine.
Trains per-target XGBoost models and computes SHAP values for any batch.
"""

import os
import sys
import warnings

import joblib
import numpy as np
import pandas as pd
import shap
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import CPP_COLS, CQA_COLS

_TARGET_COLS = CQA_COLS + ["total_CO2e_kg"]
_MODELS_DIR = os.path.join(_PROJECT_ROOT, "data", "models")
_MASTER_CSV = os.path.join(_PROJECT_ROOT, "data", "processed", "master_dataset.csv")


def _model_path(target: str) -> str:
    return os.path.join(_MODELS_DIR, f"xgb_{target}.pkl")


def _train_and_save_models() -> dict:
    """Train one XGBRegressor per target, save to disk, return dict."""
    os.makedirs(_MODELS_DIR, exist_ok=True)
    df = pd.read_csv(_MASTER_CSV)
    X = df[CPP_COLS]
    models = {}
    for target in _TARGET_COLS:
        if target not in df.columns:
            continue
        y = df[target]
        model = XGBRegressor(
            n_estimators=100, max_depth=5, random_state=42, verbosity=0
        )
        model.fit(X, y)
        path = _model_path(target)
        joblib.dump(model, path)
        models[target] = model
    return models


def _load_models() -> dict:
    """Load saved models or train fresh."""
    models = {}
    missing = False
    for target in _TARGET_COLS:
        path = _model_path(target)
        if os.path.exists(path):
            models[target] = joblib.load(path)
        else:
            missing = True
            break
    if missing:
        models = _train_and_save_models()
    return models


# Lazy-loaded module-level cache
_models_cache: dict | None = None


def _get_models() -> dict:
    global _models_cache
    if _models_cache is None:
        _models_cache = _load_models()
    return _models_cache


def explain_batch(batch_data: dict) -> list[dict]:
    """
    Compute SHAP explanations for a single batch.

    Parameters
    ----------
    batch_data : dict
        Must contain CPP column values, e.g. {"Compression_Force": 12.0, ...}

    Returns
    -------
    list[dict]
        One entry per target with shap_values, top drivers, prediction, base_value.
    """
    models = _get_models()
    # Build feature vector
    x_values = [float(batch_data.get(c, 0.0)) for c in CPP_COLS]
    X = pd.DataFrame([x_values], columns=CPP_COLS)

    results = []
    for target, model in models.items():
        explainer = shap.TreeExplainer(model)
        sv = explainer.shap_values(X)
        shap_row = sv[0] if isinstance(sv, np.ndarray) else sv.values[0]
        base = float(explainer.expected_value)
        prediction = float(model.predict(X)[0])

        shap_dict = {col: round(float(v), 4) for col, v in zip(CPP_COLS, shap_row)}

        # Sort by absolute SHAP value
        sorted_feats = sorted(shap_dict.items(), key=lambda kv: abs(kv[1]), reverse=True)
        top_positive = [(k, v) for k, v in sorted_feats if v > 0][:3]
        top_negative = [(k, v) for k, v in sorted_feats if v < 0][:3]

        results.append({
            "target": target,
            "shap_values": shap_dict,
            "top_positive": top_positive,
            "top_negative": top_negative,
            "prediction": round(prediction, 4),
            "base_value": round(base, 4),
        })

    return results


def predict_batch(batch_data: dict) -> dict:
    """Return predictions only (no SHAP) — faster."""
    models = _get_models()
    x_values = [float(batch_data.get(c, 0.0)) for c in CPP_COLS]
    X = pd.DataFrame([x_values], columns=CPP_COLS)
    return {
        target: round(float(model.predict(X)[0]), 4)
        for target, model in models.items()
    }
