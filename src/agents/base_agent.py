"""
base_agent.py — Lightweight agent base class and result model.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from src.agents.llm_client import LLMClient


class AgentResult(BaseModel):
    """Structured output from any agent run."""
    agent_name: str
    analysis: dict
    explanation: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    requires_action: bool = False
    action_type: Optional[str] = None  # review_explanation | approve_signature | acknowledge_alert
    confidence: float = 0.0
    metadata: dict = Field(default_factory=dict)


class BaseAgent:
    """Base class for all CB-MOPA agents."""

    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role  # system prompt for LLM
        self.llm = LLMClient()

    def analyze(self, context: dict) -> dict:
        """Override: run domain logic, return structured analysis."""
        raise NotImplementedError

    def format_prompt(self, analysis: dict) -> str:
        """Override: convert analysis dict into user prompt for LLM."""
        raise NotImplementedError

    def needs_operator_action(self, analysis: dict) -> bool:
        """Override: decide if operator must respond."""
        return False

    def get_action_type(self, analysis: dict) -> Optional[str]:
        """Override: return the type of action required."""
        return None

    def get_confidence(self, analysis: dict) -> float:
        """Override: return confidence score for this analysis."""
        return 0.0

    def explain(self, analysis: dict) -> str:
        """Send analysis to OpenClaw, get plain English explanation."""
        prompt = self.format_prompt(analysis)
        return self.llm.generate(system_prompt=self.role, user_prompt=prompt)

    def run(self, context: dict) -> AgentResult:
        """Full pipeline: analyze → explain → package result."""
        analysis = self.analyze(context)
        explanation = self.explain(analysis)
        requires = self.needs_operator_action(analysis)

        return AgentResult(
            agent_name=self.name,
            analysis=analysis,
            explanation=explanation,
            requires_action=requires,
            action_type=self.get_action_type(analysis) if requires else None,
            confidence=self.get_confidence(analysis),
            metadata=context.get("metadata", {}),
        )
