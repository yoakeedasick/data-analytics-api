"""
Unit tests for the analysis_service.analyze_csv function.
"""
import io
import pytest
import pandas as pd

from app.services.analysis_service import analyze_csv


def _make_csv(**columns) -> bytes:
    """Helper: create a CSV bytes payload from keyword column arguments."""
    df = pd.DataFrame(columns)
    buf = io.BytesIO()
    df.to_csv(buf, index=False)
    return buf.getvalue()


class TestAnalyzeCSV:
    def test_basic_shape(self):
        csv_bytes = _make_csv(a=[1, 2, 3], b=[4, 5, 6])
        result = analyze_csv(csv_bytes)
        assert result["rows"] == 3
        assert result["columns"] == 2
        assert set(result["column_names"]) == {"a", "b"}

    def test_dtypes(self):
        csv_bytes = _make_csv(name=["Alice", "Bob"], score=[10.5, 20.0])
        result = analyze_csv(csv_bytes)
        assert "name" in result["dtypes"]
        assert "score" in result["dtypes"]

    def test_missing_values(self):
        csv_bytes = _make_csv(x=[1, None, 3], y=["a", "b", None])
        result = analyze_csv(csv_bytes)
        assert result["missing_values"]["x"] == 1
        assert result["missing_values"]["y"] == 1

    def test_missing_pct(self):
        csv_bytes = _make_csv(x=[1, None, None, None], y=[1, 2, 3, 4])
        result = analyze_csv(csv_bytes)
        assert result["missing_pct"]["x"] == 75.0

    def test_describe_keys(self):
        csv_bytes = _make_csv(val=[10, 20, 30, 40, 50])
        result = analyze_csv(csv_bytes)
        stats = result["describe"]["val"]
        for key in ("mean", "min", "max"):
            assert key in stats

    def test_correlation_present_for_multiple_numeric_columns(self):
        csv_bytes = _make_csv(a=[1, 2, 3], b=[4, 5, 6])
        result = analyze_csv(csv_bytes)
        assert "a" in result["correlation"]
        assert "b" in result["correlation"]["a"]

    def test_correlation_absent_for_single_column(self):
        csv_bytes = _make_csv(only=[1, 2, 3])
        result = analyze_csv(csv_bytes)
        # Only 1 numeric column — correlation matrix should be empty
        assert result["correlation"] == {}

    def test_nan_sanitized(self):
        """NaN values produced by describe() should be serialized as None, not float NaN."""
        import json
        csv_bytes = _make_csv(x=[1, 2, 3])
        result = analyze_csv(csv_bytes)
        # Should be JSON-serializable without errors
        json_str = json.dumps(result)
        assert "NaN" not in json_str

    def test_empty_file_raises(self):
        with pytest.raises(Exception):
            analyze_csv(b"")

    def test_headers_only(self):
        csv_bytes = b"col_a,col_b\n"
        result = analyze_csv(csv_bytes)
        assert result["rows"] == 0
        assert result["columns"] == 2
