from datetime import datetime
from pydantic import BaseModel, ConfigDict


class FileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    file_id: str
    file_name: str
    s3_path: str
    upload_time: datetime
    status: str
    file_size: int | None
    row_count: int | None
    col_count: int | None


class FileListResponse(BaseModel):
    total: int
    files: list[FileResponse]


class UploadResponse(BaseModel):
    file_id: str
    file_name: str
    status: str
    message: str
