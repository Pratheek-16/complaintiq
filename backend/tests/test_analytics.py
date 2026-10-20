import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.complaint import Complaint
from app.schemas.topic import TopicDiscoveryRequest
from app.services.topic_service import TopicService
from app.services.similarity_service import SimilarityService
from app.services.trend_service import TrendService
from app.services.priority_service import PriorityService
from app.services.preprocessing import default_preprocessor

@pytest.fixture
def analytics_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    now = datetime.utcnow()
    # Create sample complaints with dates and categories
    data = [
        # Recent period (last 10 days)
        ("Inaccurate late payment reported by Equifax bureau", "Credit Reporting", now - timedelta(days=2), "High"),
        ("Bureau refused to investigate dispute for inaccurate debt", "Credit Reporting", now - timedelta(days=3), "High"),
        ("Credit report shows fraudulent inquiry from auto dealer", "Credit Reporting", now - timedelta(days=4), "Medium"),
        ("Score dropped due to mixed credit file information", "Credit Reporting", now - timedelta(days=5), "High"),
        ("Inaccurate balance reporting on closed credit card", "Credit Reporting", now - timedelta(days=6), "Medium"),
        ("Credit report error not resolved after 60 days", "Credit Reporting", now - timedelta(days=7), "High"),
        
        # Historical period (40 days ago)
        ("Collector calling my employer over disputed medical bill", "Debt Collection", now - timedelta(days=40), "High"),
        ("Debt agency harassing phone calls past statute of limitations", "Debt Collection", now - timedelta(days=42), "Medium"),
        ("Refused debt verification within statutory timeline", "Debt Collection", now - timedelta(days=45), "Medium"),
        ("Unauthorized debit charge of 200 dollars on my account", "Fraud Charges", now - timedelta(days=46), "High"),
        ("Duplicate wire transfer charge triggered overdraft fees", "Billing Error", now - timedelta(days=48), "Low"),
        ("Mortgage servicer failed to pay property taxes from escrow", "Mortgage Servicing", now - timedelta(days=50), "Critical")
    ] * 3 # 36 records

    for text, cat, rec_date, sev in data:
        c = Complaint(
            original_text=text,
            cleaned_text=default_preprocessor.clean_text(text),
            actual_category=cat,
            received_at=rec_date,
            severity=sev,
            product=cat,
            company="Test Corp"
        )
        db.add(c)
    db.commit()

    yield db
    db.close()

def test_topic_discovery_nmf(analytics_db):
    req = TopicDiscoveryRequest(algorithm="nmf", num_topics=3, num_keywords=5)
    resp = TopicService.discover_topics(analytics_db, req)
    assert len(resp.topics) == 3
    for t in resp.topics:
        assert len(t.keywords) == 5
        assert t.record_count >= 0

def test_similarity_search(analytics_db):
    resp = SimilarityService.find_similar_complaints(
        db=analytics_db,
        query_text="Inaccurate late payment on my credit report from bureau",
        threshold=0.3
    )
    assert resp.total_found > 0
    assert resp.similar_complaints[0].similarity_score > 0.3

def test_emerging_issues_detection(analytics_db):
    # Credit Reporting has 18 recent complaints and 0 in previous period -> emerging surge
    alerts = TrendService.detect_emerging_issues(analytics_db, growth_threshold=0.3, min_current_volume=3)
    assert len(alerts) > 0
    categories = [a.category for a in alerts]
    assert "Credit Reporting" in categories

def test_priority_score_calculation(analytics_db):
    priorities = PriorityService.calculate_priorities(analytics_db)
    assert len(priorities) > 0
    for p in priorities:
        assert 0.0 <= p.total_score <= 100.0
        assert p.priority_level in ["High", "Medium", "Low"]
        assert "explanation" in p.model_dump()
