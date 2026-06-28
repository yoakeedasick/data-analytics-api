"""
Pytest configuration: use an in-memory SQLite database so tests
run without a real PostgreSQL server.
"""
import os
import pytest

# Override DATABASE_URL before any app imports so the lazy engine uses SQLite
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_app.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-ci")
os.environ.setdefault("S3_BUCKET_NAME", "test-bucket")
os.environ.setdefault("AWS_REGION", "ap-southeast-1")

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_app.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
