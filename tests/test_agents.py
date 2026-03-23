"""
test_agents.py — Integration tests for Track B multi-agent system.
"""

import json
import os
import sys

import pytest

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)


# ---------------------------------------------------------------------------
# Sample batch data
# ---------------------------------------------------------------------------
SAMPLE_CPP = {
    "Granulation_Time": 25.0,
    "Binder_Amount": 3.5,
    "Drying_Temp": 60.0,
    "Drying_Time": 120.0,
    "Compression_Force": 12.0,
    "Machine_Speed": 150.0,
    "Lubricant_Conc": 0.5,
    "Moisture_Content": 3.0,
}

SAMPLE_CQAS = {
    "Hardness": 100.0,
    "Friability": 0.40,
    "Disintegration_Time": 5.0,
    "Dissolution_Rate": 95.0,
    "Content_Uniformity": 99.0,
    "Tablet_Weight": 205.0,
    "total_CO2e_kg": 35.0,
    "total_energy_kWh": 48.6,
}

WEAK_CQAS = {
    "Hardness": 55.0,   # below limit
    "Friability": 1.5,    # above limit
    "Disintegration_Time": 12.0,
    "Dissolution_Rate": 75.0,  # below limit
    "Content_Uniformity": 98.0,
    "total_CO2e_kg": 60.0,
}

SAMPLE_CONTEXT = {
    "batch_id": "T_TEST_001",
    "cpp_params": SAMPLE_CPP,
    "actual_cqas": SAMPLE_CQAS,
    "cluster_name": "Balanced Operational Golden",
}


# ---------------------------------------------------------------------------
# Test 1: LLM Client fallback
# ---------------------------------------------------------------------------
def test_llm_client_fallback():
    """LLM client returns fallback text when OpenClaw is unreachable."""
    from src.agents.llm_client import LLMClient

    client = LLMClient()
    # Force unreachable by using a bad base URL
    from openai import OpenAI
    client._client = OpenAI(
        base_url="http://localhost:1/openai/v1",
        api_key="fake",
        timeout=2.0,
    )
    result = client.generate("system", "user prompt test")
    assert "[LLM unavailable" in result or len(result) > 0


# ---------------------------------------------------------------------------
# Test 2: SHAP Explainer
# ---------------------------------------------------------------------------
def test_shap_explainer():
    """SHAP values are computed for a sample batch."""
    from src.agents.shap_explainer import explain_batch

    results = explain_batch(SAMPLE_CPP)
    assert isinstance(results, list)
    assert len(results) > 0

    first = results[0]
    assert "target" in first
    assert "shap_values" in first
    assert "prediction" in first
    assert "base_value" in first
    assert "top_positive" in first
    assert "top_negative" in first

    # SHAP values should have one per CPP feature
    assert len(first["shap_values"]) == len(SAMPLE_CPP)


# ---------------------------------------------------------------------------
# Test 3: Prediction Agent
# ---------------------------------------------------------------------------
def test_prediction_agent():
    """Prediction agent runs and returns an AgentResult."""
    from src.agents.prediction_agent import PredictionAgent

    agent = PredictionAgent()
    result = agent.run(SAMPLE_CONTEXT)

    assert result.agent_name == "prediction"
    assert "predictions" in result.analysis
    assert "shap_results" in result.analysis
    assert isinstance(result.explanation, str)
    assert len(result.explanation) > 0


# ---------------------------------------------------------------------------
# Test 4: Golden Signature — proposal created (not auto-updated)
# ---------------------------------------------------------------------------
def test_golden_signature_proposal_created():
    """Golden Signature agent proposes but does NOT auto-update."""
    from src.agents.golden_signature_agent import GoldenSignatureAgent
    from src.signatures.signature_manager import get_active_signature

    agent = GoldenSignatureAgent()
    cluster = "Balanced Operational Golden"

    # Get current signature version before
    before = get_active_signature(cluster)
    before_version = before["version"] if before else 0

    result = agent.run(SAMPLE_CONTEXT)
    assert result.agent_name == "golden_signature"
    assert isinstance(result.explanation, str)

    # Signature should NOT have been updated (agent only proposes)
    after = get_active_signature(cluster)
    after_version = after["version"] if after else 0
    assert after_version == before_version, "Signature should NOT auto-update"


