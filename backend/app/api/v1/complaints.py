from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.complaint import Complaint
from app.models.audit import AuditEvent
from app.schemas.complaint import (
    ComplaintResponse,
    PaginatedComplaintsResponse,
    ComplaintReviewUpdate,
)

router = APIRouter(prefix="/complaints", tags=["Complaints"])

@router.get("", response_model=PaginatedComplaintsResponse)
def get_complaints(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search text in original complaint"),
    category: Optional[str] = Query(None, description="Filter by actual category"),
    review_status: Optional[str] = Query(None, description="Filter by review status: unreviewed, confirmed, corrected"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    is_uncertain: Optional[bool] = Query(None, description="Filter by uncertain prediction flag"),
    product: Optional[str] = Query(None, description="Filter by product"),
    company: Optional[str] = Query(None, description="Filter by company"),
    db: Session = Depends(get_db)
):
    """Retrieves paginated, searchable, and filtered complaint records."""
    q = db.query(Complaint)

    if search:
        search_filter = or_(
            Complaint.original_text.ilike(f"%{search}%"),
            Complaint.company.ilike(f"%{search}%"),
            Complaint.product.ilike(f"%{search}%")
        )
        q = q.filter(search_filter)

    if category:
        q = q.filter(Complaint.actual_category == category)
    if review_status:
        q = q.filter(Complaint.review_status == review_status)
    if severity:
        q = q.filter(Complaint.severity == severity)
    if is_uncertain is not None:
        q = q.filter(Complaint.is_uncertain == is_uncertain)
    if product:
        q = q.filter(Complaint.product == product)
    if company:
        q = q.filter(Complaint.company == company)

    total_count = q.count()
    offset = (page - 1) * page_size
    records = q.order_by(Complaint.id.desc()).offset(offset).limit(page_size).all()
    total_pages = max(1, (total_count + page_size - 1) // page_size)

    return PaginatedComplaintsResponse(
        items=[ComplaintResponse.model_validate(r) for r in records],
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    """Retrieves single complaint by ID."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return ComplaintResponse.model_validate(complaint)

@router.patch("/{complaint_id}/review", response_model=ComplaintResponse)
def review_complaint(
    complaint_id: int,
    req: ComplaintReviewUpdate,
    db: Session = Depends(get_db)
):
    """
    Human-in-the-loop review action:
    Confirms or corrects predicted category, updates review notes and status.
    Keeps human correction separate from original model prediction.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    old_category = complaint.actual_category or complaint.predicted_category
    complaint.reviewed_category = req.reviewed_category
    complaint.review_notes = req.review_notes
    complaint.review_status = "corrected" if (old_category and req.reviewed_category != old_category) else "confirmed"
    
    # Also update actual_category to human-verified category for future training
    complaint.actual_category = req.reviewed_category
    complaint.is_uncertain = False # Confirmed by human
    
    if req.investigation_status:
        complaint.investigation_status = req.investigation_status

    complaint.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(complaint)

    # Log audit event
    db.add(AuditEvent(
        event_type="COMPLAINT_REVIEWED",
        entity_type="Complaint",
        entity_id=complaint.id,
        details={
            "reviewed_category": req.reviewed_category,
            "status": complaint.review_status,
            "previous": old_category
        }
    ))
    db.commit()

    return ComplaintResponse.model_validate(complaint)
