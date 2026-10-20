from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field

class ModelTrainRequest(BaseModel):
    model_name: str = Field("logistic_regression", description="naive_bayes, logistic_regression, linear_svm, or all")
    test_size: float = Field(0.2, ge=0.1, le=0.5, description="Holdout test proportion")
    ngram_range: tuple[int, int] = Field((1, 2), description="TF-IDF n-gram range")
    max_features: int = Field(5000, ge=500, le=50000, description="Max vocabulary features")
    min_df: int = Field(2, ge=1, description="Minimum document frequency")
    stratify: bool = Field(True, description="Perform stratified train/test split")

class InfluentialTerm(BaseModel):
    term: str
    weight: float

class PredictionRequest(BaseModel):
    text: str = Field(..., min_length=3, description="Complaint text to analyze")
    model_version: Optional[str] = Field(None, description="Model version or default active")
    uncertainty_threshold: float = Field(0.55, ge=0.0, le=1.0, description="Confidence threshold below which prediction is marked uncertain")

class PredictionResponse(BaseModel):
    predicted_category: str
    confidence: float = Field(..., description="Calibrated confidence score [0..1]")
    confidence_level: str = Field(..., description="High, Medium, or Low")
    is_uncertain: bool
    model_name: str
    model_version: str
    influential_terms: list[InfluentialTerm]
    all_class_probabilities: dict[str, float]

class ModelMetricsResponse(BaseModel):
    id: int
    model_name: str
    model_version: str
    status: str
    is_active: bool
    train_count: int
    test_count: int
    started_at: datetime
    completed_at: Optional[datetime]
    accuracy: float
    macro_f1: float
    weighted_f1: float
    macro_precision: float
    macro_recall: float
    per_class_metrics: dict[str, Any]
    confusion_matrix: dict[str, Any]
    vectorizer_configuration: dict[str, Any]
    duration_seconds: Optional[float] = None

class ModelComparisonResponse(BaseModel):
    models: list[ModelMetricsResponse]
    best_model_by_macro_f1: Optional[str] = None
    total_evaluated: int
