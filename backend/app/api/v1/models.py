from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.model_run import ModelRun
from app.schemas.ml import (
    ModelTrainRequest,
    PredictionRequest,
    PredictionResponse,
    ModelMetricsResponse,
    ModelComparisonResponse,
)
from app.services.ml_service import MLService

router = APIRouter(prefix="/models", tags=["Machine Learning"])

@router.post("/train", response_model=list[ModelMetricsResponse])
def train_classifiers(req: ModelTrainRequest, db: Session = Depends(get_db)):
    """
    Trains candidate machine learning models (Naive Bayes, Logistic Regression, Linear SVM)
    using a reproducible scikit-learn pipeline and TF-IDF features.
    """
    try:
        metrics_list = MLService.train_and_evaluate_models(db, req)
        return metrics_list
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@router.get("/compare", response_model=ModelComparisonResponse)
def compare_models(db: Session = Depends(get_db)):
    """Retrieves full comparison laboratory metrics across all trained model versions."""
    return MLService.get_model_comparison(db)

@router.post("/predict", response_model=PredictionResponse)
def predict_single_complaint(req: PredictionRequest, db: Session = Depends(get_db)):
    """
    Predicts category for complaint text, calculates calibrated confidence,
    flags uncertainty, and extracts influential words.
    """
    try:
        return MLService.predict_complaint(
            db=db,
            text=req.text,
            uncertainty_threshold=req.uncertainty_threshold,
            model_version=req.model_version
        )
    except RuntimeError as re:
        raise HTTPException(status_code=400, detail=str(re))
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{model_version}/activate")
def activate_model_version(model_version: str, db: Session = Depends(get_db)):
    """Switches active serving model to a specific version."""
    success = MLService.set_active_model(db, model_version)
    if not success:
        raise HTTPException(status_code=404, detail=f"Model version '{model_version}' not found or artifact missing.")
    return {"message": f"Model version {model_version} is now active."}

@router.get("/{model_id}/metrics", response_model=ModelMetricsResponse)
def get_model_run_metrics(model_id: int, db: Session = Depends(get_db)):
    """Retrieves metrics for a specific model run."""
    run = db.query(ModelRun).filter(ModelRun.id == model_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Model run not found")
    m = run.evaluation_metrics or {}
    return ModelMetricsResponse(
        id=run.id,
        model_name=run.model_name,
        model_version=run.model_version,
        status=run.status,
        is_active=run.is_active,
        train_count=run.train_count,
        test_count=run.test_count,
        started_at=run.started_at,
        completed_at=run.completed_at,
        accuracy=float(m.get("accuracy", 0.0)),
        macro_f1=float(m.get("macro_f1", 0.0)),
        weighted_f1=float(m.get("weighted_f1", 0.0)),
        macro_precision=float(m.get("macro_precision", 0.0)),
        macro_recall=float(m.get("macro_recall", 0.0)),
        per_class_metrics=m.get("per_class", {}),
        confusion_matrix=m.get("confusion_matrix", {}),
        vectorizer_configuration=run.vectorizer_configuration or {},
        duration_seconds=float(m.get("duration_seconds", 0.0))
    )
