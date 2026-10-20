from typing import Any
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.complaint import Complaint
from app.models.investigation import Investigation, InvestigationNote
from app.models.audit import AuditEvent
from app.schemas.investigation import (
    InvestigationCreate,
    InvestigationUpdate,
    InvestigationResponse,
    InvestigationNoteCreate,
    InvestigationNoteResponse,
)

class InvestigationService:
    @staticmethod
    def explore_root_cause_evidence(
        db: Session,
        category: str,
        limit_samples: int = 5
    ) -> dict[str, Any]:
        """
        Analyzes observational distributions across products, companies, locations,
        and temporal periods to discover potential contributing factors.
        Strictly frames results as correlation / observational evidence, not proven causality.
        """
        base_query = db.query(Complaint).filter(Complaint.actual_category == category)
        total_in_category = base_query.count()

        if total_in_category == 0:
            return {
                "category": category,
                "total_complaints": 0,
                "disclaimer": "Correlation does not imply causation. These patterns represent observed co-occurrences.",
                "product_breakdown": [],
                "company_breakdown": [],
                "location_breakdown": [],
                "representative_evidence": []
            }

        # 1. Product breakdown
        product_counts = (
            db.query(Complaint.product, func.count(Complaint.id).label("cnt"))
            .filter(Complaint.actual_category == category)
            .filter(Complaint.product.isnot(None))
            .filter(Complaint.product != "")
            .group_by(Complaint.product)
            .order_by(func.count(Complaint.id).desc())
            .limit(8)
            .all()
        )
        products = [{"product": p[0], "count": p[1], "pct": round((p[1] / total_in_category) * 100, 1)} for p in product_counts]

        # 2. Company breakdown
        company_counts = (
            db.query(Complaint.company, func.count(Complaint.id).label("cnt"))
            .filter(Complaint.actual_category == category)
            .filter(Complaint.company.isnot(None))
            .filter(Complaint.company != "")
            .group_by(Complaint.company)
            .order_by(func.count(Complaint.id).desc())
            .limit(8)
            .all()
        )
        companies = [{"company": c[0], "count": c[1], "pct": round((c[1] / total_in_category) * 100, 1)} for c in company_counts]

        # 3. Location breakdown
        location_counts = (
            db.query(Complaint.location, func.count(Complaint.id).label("cnt"))
            .filter(Complaint.actual_category == category)
            .filter(Complaint.location.isnot(None))
            .filter(Complaint.location != "")
            .group_by(Complaint.location)
            .order_by(func.count(Complaint.id).desc())
            .limit(8)
            .all()
        )
        locations = [{"location": l[0], "count": l[1], "pct": round((l[1] / total_in_category) * 100, 1)} for l in location_counts]

        # 4. Representative complaint evidence
        samples = (
            db.query(Complaint.id, Complaint.original_text, Complaint.received_at, Complaint.company, Complaint.product)
            .filter(Complaint.actual_category == category)
            .order_by(Complaint.id.desc())
            .limit(limit_samples)
            .all()
        )

        evidence = [
            {
                "id": s[0],
                "text": s[1],
                "received_at": s[2].strftime("%Y-%m-%d") if s[2] else None,
                "company": s[3],
                "product": s[4]
            }
            for s in samples
        ]

        # Synthesize possible contributing factors
        contributing_factors = []
        if companies and companies[0]["pct"] >= 25.0:
            contributing_factors.append(
                f"Concentration in company '{companies[0]['company']}' ({companies[0]['pct']}% of issues in this category)."
            )
        if products and products[0]["pct"] >= 30.0:
            contributing_factors.append(
                f"High association with product line '{products[0]['product']}' ({products[0]['pct']}%)."
            )
        if locations and locations[0]["pct"] >= 20.0:
            contributing_factors.append(
                f"Geographic cluster observed in region '{locations[0]['location']}' ({locations[0]['pct']}%)."
            )

        return {
            "category": category,
            "total_complaints": total_in_category,
            "disclaimer": "Observational correlation only. Formal root-cause determination requires operational audit.",
            "possible_contributing_factors": contributing_factors,
            "product_breakdown": products,
            "company_breakdown": companies,
            "location_breakdown": locations,
            "representative_evidence": evidence
        }

    @staticmethod
    def create_investigation(db: Session, req: InvestigationCreate) -> InvestigationResponse:
        """Creates a new investigation case."""
        inv = Investigation(
            title=req.title,
            description=req.description,
            issue_category=req.issue_category,
            priority_score=req.priority_score or 0.0,
            priority_level=req.priority_level or "Medium",
            assigned_department=req.assigned_department,
            status="open",
            findings=req.findings
        )
        db.add(inv)
        db.commit()
        db.refresh(inv)

        # Audit
        db.add(AuditEvent(
            event_type="INVESTIGATION_CREATED",
            entity_type="Investigation",
            entity_id=inv.id,
            details={"title": inv.title, "category": inv.issue_category}
        ))
        db.commit()

        return InvestigationResponse.model_validate(inv)

    @staticmethod
    def update_investigation(db: Session, inv_id: int, req: InvestigationUpdate) -> InvestigationResponse:
        """Updates investigation details, status, or assignment."""
        inv = db.query(Investigation).filter(Investigation.id == inv_id).first()
        if not inv:
            raise ValueError(f"Investigation {inv_id} not found.")

        if req.title is not None:
            inv.title = req.title
        if req.description is not None:
            inv.description = req.description
        if req.status is not None:
            inv.status = req.status
        if req.assigned_department is not None:
            inv.assigned_department = req.assigned_department
        if req.priority_level is not None:
            inv.priority_level = req.priority_level
        if req.findings is not None:
            inv.findings = req.findings

        inv.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(inv)

        # Audit
        db.add(AuditEvent(
            event_type="INVESTIGATION_UPDATED",
            entity_type="Investigation",
            entity_id=inv.id,
            details={"status": inv.status, "department": inv.assigned_department}
        ))
        db.commit()

        return InvestigationResponse.model_validate(inv)

    @staticmethod
    def add_note(db: Session, inv_id: int, req: InvestigationNoteCreate) -> InvestigationNoteResponse:
        """Adds an analyst note to an investigation."""
        inv = db.query(Investigation).filter(Investigation.id == inv_id).first()
        if not inv:
            raise ValueError(f"Investigation {inv_id} not found.")

        note = InvestigationNote(
            investigation_id=inv_id,
            author=req.author or "Analyst",
            note=req.note
        )
        db.add(note)
        db.commit()
        db.refresh(note)

        return InvestigationNoteResponse.model_validate(note)

    @staticmethod
    def list_investigations(db: Session, status: str | None = None) -> list[InvestigationResponse]:
        """Lists all investigations with attached notes."""
        q = db.query(Investigation)
        if status:
            q = q.filter(Investigation.status == status)
        records = q.order_by(Investigation.updated_at.desc()).all()
        return [InvestigationResponse.model_validate(r) for r in records]

    @staticmethod
    def get_investigation(db: Session, inv_id: int) -> InvestigationResponse:
        """Retrieves single investigation by ID."""
        inv = db.query(Investigation).filter(Investigation.id == inv_id).first()
        if not inv:
            raise ValueError(f"Investigation {inv_id} not found.")
        return InvestigationResponse.model_validate(inv)
