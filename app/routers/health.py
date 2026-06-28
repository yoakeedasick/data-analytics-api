from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.s3_service import check_s3_accessible

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint used by ALB every 30 seconds.
    Checks connectivity to both the database and S3.
    """
    # Check DB
    db_status = "connected"
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    # Check S3
    s3_status = "accessible" if check_s3_accessible() else "inaccessible"

    overall = "healthy" if db_status == "connected" else "degraded"

    return {
        "status": overall,
        "database": db_status,
        "s3": s3_status,
        "version": "1.0.0",
    }
