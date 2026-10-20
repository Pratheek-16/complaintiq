from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["app"] == "ComplaintIQ"

def test_available_files_endpoint():
    resp = client.get("/api/v1/datasets/available-files")
    assert resp.status_code == 200
    data = resp.json()
    assert "available_files" in data
    # At least complaints.csv in workspace root should be listed
    filenames = [f["name"] for f in data["available_files"]]
    assert "complaints.csv" in filenames

def test_preview_sample_dataset():
    resp = client.get("/api/v1/datasets/preview", params={"file_path": "data/sample_customer_complaints.csv"})
    assert resp.status_code == 200
    data = resp.json()
    assert "available_columns" in data
    assert "preview_rows" in data
    assert len(data["preview_rows"]) > 0

def test_import_sample_dataset():
    # Import 50 rows
    mapping = {
        "text_column": "Complaint_Text",
        "category_column": "Category",
        "date_column": "Date_Received",
        "product_column": "Product",
        "company_column": "Company",
        "location_column": "Location",
        "department_column": "Department",
        "severity_column": "Severity",
        "external_id_column": "Complaint_ID"
    }
    payload = {
        "filename": "data/sample_customer_complaints.csv",
        "column_mapping": mapping,
        "max_rows": 60
    }
    resp = client.post("/api/v1/datasets/import", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["accepted_rows"] >= 50

def test_complaints_pagination_and_review():
    # List complaints
    resp = client.get("/api/v1/complaints", params={"page": 1, "page_size": 10})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) > 0
    first_id = data["items"][0]["id"]

    # Review complaint
    review_payload = {
        "reviewed_category": "Credit Reporting & Repair",
        "review_notes": "Verified by human auditor."
    }
    rev_resp = client.patch(f"/api/v1/complaints/{first_id}/review", json=review_payload)
    assert rev_resp.status_code == 200
    rev_data = rev_resp.json()
    assert rev_data["review_status"] in ["confirmed", "corrected"]
    assert rev_data["reviewed_category"] == "Credit Reporting & Repair"

def test_analytics_endpoints():
    overview_resp = client.get("/api/v1/analytics/overview")
    assert overview_resp.status_code == 200
    overview_data = overview_resp.json()
    assert overview_data["total_complaints"] >= 50

    priorities_resp = client.get("/api/v1/analytics/priorities")
    assert priorities_resp.status_code == 200
    assert len(priorities_resp.json()) > 0
