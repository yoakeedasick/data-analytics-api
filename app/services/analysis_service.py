import io
import math
from typing import Any

import numpy as np
import pandas as pd


def _safe_float(value: Any) -> float | None:
    """Convert a value to float, returning None for NaN/Inf."""
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def _sanitize_dict(d: dict) -> dict:
    """Recursively convert NaN/Inf floats to None in a dict."""
    result = {}
    for k, v in d.items():
        if isinstance(v, dict):
            result[str(k)] = _sanitize_dict(v)
        elif isinstance(v, float):
            result[str(k)] = _safe_float(v)
        else:
            result[str(k)] = v
    return result


def analyze_csv(file_bytes: bytes) -> dict[str, Any]:
    """
    Run full statistical analysis on a CSV file's bytes.

    Returns a dict with:
    - rows, columns, column_names
    - dtypes: column -> dtype string
    - missing_values: column -> count
    - missing_pct: column -> percentage
    - describe: full df.describe() as nested dict (numeric only)
    - correlation: Pearson correlation matrix (numeric only)
    """
    df = pd.read_csv(io.BytesIO(file_bytes))

    rows, cols = df.shape
    column_names = df.columns.tolist()

    # Data types
    dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}

    # Missing values
    missing_values = df.isnull().sum().to_dict()
    missing_values = {str(k): int(v) for k, v in missing_values.items()}
    missing_pct = {
        str(col): round(int(count) / rows * 100, 2) if rows > 0 else 0.0
        for col, count in missing_values.items()
    }

    # Descriptive statistics (numeric columns only)
    numeric_df = df.select_dtypes(include="number")
    describe: dict[str, dict] = {}
    if not numeric_df.empty and numeric_df.shape[0] > 0:
        describe_raw = numeric_df.describe().to_dict()
        describe = _sanitize_dict(describe_raw)

        # Rename quantile keys for clarity
        for col_stats in describe.values():
            if isinstance(col_stats, dict):
                for old_key, new_key in [("25%", "q25"), ("50%", "q50"), ("75%", "q75")]:
                    if old_key in col_stats:
                        col_stats[new_key] = col_stats.pop(old_key)

    # Correlation matrix (numeric columns only)
    correlation: dict[str, dict] = {}
    if not numeric_df.empty and numeric_df.shape[1] > 1 and numeric_df.shape[0] > 1:
        corr_raw = numeric_df.corr().to_dict()
        correlation = _sanitize_dict(corr_raw)

    return {
        "rows": rows,
        "columns": cols,
        "column_names": column_names,
        "dtypes": dtypes,
        "missing_values": missing_values,
        "missing_pct": missing_pct,
        "describe": describe,
        "correlation": correlation,
    }