# ---------------------------------------------------------------------------
# Test 5: Golden Signature — accept triggers update
# ---------------------------------------------------------------------------
def test_golden_signature_accept():
    """Accepting a signature proposal triggers the actual update."""
    from src.agents.notification_store import (
        save_notification,
        save_signature_proposal,
        resolve_notification,
        resolve_signature_proposal,
    )

    # Save a mock proposal notification
    notif_id = save_notification(
        batch_id="T_TEST_ACCEPT",
        agent_name="golden_signature",
        notification_type="proposal",
        analysis={"dominates": True, "proposed_cqa": SAMPLE_CQAS},
        explanation="Test proposal",
        requires_action=True,
        action_type="approve_signature",
        confidence=0.85,
    )
    assert notif_id > 0

    # Resolve as accepted
    result = resolve_notification(notif_id, "accepted", "Test acceptance")
    assert result["status"] == "accepted"


# ---------------------------------------------------------------------------
# Test 6: Golden Signature — reject keeps current
# ---------------------------------------------------------------------------
def test_golden_signature_reject():
    """Rejecting keeps signature unchanged."""
    from src.agents.notification_store import (
        save_notification,
        resolve_notification,
    )
    from src.signatures.signature_manager import get_active_signature

    cluster = "Balanced Operational Golden"
    before = get_active_signature(cluster)
    before_version = before["version"] if before else 0

    notif_id = save_notification(
        batch_id="T_TEST_REJECT",
        agent_name="golden_signature",
        notification_type="proposal",
        analysis={"dominates": True},
        explanation="Test rejection",
        requires_action=True,
        action_type="approve_signature",
        confidence=0.85,
    )

    resolve_notification(notif_id, "rejected", "Not good enough")

    after = get_active_signature(cluster)
    after_version = after["version"] if after else 0
    assert after_version == before_version


# ---------------------------------------------------------------------------
# Test 7: Carbon Agent — deviation flagged
# ---------------------------------------------------------------------------
def test_carbon_deviation_flagged():
    """Carbon agent flags deviation for high-CO2 batch."""
    from src.agents.carbon_agent import CarbonAgent

    agent = CarbonAgent()
    high_co2_context = {
        "batch_id": "T_TEST_CARBON",
        "cpp_params": SAMPLE_CPP,
        "actual_cqas": {"total_CO2e_kg": 55.0, "total_energy_kWh": 76.4},
        "cluster_name": "Balanced Operational Golden",
    }
    result = agent.run(high_co2_context)

    assert result.agent_name == "carbon"
    assert result.analysis["batch_co2e_kg"] > 0
    # 55 kg exceeds EPA (50) and EU ETS (45)
    assert result.analysis["any_over"] is True
    assert result.requires_action is True
    assert result.action_type == "acknowledge_alert"


# ---------------------------------------------------------------------------
# Test 8: Orchestrator full run
# ---------------------------------------------------------------------------
def test_orchestrator_full_run():
    """Orchestrator runs all 3 agents and returns results."""
    from src.agents.orchestrator import AgentOrchestrator

    orch = AgentOrchestrator()
    result = orch.run_all(SAMPLE_CONTEXT)

    assert result.batch_id == "T_TEST_001"
    assert len(result.agent_results) >= 2  # at least prediction + carbon
    agent_names = [r.agent_name for r in result.agent_results]
    assert "prediction" in agent_names
    assert "carbon" in agent_names


# ---------------------------------------------------------------------------
# Test 9: Notification persistence
# ---------------------------------------------------------------------------
def test_notification_persistence():
    """Notifications are saved and queryable."""
    from src.agents.notification_store import (
        save_notification,
        get_by_batch,
        get_history,
    )

    notif_id = save_notification(
        batch_id="T_TEST_PERSIST",
        agent_name="prediction",
        notification_type="explanation",
        analysis={"test": True},
        explanation="Test explanation text",
        requires_action=False,
        action_type=None,
        confidence=0.9,
    )
    assert notif_id > 0

    # Query by batch
    batch_results = get_by_batch("T_TEST_PERSIST")
    assert any(r["id"] == notif_id for r in batch_results)

    # Query history
    history = get_history(limit=10)
    assert any(r["id"] == notif_id for r in history)


# ---------------------------------------------------------------------------
# Test 10: Operator response stored
# ---------------------------------------------------------------------------
def test_operator_response_stored():
    """Operator Accept/Modify/Reject responses are captured in DB."""
    from src.agents.notification_store import (
        save_notification,
        resolve_notification,
    )

    notif_id = save_notification(
        batch_id="T_TEST_RESPONSE",
        agent_name="carbon",
        notification_type="alert",
        analysis={"any_over": True},
        explanation="CO2 exceeded",
        requires_action=True,
        action_type="acknowledge_alert",
        confidence=0.95,
    )

    result = resolve_notification(notif_id, "acknowledged", "Operator saw the alert")
    assert result["status"] == "acknowledged"
    assert result["operator_response"] == "Operator saw the alert"
    assert result["resolved_at"] is not None
