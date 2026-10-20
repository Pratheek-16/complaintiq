from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.topic import (
    TopicDiscoveryRequest,
    TopicResponse,
    TopicRenameRequest,
    TopicDiscoveryResponse,
)
from app.services.topic_service import TopicService

router = APIRouter(prefix="/topics", tags=["Theme Discovery"])

@router.post("/discover", response_model=TopicDiscoveryResponse)
def discover_topics(req: TopicDiscoveryRequest, db: Session = Depends(get_db)):
    """Runs unsupervised topic modeling (NMF, LDA, or K-Means) on complaint texts."""
    try:
        return TopicService.discover_topics(db, req)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Topic discovery failed: {str(e)}")

@router.get("", response_model=list[TopicResponse])
def get_topics(db: Session = Depends(get_db)):
    """Retrieves current discovered topics and representative complaints."""
    return TopicService.get_topics(db)

@router.patch("/{topic_id}/rename", response_model=TopicResponse)
def rename_topic(topic_id: int, req: TopicRenameRequest, db: Session = Depends(get_db)):
    """Assigns an analyst-verified human name to a discovered topic."""
    try:
        return TopicService.rename_topic(db, topic_id, req.topic_name)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
