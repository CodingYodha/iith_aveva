"""
orchestrator.py — Runs all 3 agents and collects results.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from src.agents.base_agent import AgentResult
from src.agents.prediction_agent import PredictionAgent
from src.agents.golden_signature_agent import GoldenSignatureAgent
from src.agents.carbon_agent import CarbonAgent
from src.agents import notification_store


class OrchestratorResult(BaseModel):
    """Aggregated result from all agent runs."""
    batch_id: str
    agent_results: list[AgentResult]
    pending_actions: list[AgentResult]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    all_clear: bool = True


class AgentOrchestrator:
    """Runs Prediction, Golden Signature, and Carbon agents on a batch."""

    def __init__(self):
        self.prediction_agent = PredictionAgent()
        self.golden_signature_agent = GoldenSignatureAgent()
        self.carbon_agent = CarbonAgent()

    def run_all(self, batch_context: dict) -> OrchestratorResult:
        """
        Run all applicable agents on a batch.

        Parameters
        ----------
        batch_context : dict
            Must include: batch_id, cpp_params
            Optional: actual_cqas, cluster_name
        """
        batch_id = batch_context.get("batch_id", "unknown")
        results = []

        # Agent 1: Prediction (always runs)
        pred_result = self.prediction_agent.run(batch_context)
        notif_id = self._store(pred_result, "explanation")
        results.append(pred_result)

        # Agent 2: Golden Signature (only if actual CQAs are available)
        if batch_context.get("actual_cqas"):
            sig_result = self.golden_signature_agent.run(batch_context)
            sig_notif_id = self._store(sig_result, "proposal" if sig_result.requires_action else "explanation")

            # If proposal, also store in ProposedSignatureUpdate table
            if sig_result.requires_action and sig_result.analysis.get("dominates"):
                notification_store.save_signature_proposal(
                    notification_id=sig_notif_id,
                    analysis=sig_result.analysis,
                    explanation=sig_result.explanation,
                )
            results.append(sig_result)

        # Agent 3: Carbon (always runs)
        carbon_result = self.carbon_agent.run(batch_context)
        self._store(carbon_result, "alert" if carbon_result.requires_action else "explanation")
        results.append(carbon_result)

        pending = [r for r in results if r.requires_action]

        return OrchestratorResult(
            batch_id=batch_id,
            agent_results=results,
            pending_actions=pending,
            all_clear=len(pending) == 0,
        )

    @staticmethod
    def _store(result: AgentResult, notification_type: str) -> int:
        """Persist agent result to notification store."""
        return notification_store.save_notification(
            batch_id=result.analysis.get("batch_id", "unknown"),
            agent_name=result.agent_name,
            notification_type=notification_type,
            analysis=result.analysis,
            explanation=result.explanation,
            requires_action=result.requires_action,
            action_type=result.action_type,
            confidence=result.confidence,
        )


# Module-level singleton
orchestrator = AgentOrchestrator()
