from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field

class DashboardMetricsResponse(BaseModel):
    total_complaints: int
    labeled_complaints: int
    unlabeled_complaints: int
    unreviewed_count: int
    uncertain_predictions_count: int
    active_investigations_count: int
    emerging_issues_count: int
    potential_duplicates_count: int
    category_distribution: list[dict[str, Any]]
    monthly_trend: list[dict[str, Any]]
    top_priority_issues: list[dict[str, Any]]
    recent_investigations: list[dict[str, Any]]

class TrendItem(BaseModel):
    date_period: str # e.g. "2026-03", "2026-W12", "2026-03-15"
    category: str
    count: int

class TrendAnalysisResponse(BaseModel):
    period_type: str # daily, weekly, monthly
    series: list[dict[str, Any]]
    categories: list[str]
    time_labels: list[str]

class EmergingIssueAlert(BaseModel):
    category: str
    current_volume: int
    previous_volume: int
    absolute_change: int
    percentage_change: float
    time_window: str
    alert_level: str # Critical, Warning, Watch
    trigger_rule: str
    supporting_complaints: list[dict[str, Any]]

class PriorityScoreBreakdown(BaseModel):
    category: str
    total_score: float # 0 to 100
    priority_level: str # High, Medium, Low
    normalized_volume: float
    normalized_growth: float
    normalized_severity: Optional[float] = None
    weights_applied: dict[str, float]
    explanation: str
    complaint_count: int
    recent_growth_rate: float
    is_severity_available: bool

class SimilarComplaintItem(BaseModel):
    complaint_id: int
    text: str
    category: Optional[str] = None
    similarity_score: float
    received_at: Optional[datetime] = None
    company: Optional[str] = None
    is_near_duplicate: bool

class SimilarComplaintResponse(BaseModel):
    query_complaint_id: Optional[int] = None
    query_text: str
    similarity_threshold: float
    similar_complaints: list[SimilarComplaintItem]
    total_found: int
