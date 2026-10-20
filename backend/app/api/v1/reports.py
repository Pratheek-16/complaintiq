from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/complaints/csv")
def export_complaints(
    category: Optional[str] = Query(None),
    review_status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(5000, ge=1, le=50000),
    db: Session = Depends(get_db)
):
    """Exports filtered complaint records as downloadable CSV."""
    csv_data = ReportService.export_complaints_csv(
        db=db,
        category=category,
        review_status=review_status,
        severity=severity,
        search=search,
        limit=limit
    )
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=complaintiq_records.csv"}
    )

@router.get("/models/csv")
def export_model_metrics(db: Session = Depends(get_db)):
    """Exports model comparison metrics as CSV."""
    csv_data = ReportService.export_model_metrics_csv(db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=complaintiq_model_metrics.csv"}
    )

@router.get("/priorities/csv")
def export_priorities(db: Session = Depends(get_db)):
    """Exports priority rankings and factor breakdowns as CSV."""
    csv_data = ReportService.export_priorities_csv(db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=complaintiq_priorities.csv"}
    )

@router.get("/investigations/csv")
def export_investigations(db: Session = Depends(get_db)):
    """Exports all investigation cases and notes as CSV."""
    csv_data = ReportService.export_investigations_csv(db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=complaintiq_investigations.csv"}
    )
