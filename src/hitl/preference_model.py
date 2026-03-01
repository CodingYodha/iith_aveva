"""
preference_model.py — BoTorch PairwiseGP preference learning.
Learns operator's latent utility function from pairwise A/B choices,
then re-weights recommendations toward preferred styles.
"""

import os
import sys
import warnings

import torch

warnings.filterwarnings("ignore")

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import CPP_COLS


# ---------------------------------------------------------------------------
# Feature encoding
# ---------------------------------------------------------------------------
def encode_pathway(pathway: dict) -> torch.Tensor:
    """
    Convert a recommendation pathway dict into a 12-dim float tensor.

    Features (in order):
        0-7:  delta_pct for each CPP in CPP_COLS order (0.0 if not the param)
        8:    expected hardness change
        9:    expected dissolution change
        10:   expected friability change
        11:   expected CO2 change

    All normalized to [-1, 1] range.

    Returns
    -------
    torch.Tensor
        Shape (12,), dtype float64.
    """
    features = []

    # CPP delta features (8)
    param_name = pathway.get("param", "")
    delta_pct = pathway.get("delta_pct", 0.0)
    for cpp in CPP_COLS:
        if cpp == param_name:
            features.append(delta_pct / 10.0)  # normalize ±10% → ±1
        else:
            features.append(0.0)

    # Causal effect features (4)
    effects = pathway.get("causal_effects", {})
    features.append(effects.get("Hardness", 0.0))           # 8
    features.append(effects.get("Dissolution_Rate", 0.0))   # 9
    features.append(effects.get("Friability", 0.0))          # 10
    features.append(pathway.get("expected_co2_change", 0.0)) # 11

    # Clamp to [-1, 1]
    features = [max(-1.0, min(1.0, f)) for f in features]

    return torch.tensor(features, dtype=torch.float64)


# ---------------------------------------------------------------------------
# Preference Model
# ---------------------------------------------------------------------------
class PreferenceModel:
    """BoTorch PairwiseGP preference learner."""

    def __init__(self):
        self.model = None
        self.datapoints = []       # list of torch.Tensor (d,)
        self.comparisons = []      # list of [chosen_idx, rejected_idx]

    def add_comparison(self, chosen_pathway: dict, rejected_pathway: dict):
        """
        Add a pairwise comparison: operator preferred chosen over rejected.
        """
        chosen_enc = encode_pathway(chosen_pathway)
        rejected_enc = encode_pathway(rejected_pathway)

        chosen_idx = len(self.datapoints)
        self.datapoints.append(chosen_enc)

        rejected_idx = len(self.datapoints)
        self.datapoints.append(rejected_enc)

        self.comparisons.append([chosen_idx, rejected_idx])

    def fit(self):
        """
        Fit the PairwiseGP model on accumulated comparisons.
        Requires at least 3 comparisons to avoid degeneracy.
        """
        if len(self.comparisons) < 3:
            print(f"  Cold start — need 3+ comparisons "
                  f"(have {len(self.comparisons)})")
            return

        from botorch.fit import fit_gpytorch_mll
        from botorch.models.pairwise_gp import (
            PairwiseGP,
            PairwiseLaplaceMarginalLogLikelihood,
        )

        # Stack datapoints: shape (1, n, d) — batch_shape=1
        datapoints_t = torch.stack(self.datapoints).unsqueeze(0)

        # Comparisons: shape (m, 2) — no batch dim needed
        comparisons_t = torch.tensor(self.comparisons, dtype=torch.long)

        # Create and fit model
        self.model = PairwiseGP(datapoints_t, comparisons_t)
        mll = PairwiseLaplaceMarginalLogLikelihood(
            self.model.likelihood, self.model
        )
        fit_gpytorch_mll(mll)

        print(f"  ✓ PairwiseGP fitted: {len(self.datapoints)} datapoints, "
              f"{len(self.comparisons)} comparisons")

    def predict_utility(self, pathway: dict) -> float:
        """
        Predict utility score for a pathway.
        Returns 0.5 (neutral) during cold start.
        """
        if self.model is None:
            return 0.5

        encoded = encode_pathway(pathway)
        # Shape: (1, 1, d) — batch_shape x q x d
        x = encoded.unsqueeze(0).unsqueeze(0)

        with torch.no_grad():
            posterior = self.model.posterior(x)
            utility = posterior.mean.item()

        return utility

    def save_state(self, path: str = "models/botorch_gp_state.pt"):
        """Persist datapoints and comparisons for reload."""
        full_path = os.path.join(_PROJECT_ROOT, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        torch.save(
            {
                "datapoints": self.datapoints,
                "comparisons": self.comparisons,
            },
            full_path,
        )
        print(f"  Saved state → {full_path}")

    def load_state(self, path: str = "models/botorch_gp_state.pt"):
        """Load saved state and refit model."""
        full_path = os.path.join(_PROJECT_ROOT, path)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"No saved state at {full_path}")

        state = torch.load(full_path)
        self.datapoints = state["datapoints"]
        self.comparisons = state["comparisons"]

        if len(self.comparisons) >= 3:
            self.fit()
        else:
            print(f"  Loaded {len(self.comparisons)} comparisons (cold start)")


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------
preference_model = PreferenceModel()
try:
    preference_model.load_state()
