from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field

class InvestigationNoteCreate(BaseModel):
    author: Optional[str] = "Analyst"
    note: str = Field(..., min_length=2)

class InvestigationNoteResponse(BaseModel):
    id: int
    investigation_id: int
    author: str
    note: str
    created_at: datetime

    class Config:
        from_attributes = True

class InvestigationCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    issue_category: Optional[str] = None
    priority_score: Optional[float] = 0.0
    priority_level: Optional[str] = "Medium"
    assigned_department: Optional[str] = None
    findings: Optional[dict[str, Any]] = None

class InvestigationUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None # open, investigating, mitigated, closed
    assigned_department: Optional[str] = None
    priority_level: Optional[str] = None
    findings: Optional[dict[str, Any]] = None

class InvestigationResponse(BaseModel):
    id: int
    title: str
    description: str
    issue_category: Optional[str] = None
    priority_score: float
    priority_level: str
    assigned_department: Optional[str] = None
    status: str
    findings: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    notes: list[InvestigationNoteResponse] = []

    class Config:
        from_attributes = True
