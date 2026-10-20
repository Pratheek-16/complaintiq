from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, Index
from app.database import Base

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    external_record_id = Column(String(100), nullable=True, index=True)
    original_text = Column(Text, nullable=False)
    cleaned_text = Column(Text, nullable=True)
    
    # Classification fields
    actual_category = Column(String(150), nullable=True, index=True)
    predicted_category = Column(String(150), nullable=True, index=True)
    prediction_confidence = Column(Float, nullable=True) # Calibrated probability [0..1]
    prediction_model_version = Column(String(100), nullable=True)
    is_uncertain = Column(Boolean, default=False, index=True)

    # Dimensional metadata
    product = Column(String(150), nullable=True, index=True)
    company = Column(String(200), nullable=True, index=True)
    location = Column(String(100), nullable=True, index=True) # State / Region / City
    department = Column(String(100), nullable=True, index=True)
    severity = Column(String(50), nullable=True, index=True) # High / Medium / Low or numeric
    
    # Timestamps
    received_at = Column(DateTime, nullable=True, index=True)
    
    # Human-in-the-loop review workflow
    review_status = Column(String(50), default="unreviewed", index=True) # unreviewed, confirmed, corrected
    reviewed_category = Column(String(150), nullable=True)
    review_notes = Column(Text, nullable=True)
    
    # Investigation status
    investigation_status = Column(String(50), default="unassigned", index=True) # unassigned, investigating, resolved

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_category_date", "actual_category", "received_at"),
        Index("idx_review_status", "review_status"),
        Index("idx_product_company", "product", "company"),
    )
