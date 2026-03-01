"""
decision_store.py — HITL (Human-in-the-Loop) decision persistence.
Logs every operator interaction: pathway chosen, rejected, modifications,
and resulting batch outcomes. Forms training data for preference models.
"""

import json
import os
import sys
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from src.signatures.database import Base, engine, get_session, init_db


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class OperatorDecision(Base):
    __tablename__ = "operator_decision"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    batch_id = Column(String, nullable=False)
    recommended_pathway_a_json = Column(Text, nullable=False)
    recommended_pathway_b_json = Column(Text, nullable=False)
    chosen_pathway = Column(String, nullable=False)  # "A", "B", "MODIFIED", "REJECTED"
    modified_params_json = Column(Text, nullable=True)
    operator_id = Column(String, default="shift_supervisor")
    reason_text = Column(Text, default="")
    target_config = Column(String, nullable=False)
    resulting_batch_id = Column(String, nullable=True)

    def __repr__(self):
        return (
            f"<OperatorDecision(id={self.id}, batch={self.batch_id}, "
            f"chosen={self.chosen_pathway})>"
        )


class OperatorOutcome(Base):
    __tablename__ = "operator_outcome"

    id = Column(Integer, primary_key=True, autoincrement=True)
    decision_id = Column(
        Integer, ForeignKey("operator_decision.id"), nullable=False
    )
    actual_cqa_json = Column(Text, nullable=False)
    improved_over_recommendation = Column(Boolean, nullable=False)
    improvement_delta_json = Column(Text, nullable=False)

    def __repr__(self):
        return (
            f"<OperatorOutcome(id={self.id}, decision={self.decision_id}, "
            f"improved={self.improved_over_recommendation})>"
        )


# ---------------------------------------------------------------------------
# Functions
# ---------------------------------------------------------------------------
def log_decision(
    batch_id: str,
    pathway_a: dict,
    pathway_b: dict,
    chosen: str,
    modified: dict = None,
    reason: str = "",
    target_config: str = "Balanced Operational Golden",
) -> int:
    """
    Log an operator decision to the database.

    Parameters
    ----------
    batch_id : str
        Current batch being optimized.
    pathway_a : dict
        Yield Guard recommendation.
    pathway_b : dict
        Carbon Savior recommendation.
    chosen : str
        "A", "B", "MODIFIED", or "REJECTED".
    modified : dict or None
        Modified parameters if chosen == "MODIFIED".
    reason : str
        Operator's reason for the choice.
    target_config : str
        Golden cluster target used.

    Returns
    -------
    int
        The decision_id of the inserted record.
    """
    with get_session() as session:
        decision = OperatorDecision(
            batch_id=batch_id,
            recommended_pathway_a_json=json.dumps(pathway_a),
            recommended_pathway_b_json=json.dumps(pathway_b),
            chosen_pathway=chosen,
            modified_params_json=json.dumps(modified) if modified else None,
            reason_text=reason,
            target_config=target_config,
        )
        session.add(decision)
        session.commit()
        decision_id = decision.id
    return decision_id


def log_outcome(
    decision_id: int, actual_cqas: dict, recommendation_cqas: dict
) -> None:
    """
    Log the actual outcome of a decision and whether it improved.

    Uses Pareto dominance to check improvement.
    """
    from src.signatures.signature_manager import dominates

    improved = dominates(actual_cqas, recommendation_cqas)

    # Compute deltas
    delta = {}
    for key in actual_cqas:
        if key in recommendation_cqas:
            delta[key] = round(actual_cqas[key] - recommendation_cqas[key], 4)

    with get_session() as session:
        outcome = OperatorOutcome(
            decision_id=decision_id,
            actual_cqa_json=json.dumps(actual_cqas),
            improved_over_recommendation=improved,
            improvement_delta_json=json.dumps(delta),
        )
        session.add(outcome)
        session.commit()


