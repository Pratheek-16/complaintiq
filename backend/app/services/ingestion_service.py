import os
import csv
from datetime import datetime
from typing import Any, Tuple
from dateutil import parser as date_parser
from sqlalchemy.orm import Session
from app.config import settings
from app.models.complaint import Complaint
from app.models.dataset_import import DatasetImport
from app.models.audit import AuditEvent
from app.schemas.dataset import ColumnMapping, ValidationReport, DatasetPreviewResponse
from app.services.preprocessing import default_preprocessor

class IngestionService:
    @staticmethod
    def inspect_csv_file(file_path: str, preview_limit: int = 10) -> DatasetPreviewResponse:
        """Inspects CSV header and extracts preview rows and suggested mapping."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Dataset file not found at: {file_path}")

        preview_rows = []
        available_columns = []
        total_rows_estimated = 0

        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            available_columns = reader.fieldnames or []
            for i, row in enumerate(reader):
                if i < preview_limit:
                    preview_rows.append({k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()})
                total_rows_estimated += 1
                if total_rows_estimated >= 100000:
                    break # Cap fast estimate for multi-gigabyte files

        suggested_mapping = IngestionService.detect_column_mapping(available_columns)

        return DatasetPreviewResponse(
            filename=os.path.basename(file_path),
            available_columns=available_columns,
            total_detected_rows=total_rows_estimated,
            preview_rows=preview_rows,
            suggested_mapping=suggested_mapping
        )

    @staticmethod
    def detect_column_mapping(columns: list[str]) -> ColumnMapping:
        """Heuristically infers column mappings based on common column names."""
        col_lower = {c.lower(): c for c in columns}

        def find_match(*candidates: str) -> str | None:
            for candidate in candidates:
                for col_name, original in col_lower.items():
                    if candidate == col_name or candidate in col_name:
                        return original
            return None

        text_col = find_match(
            "consumer complaint narrative", "complaint_narrative", "complaint_text",
            "narrative", "complaint", "description", "issue", "text", "body", "review"
        ) or (columns[0] if columns else "text")

        category_col = find_match("product", "category", "sub-product", "issue_type", "label", "topic")
        date_col = find_match("date received", "date_received", "received_at", "date", "timestamp", "created_at")
        product_col = find_match("sub-product", "product", "product_name")
        company_col = find_match("company", "organization", "merchant", "vendor")
        location_col = find_match("state", "location", "zip code", "region", "country")
        dept_col = find_match("department", "team", "unit", "channel")
        severity_col = find_match("severity", "priority", "rating", "urgency")
        id_col = find_match("complaint id", "complaint_id", "id", "ticket_id", "external_id")

        return ColumnMapping(
            text_column=text_col,
            category_column=category_col,
            date_column=date_col,
            product_column=product_col,
            company_column=company_col,
            location_column=location_col,
            department_column=dept_col,
            severity_column=severity_col,
            external_id_column=id_col
        )

    @staticmethod
    def validate_dataset(file_path: str, mapping: ColumnMapping, sample_size: int = 5000) -> ValidationReport:
        """Validates CSV rows against the requested column mapping without storing."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        total_inspected = 0
        valid_count = 0
        rejection_reasons = {
            "empty_or_missing_text": 0,
            "text_too_short": 0,
            "malformed_date": 0,
            "duplicate_text": 0
        }
        category_counts: dict[str, int] = {}
        seen_texts = set()
        min_date: datetime | None = None
        max_date: datetime | None = None
        warnings = []
        errors = []

        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []

            if mapping.text_column not in headers:
                errors.append(f"Mapped text column '{mapping.text_column}' does not exist in CSV headers.")
                return ValidationReport(
                    is_valid=False,
                    total_rows_inspected=0,
                    valid_rows_count=0,
                    rejected_rows_count=0,
                    rejection_reasons=rejection_reasons,
                    column_stats={},
                    detected_categories=[],
                    warnings=[],
                    errors=errors
                )

            for row in reader:
                total_inspected += 1
                raw_text = row.get(mapping.text_column, "").strip()

                # If text column is 'Issue' and 'Sub-issue' exists, allow combining
                if (not raw_text or len(raw_text) < 10) and "Sub-issue" in row and row.get("Sub-issue"):
                    raw_text = f"{raw_text} - {row.get('Sub-issue')}".strip(" -")

                if not raw_text:
                    rejection_reasons["empty_or_missing_text"] += 1
                    continue

                cleaned = default_preprocessor.clean_text(raw_text)
                if not default_preprocessor.is_usable_document(cleaned, min_words=2):
                    rejection_reasons["text_too_short"] += 1
                    continue

                # Deduplication check in sample
                text_hash = hash(cleaned)
                if text_hash in seen_texts:
                    rejection_reasons["duplicate_text"] += 1
                    # We report duplicates but do not necessarily reject entirely unless strict
                else:
                    seen_texts.add(text_hash)

                # Date parsing check
                if mapping.date_column and row.get(mapping.date_column):
                    try:
                        d = date_parser.parse(row[mapping.date_column])
                        if min_date is None or d < min_date:
                            min_date = d
                        if max_date is None or d > max_date:
                            max_date = d
                    except Exception:
                        rejection_reasons["malformed_date"] += 1

                # Category tracking
                if mapping.category_column:
                    cat = row.get(mapping.category_column, "").strip() or "Uncategorized"
                    category_counts[cat] = category_counts.get(cat, 0) + 1

                valid_count += 1
                if total_inspected >= sample_size:
                    break

        rejected_count = sum(rejection_reasons.values())

        if valid_count == 0:
            errors.append("No valid records found in dataset with current column mapping.")
        if mapping.category_column and len(category_counts) < 2:
            warnings.append("Fewer than 2 distinct categories detected. Supervised classification requires at least 2 classes.")
        if not mapping.date_column:
            warnings.append("No date column mapped. Temporal trend analysis will be disabled.")
        if not mapping.severity_column:
            warnings.append("No severity column mapped. Alternative volume-and-growth priority scoring will be used.")

        detected_categories = [
            {"category": cat, "count": count, "percentage": round(count / valid_count * 100, 2) if valid_count else 0}
            for cat, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:20]
        ]

        date_range_info = None
        if min_date and max_date:
            date_range_info = {
                "start": min_date.strftime("%Y-%m-%d"),
                "end": max_date.strftime("%Y-%m-%d"),
                "span_days": (max_date - min_date).days
            }

        return ValidationReport(
            is_valid=len(errors) == 0 and valid_count > 0,
            total_rows_inspected=total_inspected,
            valid_rows_count=valid_count,
            rejected_rows_count=rejected_count,
            rejection_reasons=rejection_reasons,
            column_stats={"unique_texts_in_sample": len(seen_texts), "distinct_categories": len(category_counts)},
            detected_categories=detected_categories,
            date_range=date_range_info,
            warnings=warnings,
            errors=errors
        )

    @staticmethod
    def import_dataset(
        db: Session,
        file_path: str,
        mapping: ColumnMapping,
        max_rows: int | None = 10000,
        offset_rows: int = 0
    ) -> DatasetImport:
        """Imports CSV records into the complaints table and records audit log."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        import_record = DatasetImport(
            filename=os.path.basename(file_path),
            import_status="processing",
            column_mapping=mapping.model_dump(),
            validation_summary={}
        )
        db.add(import_record)
        db.commit()
        db.refresh(import_record)

        accepted_count = 0
        rejected_count = 0
        rejection_reasons = {
            "empty_or_missing_text": 0,
            "text_too_short": 0,
            "malformed_date": 0
        }

        complaint_batch: list[Complaint] = []
        batch_size = 500

        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            
            # Skip offset rows if specified
            current_row = 0
            while current_row < offset_rows:
                try:
                    next(reader)
                    current_row += 1
                except StopIteration:
                    break

            for row in reader:
                if max_rows and accepted_count >= max_rows:
                    break

                raw_text = row.get(mapping.text_column, "").strip() if mapping.text_column else ""

                # If raw_text is short and Sub-issue is present, combine them
                if (not raw_text or len(raw_text) < 10) and "Sub-issue" in row and row.get("Sub-issue"):
                    raw_text = f"{raw_text} - {row.get('Sub-issue')}".strip(" -")

                if not raw_text:
                    rejected_count += 1
                    rejection_reasons["empty_or_missing_text"] += 1
                    continue

                cleaned_text = default_preprocessor.clean_text(raw_text)
                if not default_preprocessor.is_usable_document(cleaned_text, min_words=2):
                    rejected_count += 1
                    rejection_reasons["text_too_short"] += 1
                    continue

                # Parse date if available
                parsed_date = None
                if mapping.date_column and row.get(mapping.date_column):
                    try:
                        parsed_date = date_parser.parse(row[mapping.date_column])
                    except Exception:
                        rejection_reasons["malformed_date"] += 1

                category = row.get(mapping.category_column, "").strip() if mapping.category_column else None
                product = row.get(mapping.product_column, "").strip() if mapping.product_column else None
                company = row.get(mapping.company_column, "").strip() if mapping.company_column else None
                location = row.get(mapping.location_column, "").strip() if mapping.location_column else None
                department = row.get(mapping.department_column, "").strip() if mapping.department_column else None
                severity = row.get(mapping.severity_column, "").strip() if mapping.severity_column else None
                ext_id = row.get(mapping.external_id_column, "").strip() if mapping.external_id_column else None

                complaint = Complaint(
                    original_text=raw_text,
                    cleaned_text=cleaned_text,
                    actual_category=category if category else None,
                    product=product if product else None,
                    company=company if company else None,
                    location=location if location else None,
                    department=department if department else None,
                    severity=severity if severity else None,
                    external_record_id=ext_id if ext_id else None,
                    received_at=parsed_date,
                    review_status="unreviewed",
                    investigation_status="unassigned"
                )
                complaint_batch.append(complaint)
                accepted_count += 1

                if len(complaint_batch) >= batch_size:
                    db.bulk_save_objects(complaint_batch)
                    db.commit()
                    complaint_batch.clear()

            if complaint_batch:
                db.bulk_save_objects(complaint_batch)
                db.commit()
                complaint_batch.clear()

        # Update dataset import record
        import_record.import_status = "completed"
        import_record.total_rows = accepted_count + rejected_count
        import_record.accepted_rows = accepted_count
        import_record.rejected_rows = rejected_count
        import_record.completed_at = datetime.utcnow()
        import_record.validation_summary = {
            "rejection_reasons": rejection_reasons,
            "processed_at": datetime.utcnow().isoformat(),
            "max_rows_limit": max_rows
        }
        
        # Audit event
        audit = AuditEvent(
            event_type="DATASET_IMPORTED",
            entity_type="DatasetImport",
            entity_id=import_record.id,
            details={"filename": import_record.filename, "accepted": accepted_count, "rejected": rejected_count}
        )
        db.add(audit)
        db.commit()
        db.refresh(import_record)

        return import_record
