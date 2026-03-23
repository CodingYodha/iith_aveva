"""
notification_store.py — SQLite persistence for agent notifications and operator responses.
Includes the ProposedSignatureUpdate table for golden signature proposals.
"""

import json
import os
import sys
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from src.signatures.database import Base, engine, get_session


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class AgentNotification(Base):
    """Stores every agent run result and operator response."""
    __tablename__ = "agent_notification"

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String, nullable=False)
    agent_name = Column(String, nullable=False)
    notification_type = Column(String, nullable=False)  # explanation | proposal | alert
    analysis_json = Column(Text, nullable=False)
    explanation_text = Column(Text, default="")
    requires_action = Column(Boolean, default=False)
    action_type = Column(String, nullable=True)
    confidence = Column(Float, default=0.0)
    status = Column(String, default="pending")  # pending | acknowledged | accepted | modified | rejected
    operator_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


class ProposedSignatureUpdate(Base):
    """Stores signature update proposals awaiting operator approval."""
    __tablename__ = "proposed_signature_update"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cluster_name = Column(String, nullable=False)
    batch_id = Column(String, nullable=False)
    current_version = Column(Integer, nullable=False)
    proposed_cpp_json = Column(Text, nullable=True)
    proposed_cqa_json = Column(Text, nullable=True)
    delta_json = Column(Text, nullable=True)
    projected_impact_json = Column(Text, nullable=True)
    confidence_score = Column(Float, default=0.0)
    explanation_text = Column(Text, default="")
    status = Column(String, default="pending")  # pending | accepted | modified | rejected
    operator_response = Column(Text, nullable=True)
    notification_id = Column(Integer, nullable=True)  # links to AgentNotification
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


# ---------------------------------------------------------------------------
# Create tables
# ---------------------------------------------------------------------------
def init_agent_tables():
    """Create agent notification tables if they don't exist."""
    Base.metadata.create_all(engine)


# Auto-create on import
init_agent_tables()


# ---------------------------------------------------------------------------
# CRUD helpers
# ---------------------------------------------------------------------------
def save_notification(
    batch_id: str,
    agent_name: str,
    notification_type: str,
    analysis: dict,
    explanation: str,
    requires_action: bool,
    action_type: str | None,
    confidence: float,
) -> int:
    """Save an agent notification and return its ID."""
    with get_session() as session:
        notif = AgentNotification(
            batch_id=batch_id,
            agent_name=agent_name,
            notification_type=notification_type,
            analysis_json=json.dumps(analysis, default=str),
            explanation_text=explanation,
            requires_action=requires_action,
            action_type=action_type,
            confidence=confidence,
            status="pending" if requires_action else "acknowledged",
        )
        session.add(notif)
        session.commit()
        return notif.id


def save_signature_proposal(
    notification_id: int,
    analysis: dict,
    explanation: str,
) -> int:
    """Save a golden signature proposal linked to a notification."""
    with get_session() as session:
        proposal = ProposedSignatureUpdate(
            cluster_name=analysis.get("cluster_name", ""),
            batch_id=analysis.get("batch_id", ""),
            current_version=analysis.get("current_version", 0),
            proposed_cpp_json=json.dumps(analysis.get("proposed_cpp", {})),
            proposed_cqa_json=json.dumps(analysis.get("proposed_cqa", {})),
            delta_json=json.dumps(analysis.get("deltas", {}), default=str),
            projected_impact_json=json.dumps(analysis.get("projected_impact", {})),
            confidence_score=analysis.get("confidence_score", 0.0),
            explanation_text=explanation,
            notification_id=notification_id,
        )
        session.add(proposal)
        session.commit()
        return proposal.id


def get_pending() -> list[dict]:
    """Return all unresolved notifications requiring action."""
    with get_session() as session:
        rows = (
            session.query(AgentNotification)
            .filter_by(requires_action=True, status="pending")
            .order_by(AgentNotification.created_at.desc())
            .all()
        )
        return [_notif_to_dict(r) for r in rows]


def get_by_batch(batch_id: str) -> list[dict]:
    """Return all notifications for a specific batch."""
    with get_session() as session:
        rows = (
            session.query(AgentNotification)
            .filter_by(batch_id=batch_id)
            .order_by(AgentNotification.created_at.desc())
            .all()
        )
        return [_notif_to_dict(r) for r in rows]


def get_history(limit: int = 50) -> list[dict]:
    """Return recent notification history."""
    with get_session() as session:
        rows = (
            session.query(AgentNotification)
            .order_by(AgentNotification.created_at.desc())
            .limit(limit)
            .all()
        )
        return [_notif_to_dict(r) for r in rows]


def resolve_notification(
    notification_id: int,
    action: str,
    reason: str = "",
) -> dict:
    """Resolve a pending notification with operator response."""
    with get_session() as session:
        notif = session.query(AgentNotification).get(notification_id)
        if notif is None:
            return {"error": "Notification not found"}

        notif.status = action  # accepted | modified | rejected | acknowledged
        notif.operator_response = reason
        notif.resolved_at = datetime.utcnow()
        session.commit()

        return _notif_to_dict(notif)


def resolve_signature_proposal(notification_id: int, action: str, reason: str = ""):
    """Resolve the signature proposal linked to a notification."""
    with get_session() as session:
        proposal = (
            session.query(ProposedSignatureUpdate)
            .filter_by(notification_id=notification_id)
            .first()
        )
        if proposal:
            proposal.status = action
            proposal.operator_response = reason
            proposal.resolved_at = datetime.utcnow()
            session.commit()
            return {
                "id": proposal.id,
                "cluster_name": proposal.cluster_name,
                "batch_id": proposal.batch_id,
                "status": proposal.status,
            }
    return None


def get_pending_proposals() -> list[dict]:
    """Return all pending signature proposals."""
    with get_session() as session:
        rows = (
            session.query(ProposedSignatureUpdate)
            .filter_by(status="pending")
            .order_by(ProposedSignatureUpdate.created_at.desc())
            .all()
        )
        return [_proposal_to_dict(r) for r in rows]


def _notif_to_dict(r) -> dict:
    return {
        "id": r.id,
        "batch_id": r.batch_id,
        "agent_name": r.agent_name,
        "notification_type": r.notification_type,
        "analysis": json.loads(r.analysis_json) if r.analysis_json else {},
        "explanation": r.explanation_text or "",
        "requires_action": r.requires_action,
        "action_type": r.action_type,
        "confidence": r.confidence,
        "status": r.status,
        "operator_response": r.operator_response,
        "created_at": str(r.created_at) if r.created_at else None,
        "resolved_at": str(r.resolved_at) if r.resolved_at else None,
    }


def _proposal_to_dict(r) -> dict:
    return {
        "id": r.id,
        "cluster_name": r.cluster_name,
        "batch_id": r.batch_id,
        "current_version": r.current_version,
        "proposed_cpp": json.loads(r.proposed_cpp_json) if r.proposed_cpp_json else {},
        "proposed_cqa": json.loads(r.proposed_cqa_json) if r.proposed_cqa_json else {},
        "deltas": json.loads(r.delta_json) if r.delta_json else {},
        "projected_impact": json.loads(r.projected_impact_json) if r.projected_impact_json else {},
        "confidence_score": r.confidence_score,
        "explanation": r.explanation_text or "",
        "status": r.status,
        "operator_response": r.operator_response,
        "notification_id": r.notification_id,
        "created_at": str(r.created_at) if r.created_at else None,
        "resolved_at": str(r.resolved_at) if r.resolved_at else None,
    }
