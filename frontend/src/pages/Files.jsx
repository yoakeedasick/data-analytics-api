import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import PageWrapper from '../components/layout/PageWrapper';
import './Files.css';

import fileIconImg from '../assets/files/file.png';
import searchIconImg from '../assets/files/search.png';
import analyzeIconImg from '../assets/files/analysis.png';
import deleteIconImg from '../assets/files/delete.png';
import forwardIconImg from '../assets/analytics/forward.png';

const STATUS_CONFIG = {
  done:      { label: 'Success',   cls: 'badge-success' },
  analyzing: { label: 'Analyzing', cls: 'badge-analyzing' },
  failed:    { label: 'Failed',    cls: 'badge-failed' },
  pending:   { label: 'Pending',   cls: 'badge-pending' },
};

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

export default function Files() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const pollIntervalRef = useRef(null);

  const fetchFiles = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/files', { params: { limit: 100 } });
      const fetchedFiles = response.data.files || [];
      setFiles(fetchedFiles);
      setActionError('');
    } catch (err) {
      setActionError('Failed to load files from server.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial fetch and polling setup
  useEffect(() => {
    fetchFiles(true);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Setup polling if there are any active "analyzing" files
  useEffect(() => {
    const hasAnalyzing = files.some(f => f.status === 'analyzing');

    if (hasAnalyzing) {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          fetchFiles(false);
        }, 3000); // Poll every 3 seconds
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [files]);

  const toggleSelect = id =>
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const toggleAll = () =>
    setSelected(prev => prev.length === filtered.length ? [] : filtered.map(f => f.file_id));

  const handleAnalyzeFile = async (fileId) => {
    try {
      setActionError('');
      // Optimistic update
      setFiles(prev => prev.map(f => f.file_id === fileId ? { ...f, status: 'analyzing' } : f));
      await api.post(`/analysis/${fileId}`);
      fetchFiles(false);
    } catch (err) {
      setActionError(`Failed to trigger analysis: ${err.response?.data?.detail || err.message}`);
      fetchFiles(false);
    }
  };

  const handleAnalyzeSelected = async () => {
    try {
      setActionError('');
      const promises = selected.map(id => api.post(`/analysis/${id}`));
      // Set status to analyzing optimistic
      setFiles(prev => prev.map(f => selected.includes(f.file_id) ? { ...f, status: 'analyzing' } : f));
      setSelected([]);
      await Promise.all(promises);
      fetchFiles(false);
    } catch (err) {
      setActionError('Failed to analyze all selected files.');
      fetchFiles(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selected.length} file(s)?`)) {
      return;
    }
    try {
      setActionError('');
      const promises = selected.map(id => api.delete(`/files/${id}`));
      await Promise.all(promises);
      setSelected([]);
      fetchFiles(true);
    } catch (err) {
      setActionError('Failed to delete some files.');
      fetchFiles(true);
    }
  };

  const handleDeleteSingle = async (e, fileId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }
    try {
      setActionError('');
      await api.delete(`/files/${fileId}`);
      setSelected(prev => prev.filter(id => id !== fileId));
      fetchFiles(true);
    } catch (err) {
      setActionError('Failed to delete file.');
    }
  };

  const filtered = files.filter(f =>
    f.file_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="files-page page-enter">
        {/* Page actions/header row — Filter + Upload */}
        <div className="page-actions-bar">
          <div className="search-wrap">
            <img src={searchIconImg} className="files-search-icon-img" alt="Search" />
            <input
              className="page-search"
              placeholder="Search files..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="page-actions-right">
            <button className="btn btn-ghost btn-sm" onClick={() => fetchFiles(true)}>
              Refresh
            </button>
            <Link to="/upload" className="btn btn-primary btn-sm">
              + Upload
            </Link>
          </div>
        </div>

        {actionError && <div className="action-error-bar">{actionError}</div>}

        {/* Selection action bar */}
        {selected.length > 0 && (
          <div className="selection-bar">
            <span className="selection-count">{selected.length} files selected</span>
            <div className="selection-actions">
              <button className="btn btn-primary btn-sm" onClick={handleAnalyzeSelected}>
                Analyze Selected
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected}>
                <img src={deleteIconImg} className="files-action-icon-img btn-icon-offset" alt="Delete" /> Delete
              </button>
            </div>
          </div>
        )}

        {/* Table container */}
        <div className="files-table-wrap">
          {loading ? (
            <div className="table-loader">Loading your datasets...</div>
          ) : filtered.length === 0 ? (
            <div className="table-empty">
              {search ? 'No files match your search.' : 'You haven\'t uploaded any CSV files yet.'}
            </div>
          ) : (
            <table className="files-table">
              <thead>
                <tr>
                  <th className="th-check">
                    <input
                      type="checkbox"
                      className="table-checkbox"
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>FILENAME</th>
                  <th>DATE</th>
                  <th>SIZE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => {
                  const st = STATUS_CONFIG[f.status] || { label: f.status, cls: 'badge-pending' };
                  const isSelected = selected.includes(f.file_id);
                  return (
                    <tr key={f.file_id} className={isSelected ? 'row-selected' : ''}>
                      <td className="td-check">
                        <input
                          type="checkbox"
                          className="table-checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(f.file_id)}
                        />
                      </td>
                      <td className="td-filename">
                        <div className="td-filename-wrapper">
                          <img src={fileIconImg} className="files-file-icon-img" alt="File" />
                          <span>{f.file_name}</span>
                        </div>
                      </td>
                      <td className="td-meta">{formatDate(f.upload_time)}</td>
                      <td className="td-meta">{formatBytes(f.file_size)}</td>
                      <td>
                        <span className={`status-pill ${st.cls}`}>
                          <span className="status-dot" />
                          {st.label}
                        </span>
                      </td>
                      <td className="td-actions">
                        <div className="td-actions-inner">
                          {f.status === 'done' && (
                            <Link to={`/analysis/${f.file_id}`} className="action-link">
                              View
                            </Link>
                          )}
                          {f.status === 'pending' && (
                            <button onClick={() => handleAnalyzeFile(f.file_id)} className="action-btn-inline">
                              Analyze
                            </button>
                          )}
                          {f.status === 'analyzing' && (
                            <span className="action-text-muted">Analyzing...</span>
                          )}
                          {f.status === 'failed' && (
                            <button onClick={() => handleAnalyzeFile(f.file_id)} className="action-btn-inline retry">
                              Retry
                            </button>
                          )}
                          <button 
                            onClick={(e) => handleDeleteSingle(e, f.file_id)} 
                            className="action-btn-icon-trash"
                            title="Delete file"
                          >
                            <img src={deleteIconImg} className="files-action-icon-img" alt="Delete" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}


