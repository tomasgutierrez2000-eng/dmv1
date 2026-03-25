from pydantic import BaseModel, Field
from typing import Optional, Literal

class CoherenceIssue(BaseModel):
    facility_id: str
    issue_type: Literal[
        "PD_UTILIZATION_MISMATCH",
        "EVENT_STATE_INCONSISTENCY",
        "COVENANT_IFRS9_MISALIGN",
        "SPREAD_PD_DIVERGENCE",
        "TEMPORAL_MONOTONICITY",
        "NARRATIVE_DEVIATION",
    ]
    severity: Literal["INFO", "WARNING", "ERROR"]
    description: str
    recommendation: str

class CoherenceReport(BaseModel):
    scenario_id: str
    total_facilities: int
    issues: list[CoherenceIssue] = Field(default_factory=list)
    overall_score: float = Field(ge=0, le=100)
    pass_threshold: float = 80.0
    passed: bool = True

    @property
    def computed_passed(self) -> bool:
        return self.overall_score >= self.pass_threshold

class ValidationResult(BaseModel):
    passed: bool
    corrected_config: Optional[dict] = None
    fixes_applied: list[str] = Field(default_factory=list)
    rejection_reason: Optional[str] = None

class SyntheticDetectionResult(BaseModel):
    suspicious: bool = False
    confidence: float = Field(default=0.0, ge=0, le=1)
    findings: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)

class MetricRequirement(BaseModel):
    metric_id: str
    metric_name: str
    ingredient_fields: list[dict] = Field(default_factory=list)
    required_l2_tables: list[str] = Field(default_factory=list)
    desired_behavior: str = "breach"