def get_decision_history(limit: int = 50) -> list:
    """
    Get recent operator decisions.

    Returns
    -------
    list[dict]
        List of decision dicts, most recent first.
    """
    with get_session() as session:
        rows = (
            session.query(OperatorDecision)
            .order_by(OperatorDecision.timestamp.desc())
            .limit(limit)
            .all()
        )
        result = []
        for r in rows:
            result.append({
                "id": r.id,
                "timestamp": str(r.timestamp) if r.timestamp else None,
                "batch_id": r.batch_id,
                "pathway_a": json.loads(r.recommended_pathway_a_json),
                "pathway_b": json.loads(r.recommended_pathway_b_json),
                "chosen_pathway": r.chosen_pathway,
                "modified_params": (
                    json.loads(r.modified_params_json)
                    if r.modified_params_json
                    else None
                ),
                "operator_id": r.operator_id,
                "reason_text": r.reason_text,
                "target_config": r.target_config,
                "resulting_batch_id": r.resulting_batch_id,
            })
        return result


def get_preference_training_data() -> list:
    """
    Extract pairwise preference data from A/B decisions for BoTorch.

    Returns
    -------
    list[tuple]
        [(preferred_option_dict, rejected_option_dict), ...]
        Only includes decisions where chosen was "A" or "B".
    """
    with get_session() as session:
        rows = (
            session.query(OperatorDecision)
            .filter(OperatorDecision.chosen_pathway.in_(["A", "B"]))
            .all()
        )
        pairs = []
        for r in rows:
            a = json.loads(r.recommended_pathway_a_json)
            b = json.loads(r.recommended_pathway_b_json)

            if r.chosen_pathway == "A":
                pairs.append((a, b))  # A preferred over B
            else:
                pairs.append((b, a))  # B preferred over A

        return pairs


if __name__ == "__main__":
    # Ensure tables exist
    Base.metadata.create_all(engine)
    print(f"{'='*60}")
    print(f"  HITL Decision Store — Test")
    print(f"{'='*60}")

    # Test pathway dicts
    pathway_a = {
        "param": "Drying_Temp",
        "old_value": 60.0,
        "new_value": 54.0,
        "delta_pct": -10.0,
        "pathway_name": "Yield Guard",
        "causal_effects": {"Hardness": 0.08, "Friability": -0.10},
        "expected_co2_change": -0.14,
        "safety_check": "PASS",
    }
    pathway_b = {
        "param": "Machine_Speed",
        "old_value": 150.0,
        "new_value": 135.0,
        "delta_pct": -10.0,
        "pathway_name": "Carbon Savior",
        "causal_effects": {"Hardness": 0.02, "Friability": -0.03},
        "expected_co2_change": -0.25,
        "safety_check": "PASS",
    }

    # Log a decision
    print("\n  Logging test decision...")
    decision_id = log_decision(
        batch_id="T001",
        pathway_a=pathway_a,
        pathway_b=pathway_b,
        chosen="A",
        reason="Quality is priority for this batch",
        target_config="Balanced Operational Golden",
    )
    print(f"  Decision logged: id={decision_id}")

    # Log an outcome
    actual = {
        "Hardness": 96.0,
        "Friability": 0.55,
        "Dissolution_Rate": 90.0,
        "Disintegration_Time": 7.5,
        "total_CO2e_kg": 52.0,
    }
    rec = {
        "Hardness": 95.08,
        "Friability": 0.55,
        "Dissolution_Rate": 89.33,
        "Disintegration_Time": 7.12,
        "total_CO2e_kg": 55.11,
    }
    print("  Logging test outcome...")
    log_outcome(decision_id, actual, rec)

    # Retrieve history
    history = get_decision_history(limit=5)
    print(f"\n  Decision history ({len(history)} entries):")
    for h in history:
        print(f"    id={h['id']}  batch={h['batch_id']}  "
              f"chosen={h['chosen_pathway']}  config={h['target_config']}")

    # Preference training data
    pref_data = get_preference_training_data()
    print(f"\n  Preference training pairs: {len(pref_data)}")
    if pref_data:
        preferred, rejected = pref_data[0]
        print(f"    Preferred: {preferred['pathway_name']}")
        print(f"    Rejected:  {rejected['pathway_name']}")

    print(f"\n{'='*60}")
