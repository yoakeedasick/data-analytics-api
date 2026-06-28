import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.file import AnalysisResult, File as FileModel
from app.models.user import User
from app.schemas.analysis import AnalysisResponse, AnalysisStatusResponse
from app.services import s3_service, analysis_service, pdf_service

router = APIRouter(prefix="/analysis", tags=["Analysis"])


def _get_file_for_user(file_id: str, user_id: uuid.UUID, db: Session) -> FileModel:
    """Helper: fetch a file owned by the current user or raise 404."""
    try:
        fid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file_id format")

    db_file = (
        db.query(FileModel)
        .filter(FileModel.file_id == fid, FileModel.user_id == user_id)
        .first()
    )
    if not db_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return db_file


@router.post("/{file_id}", response_model=AnalysisStatusResponse)
def run_analysis(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger analysis for an uploaded CSV file.
    Downloads file from S3, runs Pandas analysis, stores result in DB.
    """
    db_file = _get_file_for_user(file_id, current_user.user_id, db)

    if db_file.status == "analyzing":
        return AnalysisStatusResponse(
            file_id=file_id,
            status="analyzing",
            message="Analysis is already in progress",
        )

    # Mark as analyzing
    db_file.status = "analyzing"
    db.commit()

    try:
        # Download CSV from S3
        file_bytes = s3_service.download_file(db_file.s3_path)

        # Run Pandas analysis
        result = analysis_service.analyze_csv(file_bytes)

        # Update file metadata
        db_file.row_count = result["rows"]
        db_file.col_count = result["columns"]
        db_file.status = "done"

        # Upsert analysis result
        existing = db.query(AnalysisResult).filter(AnalysisResult.file_id == db_file.file_id).first()
        if existing:
            existing.result_json = result
        else:
            db.add(AnalysisResult(file_id=db_file.file_id, result_json=result))

        db.commit()

    except Exception as exc:
        db_file.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(exc)}",
        )

    return AnalysisStatusResponse(
        file_id=file_id,
        status="done",
        message="Analysis completed successfully",
    )


@router.get("/{file_id}", response_model=AnalysisResponse)
def get_analysis(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the analysis result for a file."""
    db_file = _get_file_for_user(file_id, current_user.user_id, db)

    if db_file.status == "pending":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis has not been run yet. Call POST /analysis/{file_id} first.",
        )

    if db_file.status == "analyzing":
        return AnalysisResponse(file_id=file_id, status="analyzing", file_name=db_file.file_name)

    if db_file.status == "failed":
        return AnalysisResponse(file_id=file_id, status="failed", file_name=db_file.file_name)

    result_record = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.file_id == db_file.file_id)
        .first()
    )
    if not result_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis result not found")

    data = result_record.result_json or {}
    return AnalysisResponse(
        file_id=file_id,
        status="done",
        file_name=db_file.file_name,
        rows=data.get("rows"),
        columns=data.get("columns"),
        column_names=data.get("column_names"),
        dtypes=data.get("dtypes"),
        missing_values=data.get("missing_values"),
        missing_pct=data.get("missing_pct"),
        describe=data.get("describe"),
        correlation=data.get("correlation"),
        created_at=result_record.created_at,
    )


@router.get("/{file_id}/export")
def export_analysis_pdf(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate and download a PDF report of the file's statistical analysis."""
    db_file = _get_file_for_user(file_id, current_user.user_id, db)

    if db_file.status != "done":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Analysis is not complete (current status: {db_file.status}). Please run analysis first."
        )

    result_record = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.file_id == db_file.file_id)
        .first()
    )
    if not result_record or not result_record.result_json:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis result details not found."
        )

    pdf_buffer = pdf_service.generate_pdf_report(
        file_name=db_file.file_name,
        row_count=db_file.row_count or 0,
        col_count=db_file.col_count or 0,
        result_json=result_record.result_json
    )

    clean_filename = db_file.file_name.replace(" ", "_")
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="dalytics_{clean_filename}_report.pdf"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

