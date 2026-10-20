from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON
from app.database import Base

class ModelRun(Base):
    __tablename__ = "model_runs"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False) # naive_bayes, logistic_regression, linear_svm
    model_version = Column(String(100), unique=True, index=True, nullable=False)
    vectorizer_configuration = Column(JSON, nullable=True)
    training_dataset_reference = Column(String(255), nullable=True)
    evaluation_metrics = Column(JSON, nullable=True) # accuracy, macro_f1, weighted_f1, precision, recall, confusion_matrix, per_class
    train_count = Column(Integer, default=0)
    test_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=False, index=True)
    artifact_path = Column(String(500), nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="training") # training, completed, failed
