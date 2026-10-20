from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class ComplaintBase(BaseModel):
    original_text: str
    external_record_id: Optional[str] = None
    actual_category: Optional[str] = None
    product: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    department: Optional[str] = None
    severity: Optional[str] = None
    received_at: Optional[datetime] = None

class ComplaintCreate(ComplaintBase):
    pass

class ComplaintReviewUpdate(BaseModel):
    reviewed_category: str = Field(..., description="Human confirmed/corrected category")
    review_notes: Optional[str] = None
    investigation_status: Optional[str] = None

class ComplaintResponse(BaseModel):
    id: int
    external_record_id: Optional[str] = None
    original_text: str
    cleaned_text: Optional[str] = None
    actual_category: Optional[str] = None
    predicted_category: Optional[str] = None
    prediction_confidence: Optional[float] = None
    prediction_model_version: Optional[str] = None
    is_uncertain: bool = False
    product: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    department: Optional[str] = None
    severity: Optional[str] = None
    received_at: Optional[datetime] = None
    review_status: str
    reviewed_category: Optional[str] = None
    review_notes: Optional[str] = None
    investigation_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PaginatedComplaintsResponse(BaseModel):
    items: list[ComplaintResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
