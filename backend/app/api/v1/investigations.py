from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.investigation import (
    InvestigationCreate,
    InvestigationUpdate,
    InvestigationResponse,
    InvestigationNoteCreate,
    InvestigationNoteResponse,
)
from app.services.investigation_service import InvestigationService

router = APIRouter(prefix="/investigations", tags=["Investigations"])

@router.get("", response_model=list[InvestigationResponse])
def list_investigations(
    status: Optional[str] = Query(None, description="open, investigating, mitigated, closed"),
    db: Session = Depends(get_db)
):
    """Retrieves all investigation cases with status and notes."""
    return InvestigationService.list_investigations(db, status=status)

@router.post("", response_model=InvestigationResponse)
def create_investigation(req: InvestigationCreate, db: Session = Depends(get_db)):
    """Creates a new investigation case."""
    return InvestigationService.create_investigation(db, req)

@router.get("/evidence")
def explore_evidence(category: str = Query(..., description="Category or issue to investigate"), db: Session = Depends(get_db)):
    """Explores root-cause evidence, product/location/company breakdowns for a category."""
    return InvestigationService.explore_root_cause_evidence(db, category)

@router.get("/{inv_id}", response_model=InvestigationResponse)
def get_investigation(inv_id: int, db: Session = Depends(get_db)):
    """Retrieves details of a single investigation."""
    try:
        return InvestigationService.get_investigation(db, inv_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.patch("/{inv_id}", response_model=InvestigationResponse)
def update_investigation(inv_id: int, req: InvestigationUpdate, db: Session = Depends(get_db)):
    """Updates status, assignment, or details of an investigation."""
    try:
        return InvestigationService.update_investigation(db, inv_id, req)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.post("/{inv_id}/notes", response_model=InvestigationNoteResponse)
def add_investigation_note(inv_id: int, req: InvestigationNoteCreate, db: Session = Depends(get_db)):
    """Appends an analyst note to an investigation."""
    try:
        return InvestigationService.add_note(db, inv_id, req)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
