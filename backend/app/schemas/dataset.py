from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field

class ColumnMapping(BaseModel):
    text_column: str = Field(..., description="Column containing complaint text / issue narrative")
    category_column: Optional[str] = Field(None, description="Column containing actual category / product")
    date_column: Optional[str] = Field(None, description="Column containing date received")
    product_column: Optional[str] = Field(None, description="Product / service name column")
    company_column: Optional[str] = Field(None, description="Company column")
    location_column: Optional[str] = Field(None, description="State / geographic location column")
    department_column: Optional[str] = Field(None, description="Department column")
    severity_column: Optional[str] = Field(None, description="Severity rating column")
    external_id_column: Optional[str] = Field(None, description="External reference ID column")

class ValidationReport(BaseModel):
    is_valid: bool
    total_rows_inspected: int
    valid_rows_count: int
    rejected_rows_count: int
    rejection_reasons: dict[str, int]
    column_stats: dict[str, Any]
    detected_categories: list[dict[str, Any]]
    date_range: Optional[dict[str, Any]] = None
    warnings: list[str] = []
    errors: list[str] = []

class DatasetPreviewResponse(BaseModel):
    filename: str
    available_columns: list[str]
    total_detected_rows: int
    preview_rows: list[dict[str, Any]]
    suggested_mapping: ColumnMapping

class DatasetImportRequest(BaseModel):
    filename: str
    column_mapping: ColumnMapping
    max_rows: Optional[int] = Field(None, description="Optional limit of rows to import")
    offset_rows: Optional[int] = Field(0, description="Optional offset of rows")

class DatasetImportResponse(BaseModel):
    import_id: int
    status: str
    total_rows: int
    accepted_rows: int
    rejected_rows: int
    validation_summary: dict[str, Any]
    message: str
