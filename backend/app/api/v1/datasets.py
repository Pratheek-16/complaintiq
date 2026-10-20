import os
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.dataset_import import DatasetImport
from app.schemas.dataset import (
    ColumnMapping,
    ValidationReport,
    DatasetPreviewResponse,
    DatasetImportRequest,
    DatasetImportResponse,
)
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/datasets", tags=["Datasets"])

@router.get("/available-files")
def list_available_files():
    """Lists CSV datasets detected in the workspace and data directories."""
    files = []
    # 1. Project root directory
    root_dir = settings.BASE_DIR.parent
    for fname in os.listdir(root_dir):
        if fname.lower().endswith(".csv") and not fname.startswith("."):
            full_path = os.path.join(root_dir, fname)
            size_mb = round(os.path.getsize(full_path) / (1024 * 1024), 2)
            files.append({
                "name": fname,
                "location": "workspace_root",
                "path": full_path,
                "size_mb": size_mb,
                "is_project_dataset": fname == "complaints.csv"
            })

    # 2. Data directory
    if os.path.exists(settings.DATA_DIR):
        for fname in os.listdir(settings.DATA_DIR):
            if fname.lower().endswith(".csv"):
                full_path = os.path.join(settings.DATA_DIR, fname)
                size_mb = round(os.path.getsize(full_path) / (1024 * 1024), 2)
                files.append({
                    "name": fname,
                    "location": "data_dir",
                    "path": full_path,
                    "size_mb": size_mb,
                    "is_project_dataset": False
                })

    return {"available_files": files}

@router.post("/upload")
async def upload_csv_dataset(file: UploadFile = File(...)):
    """Uploads a CSV file to the data directory for inspection and ingestion."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    dest_path = os.path.join(settings.DATA_DIR, file.filename)
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    preview = IngestionService.inspect_csv_file(dest_path)
    return {"message": "File uploaded successfully", "preview": preview}

@router.get("/preview")
def preview_dataset(file_path: str = Query(..., description="Full path or filename of CSV")):
    """Inspects a CSV and suggests column mappings."""
    # Resolve relative paths or filenames
    target_path = file_path
    if not os.path.exists(target_path):
        # Check workspace root
        root_path = os.path.join(settings.BASE_DIR.parent, file_path)
        if os.path.exists(root_path):
            target_path = root_path
        else:
            # Check data dir
            data_path = os.path.join(settings.DATA_DIR, file_path)
            if os.path.exists(data_path):
                target_path = data_path
            else:
                raise HTTPException(status_code=404, detail=f"Dataset file '{file_path}' not found.")

    try:
        preview = IngestionService.inspect_csv_file(target_path)
        return preview
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/validate", response_model=ValidationReport)
def validate_dataset_mapping(file_path: str, mapping: ColumnMapping, sample_size: int = Query(5000)):
    """Validates the column mapping on a sample of the dataset."""
    target_path = file_path
    if not os.path.exists(target_path):
        root_path = os.path.join(settings.BASE_DIR.parent, file_path)
        if os.path.exists(root_path):
            target_path = root_path
        else:
            data_path = os.path.join(settings.DATA_DIR, file_path)
            if os.path.exists(data_path):
                target_path = data_path
            else:
                raise HTTPException(status_code=404, detail=f"File '{file_path}' not found.")

    try:
        return IngestionService.validate_dataset(target_path, mapping, sample_size)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/import", response_model=DatasetImportResponse)
def import_dataset(req: DatasetImportRequest, db: Session = Depends(get_db)):
    """Executes dataset import into the complaints database table."""
    target_path = req.filename
    if not os.path.exists(target_path):
        root_path = os.path.join(settings.BASE_DIR.parent, req.filename)
        if os.path.exists(root_path):
            target_path = root_path
        else:
            data_path = os.path.join(settings.DATA_DIR, req.filename)
            if os.path.exists(data_path):
                target_path = data_path
            else:
                raise HTTPException(status_code=404, detail=f"File '{req.filename}' not found.")

    try:
        import_record = IngestionService.import_dataset(
            db=db,
            file_path=target_path,
            mapping=req.column_mapping,
            max_rows=req.max_rows,
            offset_rows=req.offset_rows or 0
        )

        return DatasetImportResponse(
            import_id=import_record.id,
            status=import_record.import_status,
            total_rows=import_record.total_rows,
            accepted_rows=import_record.accepted_rows,
            rejected_rows=import_record.rejected_rows,
            validation_summary=import_record.validation_summary or {},
            message=f"Successfully imported {import_record.accepted_rows} records into ComplaintIQ database."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/imports")
def list_dataset_imports(db: Session = Depends(get_db)):
    """Lists historical dataset imports."""
    records = db.query(DatasetImport).order_by(DatasetImport.created_at.desc()).all()
    return records
