import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.complaint import Complaint
from app.schemas.ml import ModelTrainRequest, PredictionRequest
from app.services.ml_service import MLService
from app.services.preprocessing import default_preprocessor

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    # Seed labeled complaints for 3 classes
    sample_data = [
        ("Credit report has inaccurate late marks that the bureau refuses to correct", "Credit Reporting"),
        ("Bureau published fraudulent inquiry without authorization", "Credit Reporting"),
        ("Disputed incorrect balance on credit file but received no response", "Credit Reporting"),
        ("Credit score dropped due to mixed file with another consumer", "Credit Reporting"),
        ("Collector calling my employer continuously after cease and desist letter", "Debt Collection"),
        ("Debt agency threatening arrest and wage garnishment over paid balance", "Debt Collection"),
        ("Harassing phone calls at night from collection agency for zombie debt", "Debt Collection"),
        ("Collector refused debt verification within statutory window", "Debt Collection"),
        ("Unauthorized debit charge of 500 dollars posted to my checking account", "Fraud Dispute"),
        ("Stolen card used overseas and bank denied fraud claim", "Fraud Dispute"),
        ("Multiple fraudulent wire transfers drained balance without 2FA prompt", "Fraud Dispute"),
        ("Bank refusing to provide provisional credit for disputed debit charge", "Fraud Dispute"),
    ] * 4 # 48 labeled samples (16 per class)

    for text, cat in sample_data:
        complaint = Complaint(
            original_text=text,
            cleaned_text=default_preprocessor.clean_text(text),
            actual_category=cat,
            review_status="confirmed"
        )
        db.add(complaint)
    db.commit()

    yield db
    db.close()

def test_train_and_evaluate_models(test_db):
    req = ModelTrainRequest(
        model_name="all",
        test_size=0.25,
        ngram_range=(1, 2),
        max_features=1000,
        min_df=1,
        stratify=True
    )
    results = MLService.train_and_evaluate_models(test_db, req)
    assert len(results) == 3 # naive_bayes, logistic_regression, linear_svm
    
    for r in results:
        assert r.accuracy > 0.5
        assert r.macro_f1 > 0.5
        assert r.status == "completed"
        assert len(r.confusion_matrix["labels"]) == 3

def test_prediction_with_influential_terms(test_db):
    # Train logistic regression
    req = ModelTrainRequest(model_name="logistic_regression", test_size=0.25, min_df=1)
    MLService.train_and_evaluate_models(test_db, req)

    pred = MLService.predict_complaint(
        db=test_db,
        text="Debt collector called my boss and threatened legal action over paid bill",
        uncertainty_threshold=0.4
    )

    assert pred.predicted_category == "Debt Collection"
    assert pred.confidence > 0.4
    assert pred.is_uncertain is False
    assert len(pred.influential_terms) > 0
    assert any(term.term in ["collector", "debt", "threatened", "called"] for term in pred.influential_terms)
