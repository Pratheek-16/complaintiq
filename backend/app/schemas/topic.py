from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field

class TopicDiscoveryRequest(BaseModel):
    algorithm: str = Field("nmf", description="Topic algorithm: 'nmf' or 'lda' or 'kmeans'")
    num_topics: int = Field(5, ge=2, le=20, description="Number of topics to discover")
    num_keywords: int = Field(10, ge=3, le=30, description="Number of keywords per topic")
    max_features: int = Field(3000, ge=500, le=20000, description="Max vocabulary size")

class TopicKeyword(BaseModel):
    term: str
    weight: float

class RepresentativeComplaint(BaseModel):
    complaint_id: int
    text: str
    category: Optional[str] = None
    similarity_weight: float

class TopicResponse(BaseModel):
    id: int
    topic_number: int
    topic_name: str
    algorithm: str
    keywords: list[TopicKeyword]
    record_count: int
    prevalence_percentage: float
    representative_complaints: list[RepresentativeComplaint]
    created_at: datetime

class TopicRenameRequest(BaseModel):
    topic_name: str = Field(..., min_length=2, max_length=200)

class TopicDiscoveryResponse(BaseModel):
    topics: list[TopicResponse]
    total_documents_modeled: int
    algorithm: str
    topic_model_version: str
