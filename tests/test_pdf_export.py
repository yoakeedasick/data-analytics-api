import uuid
import pytest
from app.models.file import File, AnalysisResult
from tests.conftest import TestingSessionLocal

@pytest.fixture(scope="module")
def auth_header(client):
    # Register & login a test user
    user_data = {
        "email": "testpdf@example.com",
        "password": "securepassword",
        "fullName": "Test PDF User"
    }
    client.post("/auth/register", json=user_data)
    login_resp = client.post("/auth/login", json={
        "email": "testpdf@example.com",
        "password": "securepassword"
    })
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_export_pdf_not_found(client, auth_header):
    fake_id = str(uuid.uuid4())
    resp = client.get(f"/analysis/{fake_id}/export", headers=auth_header)
    assert resp.status_code == 404

def test_export_pdf_not_done(client, auth_header):
    db = TestingSessionLocal()
    from app.models.user import User
    user = db.query(User).filter(User.email == "testpdf@example.com").first()
    
    # Create a pending file record
    pending_file = File(
        user_id=user.user_id,
        file_name="pending_dataset.csv",
        s3_path="uploads/test.csv",
        status="pending",
        file_size=1024
    )
    db.add(pending_file)
    db.commit()
    file_id = str(pending_file.file_id)
    db.close()
    
    resp = client.get(f"/analysis/{file_id}/export", headers=auth_header)
    assert resp.status_code == 400
    assert "Analysis is not complete" in resp.json()["detail"]

def test_export_pdf_success(client, auth_header):
    db = TestingSessionLocal()
    from app.models.user import User
    user = db.query(User).filter(User.email == "testpdf@example.com").first()
    
    # Create a completed file record and a dummy analysis result entry
    done_file = File(
        user_id=user.user_id,
        file_name="valid_dataset.csv",
        s3_path="uploads/valid.csv",
        status="done",
        row_count=10,
        col_count=2,
        file_size=2048
    )
    db.add(done_file)
    db.commit()
    
    dummy_result = AnalysisResult(
        file_id=done_file.file_id,
        result_json={
            "column_names": ["col1", "col2"],
            "dtypes": {"col1": "int64", "col2": "float64"},
            "missing_values": {"col1": 0, "col2": 1},
            "missing_pct": {"col1": 0.0, "col2": 10.0},
            "describe": {
                "col1": {"count": 10, "mean": 5.0, "std": 1.0, "min": 0, "50%": 5, "max": 10}
            },
            "correlation": {
                "col1": {"col1": 1.0}
            }
        }
    )
    db.add(dummy_result)
    db.commit()
    file_id = str(done_file.file_id)
    db.close()
    
    resp = client.get(f"/analysis/{file_id}/export", headers=auth_header)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert "attachment" in resp.headers["content-disposition"]
