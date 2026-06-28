import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageWrapper from '../components/layout/PageWrapper';
import './Upload.css';

import fileIconImg from '../assets/files/file.png';
import uploadIconImg from '../assets/files/upload.png';
import refreshIconImg from '../assets/files/refresh.png';
import cloudAwsIconImg from '../assets/home/cloud-aws.png';

export default function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleUpload = async (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV files are accepted.');
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File exceeds maximum size of 100MB.');
      return;
    }

    setFile(selectedFile);
    setError('');
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || selectedFile.size;
          const pct = Math.round((progressEvent.loaded * 100) / total);
          setProgress(pct);
        },
      });

      // Navigate to /files page after successful upload
      setTimeout(() => {
        navigate('/files');
      }, 600);
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to upload CSV file.';
      setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
      setFile(null);
      setProgress(0);
      setUploading(false);
    }
  };

  const handleDrop = e => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      handleUpload(dropped);
    }
  };

  return (
    <PageWrapper>
      <div className="upload-page page-enter">
        <div className="upload-layout">
          {/* LEFT — Main upload region */}
          <div className="upload-main">
            <div
              className={`drop-zone ${dragging ? 'dragging' : ''} ${uploading ? 'uploading-active' : ''}`}
              onDragOver={e => { e.preventDefault(); if (!uploading) setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                hidden
                disabled={uploading}
                onChange={e => {
                  if (e.target.files[0]) {
                    handleUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="drop-icon-wrap">
                <img src={uploadIconImg} className="upload-cloud-icon-img" alt="Upload" />
              </div>
              <p className="drop-instruction">Drag & drop CSV files here</p>
              <p className="drop-sub">
                Support for CSV files up to 100MB.<br />
                Files will be securely stored on AWS S3.
              </p>
              <button
                className="btn-browse-files"
                disabled={uploading}
                onClick={() => fileRef.current.click()}
              >
                Browse Files
              </button>
            </div>

            {error && <p className="upload-error-msg">{error}</p>}

            {/* Uploading progress section */}
            {file && (
              <div className="uploading-section">
                <p className="section-label">{uploading && progress < 100 ? 'UPLOADING' : 'COMPLETED'} (1)</p>
                <div className="upload-progress-card">
                  <div className="progress-file-icon">
                    <img src={fileIconImg} className="upload-file-icon-img" alt="File" />
                  </div>
                  <div className="progress-details">
                    <div className="progress-header-row">
                      <span className="progress-filename">{file.name}</span>
                      <span className="progress-percentage">{progress}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  {!uploading && (
                    <button
                      className="progress-cancel-btn"
                      onClick={() => {
                        setFile(null);
                        setProgress(0);
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Guidelines Panel */}
          <aside className="upload-guidelines">
            <h3 className="guidelines-title">CSV Guidelines</h3>
            <ul className="guidelines-list">
              <li className="guideline-item">
                <div className="guideline-icon">
                  <img src={fileIconImg} className="upload-guide-icon-img" alt="Format" />
                </div>
                <div className="guideline-text">
                  <p className="guideline-label">Format Constraint</p>
                  <p className="guideline-desc">
                    Only CSV (.csv) file formats are accepted. Excel files must be exported to CSV first.
                  </p>
                </div>
              </li>
              <li className="guideline-item">
                <div className="guideline-icon">
                  <img src={refreshIconImg} className="upload-guide-icon-img" alt="Encoding" />
                </div>
                <div className="guideline-text">
                  <p className="guideline-label">Encoding</p>
                  <p className="guideline-desc">
                    UTF-8 encoding is strongly recommended to handle international characters correctly.
                  </p>
                </div>
              </li>
              <li className="guideline-item">
                <div className="guideline-icon">
                  <img src={cloudAwsIconImg} className="upload-guide-icon-img" alt="Security" />
                </div>
                <div className="guideline-text">
                  <p className="guideline-label">Security & Privacy</p>
                  <p className="guideline-desc">
                    Files are encrypted at rest in S3 and strictly isolated. Access is restricted to you.
                  </p>
                </div>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </PageWrapper>
  );
}


