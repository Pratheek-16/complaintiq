import csv
import io
from typing import Any
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.complaint import Complaint
from app.models.model_run import ModelRun
from app.models.investigation import Investigation
from app.services.priority_service import PriorityService

class ReportService:
    @staticmethod
    def export_complaints_csv(
        db: Session,
        category: str | None = None,
        review_status: str | None = None,
        severity: str | None = None,
        search: str | None = None,
        limit: int = 5000
    ) -> str:
        """Exports filtered complaint records to CSV string."""
        q = db.query(Complaint)
        if category:
            q = q.filter(Complaint.actual_category == category)
        if review_status:
            q = q.filter(Complaint.review_status == review_status)
        if severity:
            q = q.filter(Complaint.severity == severity)
        if search:
            q = q.filter(Complaint.original_text.ilike(f"%{search}%"))

        records = q.order_by(Complaint.id.asc()).limit(limit).all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "ID", "External ID", "Original Text", "Actual Category",
            "Predicted Category", "Confidence", "Is Uncertain",
            "Product", "Company", "Location", "Severity", "Received Date",
            "Review Status", "Reviewed Category", "Investigation Status"
        ])

        for r in records:
            writer.writerow([
                r.id,
                r.external_record_id or "",
                r.original_text.replace("\n", " ").replace("\r", " "),
                r.actual_category or "",
                r.predicted_category or "",
                r.prediction_confidence or "",
                r.is_uncertain,
                r.product or "",
                r.company or "",
                r.location or "",
                r.severity or "",
                r.received_at.strftime("%Y-%m-%d") if r.received_at else "",
                r.review_status,
                r.reviewed_category or "",
                r.investigation_status
            ])

        return output.getvalue()

    @staticmethod
    def export_model_metrics_csv(db: Session) -> str:
        """Exports model comparison evaluation metrics to CSV."""
        runs = db.query(ModelRun).filter(ModelRun.status == "completed").order_by(ModelRun.id.desc()).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Model ID", "Model Name", "Version", "Is Active",
            "Accuracy", "Macro F1", "Weighted F1", "Macro Precision", "Macro Recall",
            "Train Samples", "Test Samples", "Duration (sec)", "Completed At"
        ])

        for r in runs:
            m = r.evaluation_metrics or {}
            writer.writerow([
                r.id,
                r.model_name,
                r.model_version,
                r.is_active,
                m.get("accuracy", 0.0),
                m.get("macro_f1", 0.0),
                m.get("weighted_f1", 0.0),
                m.get("macro_precision", 0.0),
                m.get("macro_recall", 0.0),
                r.train_count,
                r.test_count,
                m.get("duration_seconds", 0.0),
                r.completed_at.strftime("%Y-%m-%d %H:%M:%S") if r.completed_at else ""
            ])

        return output.getvalue()

    @staticmethod
    def export_priorities_csv(db: Session) -> str:
        """Exports calculated category priorities to CSV."""
        priorities = PriorityService.calculate_priorities(db)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Category", "Total Priority Score", "Priority Level",
            "Complaint Count", "Normalized Volume", "Recent Growth Rate (%)",
            "Normalized Growth", "Normalized Severity", "Explanation"
        ])

        for p in priorities:
            writer.writerow([
                p.category,
                p.total_score,
                p.priority_level,
                p.complaint_count,
                p.normalized_volume,
                p.recent_growth_rate,
                p.normalized_growth,
                p.normalized_severity if p.normalized_severity is not None else "N/A",
                p.explanation
            ])

        return output.getvalue()

    @staticmethod
    def export_investigations_csv(db: Session) -> str:
        """Exports investigation case summaries to CSV."""
        invs = db.query(Investigation).order_by(Investigation.id.asc()).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "ID", "Title", "Issue Category", "Status", "Priority Score",
            "Priority Level", "Department", "Created At", "Notes Count", "Description"
        ])

        for i in invs:
            writer.writerow([
                i.id,
                i.title,
                i.issue_category or "",
                i.status,
                i.priority_score,
                i.priority_level,
                i.assigned_department or "",
                i.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                len(i.notes),
                i.description.replace("\n", " ").replace("\r", " ")
            ])

        return output.getvalue()
