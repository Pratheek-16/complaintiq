from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class DiscoveredTopic(Base):
    __tablename__ = "discovered_topics"

    id = Column(Integer, primary_key=True, index=True)
    topic_model_version = Column(String(100), nullable=False, index=True)
    topic_number = Column(Integer, nullable=False)
    topic_name = Column(String(200), nullable=False) # Editable by analyst
    algorithm = Column(String(50), default="nmf") # nmf, lda, kmeans
    keywords = Column(JSON, nullable=False) # list of {word, weight}
    record_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    complaint_assignments = relationship("ComplaintTopic", back_populates="topic", cascade="all, delete-orphan")

class ComplaintTopic(Base):
    __tablename__ = "complaint_topics"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey("discovered_topics.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_weight = Column(Float, nullable=True) # Strength of membership

    topic = relationship("DiscoveredTopic", back_populates="complaint_assignments")
