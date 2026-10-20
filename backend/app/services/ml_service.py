import os
import time
import uuid
import joblib
import numpy as np
from datetime import datetime
from typing import Any, Tuple
from sqlalchemy.orm import Session
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    classification_report,
    confusion_matrix,
)

from app.config import settings
from app.models.complaint import Complaint
from app.models.model_run import ModelRun
from app.models.audit import AuditEvent
from app.schemas.ml import (
    ModelTrainRequest,
    PredictionResponse,
    InfluentialTerm,
    ModelMetricsResponse,
    ModelComparisonResponse,
)
from app.services.preprocessing import default_preprocessor

class MLService:
    _active_pipeline: Any = None
    _active_model_version: str | None = None
    _active_model_name: str | None = None

    @classmethod
    def get_candidate_classifiers(cls, random_state: int = 42) -> dict[str, Any]:
        """Returns initialized candidate classifier instances."""
        return {
            "naive_bayes": MultinomialNB(alpha=0.1),
            "logistic_regression": LogisticRegression(
                C=1.0,
                max_iter=1000,
                class_weight="balanced",
                random_state=random_state,
                solver="lbfgs"
            ),
            "linear_svm": CalibratedClassifierCV(
                estimator=LinearSVC(C=1.0, random_state=random_state, dual="auto", max_iter=2000),
                cv=3
            ),
        }

    @classmethod
    def train_and_evaluate_models(
        cls,
        db: Session,
        train_req: ModelTrainRequest
    ) -> list[ModelMetricsResponse]:
        """
        Trains and compares requested classifiers on labeled complaints stored in DB.
        Ensures strict leakage prevention by fitting TF-IDF only within the training split.
        """
        # 1. Fetch labeled complaint records
        labeled_records = (
            db.query(Complaint.cleaned_text, Complaint.actual_category)
            .filter(Complaint.cleaned_text.isnot(None))
            .filter(Complaint.actual_category.isnot(None))
            .filter(Complaint.actual_category != "")
            .all()
        )

        if len(labeled_records) < 20:
            raise ValueError(
                f"Insufficient labeled complaint records for training. Found {len(labeled_records)}, require at least 20."
            )

        texts = [r[0] for r in labeled_records]
        labels = [r[1] for r in labeled_records]

        # Check category distribution
        unique_classes, class_counts = np.unique(labels, return_counts=True)
        if len(unique_classes) < 2:
            raise ValueError(f"Need at least 2 distinct categories to train a classifier. Found: {unique_classes}")

        # Filter out classes with fewer than 2 examples for stratified split safety
        valid_indices = [i for i, label in enumerate(labels) if class_counts[np.where(unique_classes == label)[0][0]] >= 2]
        if len(valid_indices) < len(labels):
            texts = [texts[i] for i in valid_indices]
            labels = [labels[i] for i in valid_indices]

        # 2. Train / Test Split (Strict leakage prevention)
        stratify_arg = labels if train_req.stratify else None
        X_train, X_test, y_train, y_test = train_test_split(
            texts,
            labels,
            test_size=train_req.test_size,
            random_state=42,
            stratify=stratify_arg
        )

        models_to_run = (
            list(cls.get_candidate_classifiers().keys())
            if train_req.model_name in ["all", "compare"]
            else [train_req.model_name]
        )

        results: list[ModelMetricsResponse] = []
        best_macro_f1 = -1.0
        best_version = None

        for name in models_to_run:
            start_time = time.time()
            version = f"{name}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"

            # Build pipeline: TF-IDF Vectorizer + Classifier
            vectorizer = TfidfVectorizer(
                ngram_range=train_req.ngram_range,
                max_features=train_req.max_features,
                min_df=train_req.min_df,
                sublinear_tf=True,
                stop_words=None # Preprocessor already normalized tokens
            )

            classifier = cls.get_candidate_classifiers()[name]
            pipeline = Pipeline([
                ("tfidf", vectorizer),
                ("clf", classifier)
            ])

            # Fit on training set only
            pipeline.fit(X_train, y_train)
            duration = round(time.time() - start_time, 3)

            # Predict on held-out test set
            y_pred = pipeline.predict(X_test)

            # Evaluate metrics from real predictions
            acc = float(accuracy_score(y_test, y_pred))
            macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
            weighted_f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
            macro_prec = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
            macro_rec = float(recall_score(y_test, y_pred, average="macro", zero_division=0))

            target_classes = sorted(list(set(y_test) | set(y_pred)))
            report_dict = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
            cm = confusion_matrix(y_test, y_pred, labels=target_classes).tolist()

            vectorizer_config = {
                "ngram_range": train_req.ngram_range,
                "max_features": train_req.max_features,
                "min_df": train_req.min_df,
                "vocabulary_size": len(pipeline.named_steps["tfidf"].vocabulary_),
                "test_size": train_req.test_size,
                "train_samples": len(X_train),
                "test_samples": len(X_test)
            }

            eval_metrics = {
                "accuracy": round(acc, 4),
                "macro_f1": round(macro_f1, 4),
                "weighted_f1": round(weighted_f1, 4),
                "macro_precision": round(macro_prec, 4),
                "macro_recall": round(macro_rec, 4),
                "per_class": {
                    cls_name: {
                        "precision": round(metrics.get("precision", 0), 4),
                        "recall": round(metrics.get("recall", 0), 4),
                        "f1_score": round(metrics.get("f1-score", 0), 4),
                        "support": int(metrics.get("support", 0))
                    }
                    for cls_name, metrics in report_dict.items()
                    if isinstance(metrics, dict) and cls_name in target_classes
                },
                "confusion_matrix": {
                    "labels": target_classes,
                    "matrix": cm
                },
                "duration_seconds": duration
            }

            # Persist artifact
            artifact_filename = f"{version}.joblib"
            artifact_path = os.path.join(settings.MODELS_STORAGE_DIR, artifact_filename)
            joblib.dump(pipeline, artifact_path)

            # Record in DB
            model_record = ModelRun(
                model_name=name,
                model_version=version,
                vectorizer_configuration=vectorizer_config,
                training_dataset_reference=f"complaints_db_{len(X_train) + len(X_test)}_samples",
                evaluation_metrics=eval_metrics,
                train_count=len(X_train),
                test_count=len(X_test),
                is_active=False,
                artifact_path=artifact_path,
                completed_at=datetime.utcnow(),
                status="completed"
            )
            db.add(model_record)
            db.commit()
            db.refresh(model_record)

            metric_resp = ModelMetricsResponse(
                id=model_record.id,
                model_name=name,
                model_version=version,
                status="completed",
                is_active=False,
                train_count=len(X_train),
                test_count=len(X_test),
                started_at=model_record.started_at,
                completed_at=model_record.completed_at,
                accuracy=round(acc, 4),
                macro_f1=round(macro_f1, 4),
                weighted_f1=round(weighted_f1, 4),
                macro_precision=round(macro_prec, 4),
                macro_recall=round(macro_rec, 4),
                per_class_metrics=eval_metrics["per_class"],
                confusion_matrix=eval_metrics["confusion_matrix"],
                vectorizer_configuration=vectorizer_config,
                duration_seconds=duration
            )
            results.append(metric_resp)

            if macro_f1 > best_macro_f1:
                best_macro_f1 = macro_f1
                best_version = version

        # Set best model as active
        if best_version:
            cls.set_active_model(db, best_version)
            for r in results:
                if r.model_version == best_version:
                    r.is_active = True

        return results

    @classmethod
    def set_active_model(cls, db: Session, model_version: str) -> bool:
        """Sets the specified model version as the active system model."""
        db.query(ModelRun).update({"is_active": False})
        record = db.query(ModelRun).filter(ModelRun.model_version == model_version).first()
        if not record or not record.artifact_path or not os.path.exists(record.artifact_path):
            return False

        record.is_active = True
        db.commit()

        # Load into memory
        cls._active_pipeline = joblib.load(record.artifact_path)
        cls._active_model_version = record.model_version
        cls._active_model_name = record.model_name
        return True

    @classmethod
    def get_active_pipeline(cls, db: Session) -> Tuple[Any, str, str]:
        """Loads and returns the active pipeline."""
        if cls._active_pipeline is not None:
            return cls._active_pipeline, cls._active_model_version or "default", cls._active_model_name or "unknown"

        # Search for active model in DB
        active_rec = db.query(ModelRun).filter(ModelRun.is_active == True).first()
        if not active_rec:
            # Fall back to latest completed model
            active_rec = (
                db.query(ModelRun)
                .filter(ModelRun.status == "completed")
                .order_by(ModelRun.id.desc())
                .first()
            )

        if active_rec and active_rec.artifact_path and os.path.exists(active_rec.artifact_path):
            cls._active_pipeline = joblib.load(active_rec.artifact_path)
            cls._active_model_version = active_rec.model_version
            cls._active_model_name = active_rec.model_name
            return cls._active_pipeline, cls._active_model_version, cls._active_model_name

        raise RuntimeError("No trained model available. Please train a classifier in the Model Lab.")

    @classmethod
    def predict_complaint(
        cls,
        db: Session,
        text: str,
        uncertainty_threshold: float = 0.55,
        model_version: str | None = None
    ) -> PredictionResponse:
        """
        Predicts complaint category, returns calibrated confidence, flags uncertainty,
        and extracts top influential terms for the predicted class.
        """
        cleaned_text = default_preprocessor.clean_text(text)
        if not cleaned_text:
            raise ValueError("Input text is empty after preprocessing.")

        pipeline, version, model_name = cls.get_active_pipeline(db)
        if model_version:
            rec = db.query(ModelRun).filter(ModelRun.model_version == model_version).first()
            if rec and rec.artifact_path and os.path.exists(rec.artifact_path):
                pipeline = joblib.load(rec.artifact_path)
                version = rec.model_version
                model_name = rec.model_name

        # Calculate class probabilities
        if hasattr(pipeline, "predict_proba"):
            probs = pipeline.predict_proba([cleaned_text])[0]
            classes = pipeline.classes_
        else:
            # Calibrated probability fallback
            decision_scores = pipeline.decision_function([cleaned_text])[0]
            if len(decision_scores.shape) == 1:
                # Softmax for multi-class
                exp_scores = np.exp(decision_scores - np.max(decision_scores))
                probs = exp_scores / np.sum(exp_scores)
            else:
                probs = np.ones(len(pipeline.classes_)) / len(pipeline.classes_)
            classes = pipeline.classes_

        class_prob_dict = {str(c): float(round(p, 4)) for c, p in zip(classes, probs)}
        best_idx = int(np.argmax(probs))
        predicted_category = str(classes[best_idx])
        confidence = float(round(probs[best_idx], 4))

        # Confidence level
        if confidence >= 0.75:
            confidence_level = "High"
        elif confidence >= 0.55:
            confidence_level = "Medium"
        else:
            confidence_level = "Low"

        is_uncertain = confidence < uncertainty_threshold

        # Influential terms extraction
        influential_terms = cls._extract_influential_terms(pipeline, cleaned_text, best_idx)

        return PredictionResponse(
            predicted_category=predicted_category,
            confidence=confidence,
            confidence_level=confidence_level,
            is_uncertain=is_uncertain,
            model_name=model_name,
            model_version=version,
            influential_terms=influential_terms,
            all_class_probabilities=class_prob_dict
        )

    @classmethod
    def _extract_influential_terms(cls, pipeline: Pipeline, text: str, class_idx: int) -> list[InfluentialTerm]:
        """Extracts top predictive terms from input text supporting the predicted class."""
        try:
            tfidf: TfidfVectorizer = pipeline.named_steps["tfidf"]
            clf = pipeline.named_steps["clf"]

            feature_names = np.array(tfidf.get_feature_names_out())
            tfidf_vec = tfidf.transform([text]).toarray()[0]
            present_indices = np.where(tfidf_vec > 0)[0]

            if len(present_indices) == 0:
                return []

            # Determine weights according to model type
            if hasattr(clf, "feature_log_prob_"): # Naive Bayes
                log_probs = clf.feature_log_prob_[class_idx]
                mean_log_probs = np.mean(clf.feature_log_prob_, axis=0)
                term_scores = (log_probs[present_indices] - mean_log_probs[present_indices]) * tfidf_vec[present_indices]
            elif hasattr(clf, "coef_"): # Logistic Regression
                coef = clf.coef_[class_idx] if len(clf.coef_.shape) > 1 else clf.coef_
                term_scores = coef[present_indices] * tfidf_vec[present_indices]
            elif hasattr(clf, "calibrated_classifiers_"): # CalibratedClassifierCV (Linear SVM)
                # Average calibrated coefficients or weights across base estimators
                base_coefs = [
                    cc.estimator.coef_[class_idx] if len(cc.estimator.coef_.shape) > 1 else cc.estimator.coef_
                    for cc in clf.calibrated_classifiers_
                    if hasattr(cc.estimator, "coef_")
                ]
                if base_coefs:
                    avg_coef = np.mean(base_coefs, axis=0)
                    term_scores = avg_coef[present_indices] * tfidf_vec[present_indices]
                else:
                    term_scores = tfidf_vec[present_indices]
            else:
                term_scores = tfidf_vec[present_indices]

            top_k = min(8, len(present_indices))
            sorted_order = np.argsort(term_scores)[::-1][:top_k]

            results = []
            for idx in sorted_order:
                orig_feature_idx = present_indices[idx]
                score = float(round(term_scores[idx], 4))
                term = str(feature_names[orig_feature_idx])
                results.append(InfluentialTerm(term=term, weight=score))

            return results
        except Exception:
            # Fallback to tf-idf weight
            return []

    @classmethod
    def get_model_comparison(cls, db: Session) -> ModelComparisonResponse:
        """Retrieves history of model runs and finds the best performer by Macro-F1."""
        runs = db.query(ModelRun).filter(ModelRun.status == "completed").order_by(ModelRun.id.desc()).all()
        models_resp = []
        best_macro_f1 = -1.0
        best_model_name = None

        for r in runs:
            m = r.evaluation_metrics or {}
            macro_f1 = float(m.get("macro_f1", 0.0))
            if macro_f1 > best_macro_f1:
                best_macro_f1 = macro_f1
                best_model_name = f"{r.model_name} ({r.model_version})"

            models_resp.append(
                ModelMetricsResponse(
                    id=r.id,
                    model_name=r.model_name,
                    model_version=r.model_version,
                    status=r.status,
                    is_active=r.is_active,
                    train_count=r.train_count,
                    test_count=r.test_count,
                    started_at=r.started_at,
                    completed_at=r.completed_at,
                    accuracy=float(m.get("accuracy", 0.0)),
                    macro_f1=macro_f1,
                    weighted_f1=float(m.get("weighted_f1", 0.0)),
                    macro_precision=float(m.get("macro_precision", 0.0)),
                    macro_recall=float(m.get("macro_recall", 0.0)),
                    per_class_metrics=m.get("per_class", {}),
                    confusion_matrix=m.get("confusion_matrix", {}),
                    vectorizer_configuration=r.vectorizer_configuration or {},
                    duration_seconds=float(m.get("duration_seconds", 0.0))
                )
            )

        return ModelComparisonResponse(
            models=models_resp,
            best_model_by_macro_f1=best_model_name,
            total_evaluated=len(models_resp)
        )