except (FileNotFoundError, Exception):
    pass  # No saved state yet — cold start


if __name__ == "__main__":
    print(f"{'='*60}")
    print(f"  BoTorch PairwiseGP Preference Model — Test")
    print(f"{'='*60}")

    pm = PreferenceModel()

    # Create mock pathways
    def make_pathway(param, delta, hardness_eff, diss_eff, fria_eff, co2_eff, name):
        return {
            "param": param,
            "delta_pct": delta,
            "causal_effects": {
                "Hardness": hardness_eff,
                "Dissolution_Rate": diss_eff,
                "Friability": fria_eff,
            },
            "expected_co2_change": co2_eff,
            "pathway_name": name,
        }

    # Quality-focused pathways (A) vs carbon-focused (B)
    a1 = make_pathway("Compression_Force", +10, 0.15, 0.08, -0.12, 0.05, "Yield Guard")
    b1 = make_pathway("Machine_Speed", -10, 0.02, 0.01, -0.01, -0.25, "Carbon Savior")

    a2 = make_pathway("Binder_Amount", +5, 0.10, 0.06, -0.08, 0.02, "Yield Guard")
    b2 = make_pathway("Drying_Temp", -5, 0.03, 0.02, -0.02, -0.15, "Carbon Savior")

    a3 = make_pathway("Granulation_Time", +10, 0.12, 0.09, -0.10, 0.04, "Yield Guard")
    b3 = make_pathway("Drying_Time", -10, 0.01, 0.01, -0.01, -0.20, "Carbon Savior")

    a4 = make_pathway("Lubricant_Conc", -5, 0.08, 0.05, -0.06, 0.01, "Yield Guard")
    b4 = make_pathway("Machine_Speed", -5, 0.02, 0.02, -0.02, -0.10, "Carbon Savior")

    # Simulate operator preferring quality (A) over carbon (B) consistently
    print("\n  Adding 4 comparisons (operator prefers quality)...")
    pm.add_comparison(a1, b1)
    pm.add_comparison(a2, b2)
    pm.add_comparison(a3, b3)
    pm.add_comparison(a4, b4)

    print(f"  Datapoints: {len(pm.datapoints)}, Comparisons: {len(pm.comparisons)}")

    # Fit
    print("\n  Fitting PairwiseGP...")
    pm.fit()

    # Predict
    print("\n  Utility predictions:")
    for name, pw in [("Yield Guard (quality)", a1), ("Carbon Savior (carbon)", b1)]:
        utility = pm.predict_utility(pw)
        print(f"    {name:35s}: utility = {utility:.4f}")

    # Save state
    pm.save_state()

    print(f"\n{'='*60}")
