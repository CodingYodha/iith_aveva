"""
carbon_tracker.py — Real-time CO2e tracking with adaptive dynamic targets.
Tracks per-batch and per-phase carbon emissions, implements target tightening
when performance is consistently good.
"""

import json
import os
import sys
from datetime import datetime

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from constraints import CARBON_CONFIG


class CarbonTracker:
    """Real-time CO2e tracker with adaptive target setting."""

    def __init__(self, baseline_emission_factor: float = 0.72):
        self.baseline_factor = baseline_emission_factor
        self.current_factor = baseline_emission_factor
        self._targets_path = os.path.join(
            _PROJECT_ROOT, "data", "golden", "targets.json"
        )
        self._targets = self._load_targets()

    # ------------------------------------------------------------------
    # Target persistence
    # ------------------------------------------------------------------
    def _load_targets(self) -> dict:
        """Load target history from JSON, create if not found."""
        if os.path.exists(self._targets_path):
            with open(self._targets_path) as f:
                return json.load(f)
        else:
            initial = {
                "current_target_kg": CARBON_CONFIG["regulatory_limit_kg"],
                "baseline_kg": CARBON_CONFIG["regulatory_limit_kg"],
                "regulatory_limit_kg": CARBON_CONFIG["regulatory_limit_kg"],
                "history": [],
            }
            self._save_targets(initial)
            return initial

    def _save_targets(self, targets: dict):
        """Persist targets to JSON."""
        os.makedirs(os.path.dirname(self._targets_path), exist_ok=True)
        with open(self._targets_path, "w") as f:
            json.dump(targets, f, indent=2)

    # ------------------------------------------------------------------
    # Core computation
    # ------------------------------------------------------------------
    def compute_batch_carbon(
        self, energy_kwh: float, emission_factor: float = None
    ) -> float:
        """Compute CO2e for a batch in kg."""
        factor = emission_factor if emission_factor is not None else self.current_factor
        return energy_kwh * factor

    def compute_phase_carbon(self, phase_energy_dict: dict) -> dict:
        """
        Compute CO2e per phase.

        Parameters
        ----------
        phase_energy_dict : dict
            {phase_name: energy_kwh, ...}

        Returns
        -------
        dict
            {phase_name: co2e_kg, ...}
        """
        return {
            phase: energy * self.current_factor
            for phase, energy in phase_energy_dict.items()
        }

    def set_shift_emission_factor(self, factor: float):
        """Update current shift emission factor (e.g., 0.45 for night/renewable)."""
        self.current_factor = factor

    # ------------------------------------------------------------------
    # Rolling average
    # ------------------------------------------------------------------
    def get_rolling_average(
        self, batch_carbon_history: list, window: int = 5
    ) -> float:
        """Rolling mean of last `window` CO2e values."""
        if not batch_carbon_history:
            return 0.0
        recent = batch_carbon_history[-window:]
        return sum(recent) / len(recent)

    # ------------------------------------------------------------------
    # Target checking
    # ------------------------------------------------------------------
    def check_against_target(
        self, current_co2e: float, target_co2e: float
    ) -> dict:
        """
        Check current emission against target.

        Returns
        -------
        dict
            status: "UNDER" | "OVER" | "AT_RISK"
            pct_of_target: float
            headroom_kg: float
        """
        if target_co2e <= 0:
            return {
                "status": "OVER",
                "pct_of_target": 100.0,
                "headroom_kg": 0.0,
            }

        pct = (current_co2e / target_co2e) * 100.0
        headroom = target_co2e - current_co2e

        if current_co2e > target_co2e:
            status = "OVER"
        elif pct >= 90.0:  # within 10% of target
            status = "AT_RISK"
        else:
            status = "UNDER"

        return {
            "status": status,
            "pct_of_target": round(pct, 2),
            "headroom_kg": round(headroom, 2),
        }

    # ------------------------------------------------------------------
    # Dynamic target setting
    # ------------------------------------------------------------------
    def compute_dynamic_target(self, batch_history: list) -> float:
        """
        Adaptive target: tighten when consistently beating target,
        loosen when exceeding it.

        Rules:
        - Last 5 batches beat target by >15% → tighten by 5%
        - Any of last 5 exceed target → loosen by 2%
        - Otherwise → no change

        Returns
        -------
        float
            New target value in kg CO2e.
        """
        current_target = self._targets["current_target_kg"]

        if len(batch_history) < 5:
            return current_target

        last_5 = batch_history[-5:]
        reason = None
        new_target = current_target

        # Check if any batch exceeded target
        any_over = any(co2e > current_target for co2e in last_5)

        if any_over:
            # Loosen by 2%
            new_target = current_target * 1.02
            reason = "Loosened +2%: batch exceeded target in last 5"
        else:
            # Check if all beat target by >15%
            all_beating = all(
                co2e < current_target * 0.85 for co2e in last_5
            )
            if all_beating:
                # Tighten by 5%
                new_target = current_target * 0.95
                reason = "Tightened -5%: last 5 batches beat target by >15%"

        if reason:
            # Don't go below 50% of regulatory limit or above regulatory limit
            reg_limit = self._targets["regulatory_limit_kg"]
            new_target = max(reg_limit * 0.5, min(reg_limit, new_target))

            # Log change
            self._targets["history"].append({
                "timestamp": datetime.utcnow().isoformat(),
                "old_target": round(current_target, 2),
                "new_target": round(new_target, 2),
                "reason": reason,
                "last_5_co2e": [round(v, 2) for v in last_5],
            })
            self._targets["current_target_kg"] = round(new_target, 2)
            self._save_targets(self._targets)

        return new_target

    # ------------------------------------------------------------------
    # Current state
    # ------------------------------------------------------------------
    def get_current_targets(self) -> dict:
        """Return current target configuration."""
        current = self._targets["current_target_kg"]
        baseline = self._targets["baseline_kg"]
        reduction_pct = (
            (baseline - current) / baseline * 100 if baseline > 0 else 0
        )

        return {
            "current_target_kg": current,
            "baseline_kg": baseline,
            "reduction_pct": round(reduction_pct, 2),
            "regulatory_limit_kg": self._targets["regulatory_limit_kg"],
        }


