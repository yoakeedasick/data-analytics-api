import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, BigInteger, Integer, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class File(Base):
    __tablename__ = "files"

    file_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    s3_path: Mapped[str] = mapped_column(Text, nullable=False)
    upload_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    # pending | analyzing | done | failed
    status: Mapped[str] = mapped_column(String(50), default="pending")
    file_size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    row_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    col_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    analysis: Mapped["AnalysisResult | None"] = relationship(
        "AnalysisResult", back_populates="file", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<File {self.file_name} status={self.status}>"


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    result_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    file_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("files.file_id"), nullable=False, unique=True, index=True
    )
    result_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    file: Mapped["File"] = relationship("File", back_populates="analysis")

    def __repr__(self) -> str:
        return f"<AnalysisResult file_id={self.file_id}>"
