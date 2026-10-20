from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.complaint import Complaint
from app.models.investigation import Investigation
from app.schemas.analytics import (
    DashboardMetricsResponse,
    TrendAnalysisResponse,
    EmergingIssueAlert,
    PriorityScoreBreakdown,
    SimilarComplaintResponse,
)
from app.services.trend_service import TrendService
from app.services.priority_service import PriorityService
from app.services.similarity_service import SimilarityService

router = APIRouter(prefix="/analytics", tags=["Analytics & Intelligence"])

@router.get("/overview", response_model=DashboardMetricsResponse)
def get_dashboard_overview(db: Session = Depends(get_db)):
    """Computes all summary cards, distribution, trends, and review queues for the landing dashboard."""
    total_complaints = db.query(Complaint).count()
    labeled_count = db.query(Complaint).filter(Complaint.actual_category.isnot(None), Complaint.actual_category != "").count()
    unlabeled_count = total_complaints - labeled_count
    unreviewed_count = db.query(Complaint).filter(Complaint.review_status == "unreviewed").count()
    uncertain_count = db.query(Complaint).filter(Complaint.is_uncertain == True).count()
    active_inv_count = db.query(Investigation).filter(Investigation.status.in_(["open", "investigating"])).count()

    # Category distribution
    cat_query = (
        db.query(Complaint.actual_category, func.count(Complaint.id).label("cnt"))
        .filter(Complaint.actual_category.isnot(None), Complaint.actual_category != "")
        .group_by(Complaint.actual_category)
        .order_by(func.count(Complaint.id).desc())
        .limit(10)
        .all()
    )
    cat_dist = [{"category": c[0], "count": c[1]} for c in cat_query]

    # Monthly volume trend
    trend_query = (
        db.query(
            func.strftime("%Y-%m", Complaint.received_at).label("month"),
            func.count(Complaint.id).label("cnt")
        )
        .filter(Complaint.received_at.isnot(None))
        .group_by("month")
        .order_by("month")
        .all()
    ) if str(db.bind.url).startswith("sqlite") else (
        db.query(
            func.to_char(Complaint.received_at, "YYYY-MM").label("month"),
            func.count(Complaint.id).label("cnt")
        )
        .filter(Complaint.received_at.isnot(None))
        .group_by("month")
        .order_by("month")
        .all()
    )
    monthly_trend = [{"period": t[0], "count": t[1]} for t in trend_query if t[0]]

    # Emerging issues count
    emerging_alerts = TrendService.detect_emerging_issues(db)
    
    # Priority issues
    priorities = PriorityService.calculate_priorities(db)
    top_priorities = [p.model_dump() for p in priorities[:5]]

    # Recent investigations
    recent_invs = (
        db.query(Investigation)
        .order_by(Investigation.updated_at.desc())
        .limit(5)
        .all()
    )
    recent_inv_list = [
        {
            "id": i.id,
            "title": i.title,
            "status": i.status,
            "priority_level": i.priority_level,
            "category": i.issue_category,
            "created_at": i.created_at.strftime("%Y-%m-%d")
        }
        for i in recent_invs
    ]

    # Near duplicates count (rough estimate from unreviewed near-identical complaints)
    near_dupe_count = 0

    return DashboardMetricsResponse(
        total_complaints=total_complaints,
        labeled_complaints=labeled_count,
        unlabeled_complaints=unlabeled_count,
        unreviewed_count=unreviewed_count,
        uncertain_predictions_count=uncertain_count,
        active_investigations_count=active_inv_count,
        emerging_issues_count=len(emerging_alerts),
        potential_duplicates_count=near_dupe_count,
        category_distribution=cat_dist,
        monthly_trend=monthly_trend,
        top_priority_issues=top_priorities,
        recent_investigations=recent_inv_list
    )

@router.get("/trends", response_model=TrendAnalysisResponse)
def get_trends(
    period: str = Query("monthly", description="daily, weekly, or monthly"),
    top_n: int = Query(6, ge=2, le=15),
    db: Session = Depends(get_db)
):
    """Retrieves time-series complaint trends per category."""
    return TrendService.get_trends(db, period_type=period, top_n_categories=top_n)

@router.get("/emerging-issues", response_model=list[EmergingIssueAlert])
def get_emerging_issues(
    growth_threshold: float = Query(0.40, ge=0.1, le=5.0),
    min_volume: int = Query(5, ge=1),
    db: Session = Depends(get_db)
):
    """Detects rapidly increasing complaint issues."""
    return TrendService.detect_emerging_issues(db, growth_threshold=growth_threshold, min_current_volume=min_volume)

@router.get("/priorities", response_model=list[PriorityScoreBreakdown])
def get_priority_rankings(
    volume_weight: Optional[float] = Query(None, ge=0.0, le=1.0),
    severity_weight: Optional[float] = Query(None, ge=0.0, le=1.0),
    growth_weight: Optional[float] = Query(None, ge=0.0, le=1.0),
    db: Session = Depends(get_db)
):
    """Calculates transparent, explainable priority scores for all issue categories."""
    return PriorityService.calculate_priorities(
        db=db,
        volume_weight=volume_weight,
        severity_weight=severity_weight,
        growth_weight=growth_weight
    )

@router.get("/similar", response_model=SimilarComplaintResponse)
def find_similar_by_id(
    complaint_id: Optional[int] = Query(None),
    query_text: Optional[str] = Query(None),
    threshold: float = Query(0.60, ge=0.1, le=0.99),
    top_k: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Finds textually similar complaints using TF-IDF cosine similarity."""
    try:
        return SimilarityService.find_similar_complaints(
            db=db,
            complaint_id=complaint_id,
            query_text=query_text,
            threshold=threshold,
            top_k=top_k
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
