"""Pydantic v2 schemas for CB-MOPA API."""

from typing import Optional
from pydantic import BaseModel


class BatchStateInput(BaseModel):
    batch_id: str
    cpp_params: dict[str, float]
    cluster_name: str = "Balanced Operational Golden"


class DriftCheckResult(BaseModel):
    batch_id: str
    cluster_name: str
    phase: str
    sensor: str
    alarm_level: str
    drift_score: float
    percent_outside: float


class ParamChange(BaseModel):
    param: str
    old_value: float
    new_value: float
    delta_pct: float


class RecommendationCard(BaseModel):
    pathway_name: str
    param_changes: list[ParamChange]
    expected_cqa_delta: dict[str, float]
    expected_co2_change: float
    safety_check: str
    causal_confidence: float = 0.8


class OperatorDecisionInput(BaseModel):
    batch_id: str
    pathway_a: dict
    pathway_b: dict
    chosen: str  # "A", "B", "MODIFIED", "REJECTED"
    modified_params: Optional[dict] = None
    reason: str = ""
    target_config: str = "Balanced Operational Golden"


class SignatureResponse(BaseModel):
    cluster_name: str
    version: int
    cpp_params: dict
    predicted_cqas: dict
    is_active: bool
    created_at: str
    source: str


class BatchCompleteInput(BaseModel):
    batch_id: str
    actual_cqas: dict[str, float]
    cluster_name: str = "Balanced Operational Golden"
