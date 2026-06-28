import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Doughnut, Bar, Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import api from '../services/api';
import PageWrapper from '../components/layout/PageWrapper';
import './Analysis.css';

import fileIconImg from '../assets/analytics/file.png';
import rowIconImg from '../assets/analytics/row.png';
import columnIconImg from '../assets/analytics/column.png';
import backToFilesIconImg from '../assets/analytics/back_to_files.png';
import forwardIconImg from '../assets/analytics/forward.png';

export default function Analysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filesList, setFilesList] = useState([]);
  const [exporting, setExporting] = useState(false);
  const pollIntervalRef = useRef(null);

  const fetchAnalysis = async (triggerIfPending = true, showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setError('');
      setData(null);
    }
    if (!id) {
      try {
        const response = await api.get('/files', { params: { limit: 100 } });
        setFilesList(response.data.files || []);
        setError('');
      } catch (err) {
        setError('Failed to load datasets.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const response = await api.get(`/analysis/${id}`);
      const result = response.data;

      if (result.status === 'done') {
        setData(result);
        setError('');
        setLoading(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } else if (result.status === 'analyzing') {
        setData(result);
        setLoading(false);
        // Start polling if not already doing so
        setupPolling();
      } else if (result.status === 'failed') {
        setError('Analysis failed on the server.');
        setLoading(false);
      }
    } catch (err) {
      // If 404, it might be pending
      if (err.response?.status === 404 && triggerIfPending) {
        try {
          // Attempt to run the analysis
          await api.post(`/analysis/${id}`);
          setupPolling();
          setData({ status: 'analyzing' });
          setLoading(false);
        } catch (postErr) {
          setError('Failed to trigger analysis.');
          setLoading(false);
        }
      } else {
        setError('Failed to load analysis result.');
        setLoading(false);
      }
    }
  };

  const setupPolling = () => {
    if (!pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(() => {
        fetchAnalysis(false, false);
      }, 3000);
    }
  };

  const handleAnalyzeFile = async (fileId) => {
    try {
      setLoading(true);
      await api.post(`/analysis/${fileId}`);
      // Refresh list
      const response = await api.get('/files', { params: { limit: 100 } });
      setFilesList(response.data.files || []);
      setError('');
    } catch (err) {
      setError('Failed to trigger analysis.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!id) return;
    setExporting(true);
    try {
      const response = await api.get(`/analysis/${id}/export`, {
        responseType: 'blob',
      });

      let fileName = 'analysis_report.pdf';
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          fileName = matches[1].replace(/['"]/g, '');
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export PDF report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchAnalysis(true);
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [id]);

  if (loading || (id && !data)) {
    return (
      <PageWrapper>
        <div className="analysis-page-loading">
          <div className="spinner"></div>
          <p>Loading analysis...</p>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="analysis-page-error">
          <h3>Error</h3>
          <p>{error}</p>
          <Link to="/files" className="btn btn-primary btn-sm">
            Back to Files
          </Link>
        </div>
      </PageWrapper>
    );
  }

  if (!id) {
    return (
      <PageWrapper>
        <div className="analysis-list-container">
          <div className="analysis-list-header">
            <h3>Choose a Dataset to Analyze</h3>
            <p>Select any of your uploaded CSV files below to view its automated statistical breakdown, correlation metrics, and integrity scores.</p>
          </div>
          {filesList.length === 0 ? (
            <div className="empty-analysis-list">
              <p>You haven't uploaded any CSV datasets yet.</p>
              <Link to="/upload" className="btn btn-primary">
                Upload CSV Dataset
              </Link>
            </div>
          ) : (
            <div className="analysis-grid">
              {filesList.map(f => (
                <div key={f.file_id} className="analysis-card">
                  <div className="analysis-card-main">
                    <div className="analysis-card-title-row">
                      <img src={fileIconImg} className="analysis-file-icon-img" alt="File" />
                      <h4 className="analysis-card-filename" title={f.file_name}>
                        {f.file_name}
                      </h4>
                    </div>
                    <div className="analysis-card-meta">
                      <span>Size: {formatBytes(f.file_size)}</span>
                      <span>•</span>
                      <span>Uploaded: {formatDate(f.upload_time)}</span>
                    </div>
                    {f.status === 'done' && f.row_count && (
                      <div className="analysis-card-stats">
                        <span>{f.row_count.toLocaleString()} rows</span>
                        <span>•</span>
                        <span>{f.col_count} columns</span>
                      </div>
                    )}
                  </div>
                  <div className="analysis-card-action">
                    {f.status === 'done' ? (
                      <Link to={`/analysis/${f.file_id}`} className="btn btn-primary btn-sm btn-block" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                        View Analysis <img src={forwardIconImg} className="analysis-forward-icon-img" alt="Go" />
                      </Link>
                    ) : f.status === 'analyzing' ? (
                      <div className="btn btn-secondary btn-sm btn-block disabled">
                        <div className="spinner spinner-xs"></div> Analyzing…
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAnalyzeFile(f.file_id)}
                        className="btn btn-outline btn-sm btn-block"
                      >
                        Run Analysis
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageWrapper>
    );
  }

  if (data?.status === 'analyzing') {
    return (
      <PageWrapper title={data?.file_name}>
        <div className="analysis-page-loading">
          <div className="spinner"></div>
          <p>Analysis is currently running on the server...</p>
          <span className="sub">This page will update automatically once completed.</span>
        </div>
      </PageWrapper>
    );
  }

  // Calculate missing vs complete cells
  const totalRows = data.rows || 0;
  const totalCols = data.columns || 0;
  const totalCells = totalRows * totalCols;
  const totalMissing = Object.values(data.missing_values || {}).reduce((a, b) => a + b, 0);
  const totalComplete = totalCells - totalMissing;
  const completePct = totalCells > 0 ? Math.round((totalComplete / totalCells) * 100) : 100;
  const missingPct = 100 - completePct;

  const missingChartData = {
    labels: ['Complete Data', 'Missing Data'],
    datasets: [
      {
        data: [totalComplete, totalMissing],
        backgroundColor: ['#6A513E', '#E5DFD5'],
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };

  const missingChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    }
  };

  // ── Chart 1: Data Type Distribution ──────────────────────────────────────────
  const typeCounts = {};
  Object.values(data.dtypes || {}).forEach(t => {
    let cleanType = 'Other';
    const typeStr = t.toLowerCase();
    if (typeStr.includes('int')) cleanType = 'Integer';
    else if (typeStr.includes('float') || typeStr.includes('double') || typeStr.includes('num')) cleanType = 'Float';
    else if (typeStr.includes('object') || typeStr.includes('str') || typeStr.includes('char')) cleanType = 'Text/Object';
    else if (typeStr.includes('bool')) cleanType = 'Boolean';
    else if (typeStr.includes('date') || typeStr.includes('time')) cleanType = 'Datetime';
    typeCounts[cleanType] = (typeCounts[cleanType] || 0) + 1;
  });

  const dtypesChartData = {
    labels: Object.keys(typeCounts),
    datasets: [
      {
        data: Object.values(typeCounts),
        backgroundColor: ['#6A513E', '#8B7355', '#D2B48C', '#E5DFD5', '#C1B7A4'],
        borderWidth: 0,
      }
    ]
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          font: { size: 10 }
        }
      }
    }
  };

  // ── Chart 2: Missing Data by Column (Top 10) ──────────────────────────────────
  const missingCols = Object.entries(data.missing_pct || {})
    .filter(([_, pct]) => pct > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const missingColsChartData = {
    labels: missingCols.map(c => c[0]),
    datasets: [
      {
        label: 'Missing %',
        data: missingCols.map(c => c[1]),
        backgroundColor: '#8B7355',
        borderRadius: 4,
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', // Horizontal bar chart!
    scales: {
      x: {
        max: 100,
        ticks: { font: { size: 9 } }
      },
      y: {
        ticks: { font: { size: 9 } }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  // Prepare correlation columns and matrix
  const correlationMatrix = data.correlation || {};
  const numericColumns = Object.keys(correlationMatrix);

  return (
    <PageWrapper title={data?.file_name}>
      <div className="analysis-page page-enter">
        <div className="analysis-header-row">
          <Link to="/files" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <img src={backToFilesIconImg} className="analysis-back-icon-img" alt="Back" /> Back to Files
          </Link>
          <button
            onClick={handleExportPDF}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            disabled={exporting}
          >
            {exporting ? 'Generating PDF...' : 'Download PDF Report'}
          </button>
        </div>

        {/* Two-Column Grid Layout */}
        <div className="analysis-layout-grid">
          {/* Left Column — Stats Cards & List */}
          <div className="analysis-column-left">
            {/* Card 1: Total Rows */}
            <div className="analysis-card">
              <div className="analysis-card-header">
                <span className="analysis-card-label">Total Rows</span>
                <img src={rowIconImg} className="analysis-spec-icon-img" alt="Rows" />
              </div>
              <p className="analysis-card-val">
                {totalRows.toLocaleString()} <span className="val-unit">records</span>
              </p>
            </div>

            {/* Card 2: Total Columns */}
            <div className="analysis-card">
              <div className="analysis-card-header">
                <span className="analysis-card-label">Total Columns</span>
                <img src={columnIconImg} className="analysis-spec-icon-img" alt="Columns" />
              </div>
              <p className="analysis-card-val">
                {totalCols.toLocaleString()} <span className="val-unit">features</span>
              </p>
            </div>

            {/* Card 3: Columns Specifications List */}
            <div className="analysis-card list-card">
              <h3 className="list-card-title">Column Specifications</h3>
              <div className="articles-list">
                {data.column_names?.map((colName, idx) => {
                  const dtype = data.dtypes?.[colName] || 'unknown';
                  const missingCount = data.missing_values?.[colName] || 0;
                  const missingPercent = data.missing_pct?.[colName] || 0;
                  return (
                    <div key={idx} className="article-row">
                      <div className="article-details">
                        <p className="article-title">{colName}</p>
                        <p className="article-category">Type: {dtype}</p>
                      </div>
                      {missingCount > 0 ? (
                        <div className="article-reads warning-text missing-details-col">
                          <span className="missing-count-num">{missingCount.toLocaleString()}</span>
                          <span className="missing-label-txt">missing</span>
                          <span className="missing-pct-val">({missingPercent.toFixed(2)}%)</span>
                        </div>
                      ) : (
                        <span className="article-reads success-text">
                          Full
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column — Heatmap, Traffic Source, Device Breakdown */}
          <div className="analysis-column-right">
            {/* Card 4: Correlation Matrix Heatmap */}
            <div className="analysis-card heatmap-card">
              <div className="heatmap-header">
                <div>
                  <h3 className="heatmap-card-title">Correlation Matrix</h3>
                  <p className="heatmap-card-desc">Correlation between numerical variables in your dataset.</p>
                </div>
                <div className="heatmap-legend">
                  <span className="legend-txt">-1.0</span>
                  <div className="legend-gradient-corr" />
                  <span className="legend-txt">+1.0</span>
                </div>
              </div>

              {numericColumns.length === 0 ? (
                <div className="empty-heatmap-state">No numeric columns found for correlation.</div>
              ) : (
                <div className="correlation-table-wrapper">
                  <table className="correlation-matrix-table">
                    <thead>
                      <tr>
                        <th></th>
                        {numericColumns.map(col => <th key={col} title={col}>{col}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {numericColumns.map(rowCol => (
                        <tr key={rowCol}>
                          <td className="matrix-row-label" title={rowCol}>{rowCol}</td>
                          {numericColumns.map(colCol => {
                            const val = correlationMatrix[rowCol]?.[colCol] ?? 0;
                            // Calculate opacity for color mapping. Positive: Brown. Negative: Light Tan.
                            const color = val >= 0
                              ? `rgba(106, 81, 62, ${val})`
                              : `rgba(168, 139, 114, ${Math.abs(val)})`;
                            return (
                              <td
                                key={colCol}
                                style={{ backgroundColor: color }}
                                className="matrix-cell"
                                title={`${rowCol} ↔ ${colCol}: ${val.toFixed(3)}`}
                              >
                                {val.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom 2 Widgets side by side */}
            <div className="bottom-widgets-grid">
              {/* Data Completeness Donut Card */}
              <div className="analysis-card donut-card">
                <h3 className="widget-card-title">Data Integrity</h3>
                <div className="donut-chart-wrapper">
                  <div className="donut-canvas-container">
                    <Doughnut data={missingChartData} options={missingChartOptions} />
                  </div>
                  <div className="donut-center-text">
                    <p className="center-pct">{completePct}%</p>
                    <p className="center-lbl">Complete</p>
                  </div>
                </div>
                <div className="donut-legends">
                  <div className="donut-legend-item">
                    <span className="dot" style={{ backgroundColor: '#6A513E' }} />
                    <span>Complete ({completePct}%)</span>
                  </div>
                  <div className="donut-legend-item">
                    <span className="dot" style={{ backgroundColor: '#E5DFD5' }} />
                    <span>Missing ({missingPct}%)</span>
                  </div>
                </div>
              </div>

              {/* Descriptive Statistics Card */}
              <div className="analysis-card device-card">
                <h3 className="widget-card-title">Descriptive Statistics</h3>
                {numericColumns.length === 0 ? (
                  <div className="empty-stats-state">No numeric data available.</div>
                ) : (
                  <div className="device-progress-list stats-scroll-container">
                    {numericColumns.map(col => {
                      const stats = data.describe?.[col] || {};
                      const mean = stats.mean !== undefined ? stats.mean.toFixed(2) : '-';
                      const min = stats.min !== undefined ? stats.min.toFixed(1) : '-';
                      const max = stats.max !== undefined ? stats.max.toFixed(1) : '-';
                      const std = stats.std !== undefined ? stats.std.toFixed(2) : '-';

                      return (
                        <div key={col} className="stats-column-row">
                          <p className="stats-column-name">{col}</p>
                          <div className="stats-details-grid">
                            <div>
                              <span className="stat-label">Mean</span>
                              <span className="stat-value">{mean}</span>
                            </div>
                            <div>
                              <span className="stat-label">Std Dev</span>
                              <span className="stat-value">{std}</span>
                            </div>
                            <div>
                              <span className="stat-label">Min / Max</span>
                              <span className="stat-value">{min} / {max}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* New Row: Type Distribution and Missing Values Charts */}
            <div className="analysis-charts-row" style={{ marginTop: '1.5rem' }}>
              <div className="analysis-card chart-card">
                <h3 className="chart-card-title">Data Types Distribution</h3>
                <div className="chart-container" style={{ height: '220px', position: 'relative' }}>
                  <Pie data={dtypesChartData} options={pieChartOptions} />
                </div>
              </div>

              <div className="analysis-card chart-card">
                <h3 className="chart-card-title">Missing Data by Column (Top 10)</h3>
                <div className="chart-container" style={{ height: '220px', position: 'relative' }}>
                  {missingCols.length === 0 ? (
                    <div className="empty-chart-msg">
                      <p>There is no missing data in this file.</p>
                    </div>
                  ) : (
                    <Bar data={missingColsChartData} options={barChartOptions} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}



function formatBytes(bytes) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}


