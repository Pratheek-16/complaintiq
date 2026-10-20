import sys
import os

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.database import SessionLocal, Base, engine
import app.models
from app.models.complaint import Complaint
from app.models.investigation import Investigation, InvestigationNote
from app.schemas.dataset import ColumnMapping
from app.schemas.ml import ModelTrainRequest
from app.schemas.topic import TopicDiscoveryRequest
from app.services.ingestion_service import IngestionService
from app.services.ml_service import MLService
from app.services.topic_service import TopicService
from app.services.priority_service import PriorityService

def seed_system():
    print("=== Initializing ComplaintIQ Database & Analytical Pipeline ===")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    existing_count = db.query(Complaint).count()
    if existing_count > 0:
        print(f"Database already contains {existing_count} complaint records.")
    else:
        sample_path = os.path.join(os.path.dirname(backend_dir), "data", "sample_customer_complaints.csv")
        if not os.path.exists(sample_path):
            print(f"Sample file not found at: {sample_path}")
            return

        print(f"Importing benchmark complaints from: {sample_path}...")
        mapping = ColumnMapping(
            text_column="Complaint_Text",
            category_column="Category",
            date_column="Date_Received",
            product_column="Product",
            company_column="Company",
            location_column="Location",
            department_column="Department",
            severity_column="Severity",
            external_id_column="Complaint_ID"
        )
        import_record = IngestionService.import_dataset(
            db=db,
            file_path=sample_path,
            mapping=mapping,
            max_rows=1500
        )
        print(f"Successfully imported {import_record.accepted_rows} complaints into database!")

    # Train and benchmark ML classifiers
    print("\n=== Training & Benchmarking Supervised Classifiers ===")
    train_req = ModelTrainRequest(
        model_name="all",
        test_size=0.20,
        ngram_range=(1, 2),
        max_features=5000,
        min_df=1,
        stratify=True
    )
    models_evaluated = MLService.train_and_evaluate_models(db, train_req)
    for m in models_evaluated:
        print(f" - Model: {m.model_name.upper()} | Accuracy: {m.accuracy:.4f} | Macro-F1: {m.macro_f1:.4f} | Active: {m.is_active}")

    # Discover initial latent themes using NMF
    print("\n=== Running Unsupervised Theme Discovery (NMF) ===")
    topic_req = TopicDiscoveryRequest(algorithm="nmf", num_topics=5, num_keywords=8)
    topic_res = TopicService.discover_topics(db, topic_req)
    for t in topic_res.topics:
        kw_str = ", ".join([f"{k.term} ({k.weight:.2f})" for k in t.keywords[:4]])
        print(f" - {t.topic_name} [{t.prevalence_percentage}% prevalence]: {kw_str}")

    # Seed initial investigation case if none exist
    if db.query(Investigation).count() == 0:
        print("\n=== Seeding Initial Root-Cause Investigation Case ===")
        inv = Investigation(
            title="Inaccurate Derogatory Balance Reporting Spike in Credit Repair",
            description="Operational audit triggered by 48% surge in derogatory account reporting disputes. Investigation launched to audit automated data furnishers.",
            issue_category="Credit Reporting & Repair",
            priority_score=84.5,
            priority_level="High",
            assigned_department="Credit Bureau Auditing",
            status="investigating"
        )
        db.add(inv)
        db.commit()
        db.refresh(inv)

        note1 = InvestigationNote(
            investigation_id=inv.id,
            author="Lead Auditor",
            note="Dispute documentation shows high failure rate in data furnisher batch verification scripts."
        )
        note2 = InvestigationNote(
            investigation_id=inv.id,
            author="Compliance Specialist",
            note="Subpoenaed transaction logs from EquiData Bureau Corp for cross-matching."
        )
        db.add(note1)
        db.add(note2)
        db.commit()
        print("Created sample investigation with 2 analyst audit notes.")

    # Calculate Priorities
    print("\n=== Calculating Priority Engine Scores ===")
    priorities = PriorityService.calculate_priorities(db)
    for p in priorities[:3]:
        print(f" - [{p.priority_level}] {p.category}: Score {p.total_score} ({p.explanation[:80]}...)")

    db.close()
    print("\n>>> System Seeding & Pipeline Calibration Complete! <<<")

if __name__ == "__main__":
    seed_system()
