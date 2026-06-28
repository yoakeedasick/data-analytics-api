import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.file import File as FileModel
from app.models.user import User
from app.schemas.file import FileListResponse, FileResponse, UploadResponse
from app.services import s3_service

router = APIRouter(prefix="/files", tags=["Files"])

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: Annotated[UploadFile, File(description="CSV file (max 100MB)")],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a CSV file to S3 and record its metadata in the database."""
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are accepted",
        )

    file_bytes = await file.read()

    # Validate file size
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds maximum size of 100MB",
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty")

    # Build S3 key
    file_id = uuid.uuid4()
    s3_key = f"uploads/{current_user.user_id}/{file_id}.csv"

    # Upload to S3
    s3_service.upload_file(file_bytes, s3_key)

    # Persist metadata
    db_file = FileModel(
        file_id=file_id,
        user_id=current_user.user_id,
        file_name=file.filename,
        s3_path=s3_key,
        status="pending",
        file_size=len(file_bytes),
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    return UploadResponse(
        file_id=str(db_file.file_id),
        file_name=db_file.file_name,
        status=db_file.status,
        message="File uploaded successfully. Call POST /analysis/{file_id} to run analysis.",
    )


@router.get("", response_model=FileListResponse)
def list_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20,
):
    """List all files uploaded by the current user."""
    query = db.query(FileModel).filter(FileModel.user_id == current_user.user_id)
    total = query.count()
    files = query.order_by(FileModel.upload_time.desc()).offset(skip).limit(limit).all()

    return FileListResponse(
        total=total,
        files=[
            FileResponse(
                file_id=str(f.file_id),
                file_name=f.file_name,
                s3_path=f.s3_path,
                upload_time=f.upload_time,
                status=f.status,
                file_size=f.file_size,
                row_count=f.row_count,
                col_count=f.col_count,
            )
            for f in files
        ],
    )


@router.get("/{file_id}", response_model=FileResponse)
def get_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get metadata for a single file."""
    try:
        fid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file_id format")

    db_file = (
        db.query(FileModel)
        .filter(FileModel.file_id == fid, FileModel.user_id == current_user.user_id)
        .first()
    )
    if not db_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return FileResponse(
        file_id=str(db_file.file_id),
        file_name=db_file.file_name,
        s3_path=db_file.s3_path,
        upload_time=db_file.upload_time,
        status=db_file.status,
        file_size=db_file.file_size,
        row_count=db_file.row_count,
        col_count=db_file.col_count,
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a file from S3 and remove its record from the database."""
    try:
        fid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file_id format")

    db_file = (
        db.query(FileModel)
        .filter(FileModel.file_id == fid, FileModel.user_id == current_user.user_id)
        .first()
    )
    if not db_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    s3_service.delete_file(db_file.s3_path)
    db.delete(db_file)
    db.commit()