# Module-level singleton
carbon_tracker = CarbonTracker()


if __name__ == "__main__":
    import numpy as np

    print(f"{'='*60}")
    print(f"  Carbon Tracker — Dynamic Target Simulation")
    print(f"{'='*60}")

    tracker = CarbonTracker()

    # Simulate 10 batches with varying energy
    np.random.seed(42)
    energies = np.random.normal(85, 15, 10)  # kWh per batch
    batch_history = []

    print(f"\n  Initial targets: {tracker.get_current_targets()}")
    print(f"\n  {'Batch':>6}  {'Energy':>8}  {'CO2e':>8}  {'Target':>8}  {'Status':>8}  {'Headroom':>9}")
    print(f"  {'-'*55}")

    for i, energy in enumerate(energies):
        co2e = tracker.compute_batch_carbon(energy)
        batch_history.append(co2e)

        target = tracker.get_current_targets()["current_target_kg"]
        check = tracker.check_against_target(co2e, target)

        print(f"  B{i+1:03d}   {energy:8.2f}  {co2e:8.2f}  {target:8.2f}  "
              f"{check['status']:>8}  {check['headroom_kg']:+9.2f}")

        # Update dynamic target after each batch
        new_target = tracker.compute_dynamic_target(batch_history)

    # Show rolling average
    rolling = tracker.get_rolling_average(batch_history, window=5)
    print(f"\n  Rolling avg (last 5): {rolling:.2f} kg CO2e")

    # Show phase carbon for sample
    phase_energy = {
        "Granulation": 5.2,
        "Drying": 12.8,
        "Milling": 8.1,
        "Compression": 35.0,
        "Coating": 7.5,
    }
    phase_co2 = tracker.compute_phase_carbon(phase_energy)
    print(f"\n  Phase-level CO2e (sample):")
    for phase, co2e in phase_co2.items():
        print(f"    {phase:20s}: {co2e:.2f} kg")

    # Night shift simulation
    print(f"\n  Night shift (renewable 0.45 factor):")
    tracker.set_shift_emission_factor(0.45)
    night_co2 = tracker.compute_batch_carbon(85.0)
    print(f"    Same energy (85 kWh) → {night_co2:.2f} kg CO2e vs "
          f"{85.0 * 0.72:.2f} kg (day shift)")

    # Final targets
    print(f"\n  Final targets: {tracker.get_current_targets()}")

    # Target history
    targets = tracker._targets
    if targets["history"]:
        print(f"\n  Target change history:")
        for h in targets["history"]:
            print(f"    {h['old_target']} → {h['new_target']}: {h['reason']}")

    print(f"\n{'='*60}")
