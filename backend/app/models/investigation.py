from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    issue_category = Column(String(150), nullable=True, index=True)
    priority_score = Column(Float, default=0.0)
    priority_level = Column(String(50), default="Medium") # High, Medium, Low
    assigned_department = Column(String(150), nullable=True, index=True)
    status = Column(String(50), default="open", index=True) # open, investigating, mitigated, closed
    findings = Column(JSON, nullable=True) # evidence summary, contributing factors, product/geo breakdowns
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    notes = relationship("InvestigationNote", back_populates="investigation", cascade="all, delete-orphan", order_by="InvestigationNote.created_at.desc()")

class InvestigationNote(Base):
    __tablename__ = "investigation_notes"

    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(Integer, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    author = Column(String(100), default="Analyst")
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    investigation = relationship("Investigation", back_populates="notes")
