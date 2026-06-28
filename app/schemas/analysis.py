from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MissingValuesInfo(BaseModel):
    column: str
    missing_count: int
    missing_pct: float


class ColumnStats(BaseModel):
    count: float | None = None
    mean: float | None = None
    std: float | None = None
    min: float | None = None
    q25: float | None = None
    q50: float | None = None
    q75: float | None = None
    max: float | None = None


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    file_id: str
    status: str
    file_name: str | None = None
    rows: int | None = None
    columns: int | None = None
    column_names: list[str] | None = None
    dtypes: dict[str, str] | None = None
    missing_values: dict[str, int] | None = None
    missing_pct: dict[str, float] | None = None
    describe: dict[str, dict] | None = None
    correlation: dict[str, dict] | None = None
    created_at: datetime | None = None


class AnalysisStatusResponse(BaseModel):
    file_id: str
    status: str
    message: str
