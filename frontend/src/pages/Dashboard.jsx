import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title as ChartTitle, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import api from '../services/api';
import PageWrapper from '../components/layout/PageWrapper';
import './Dashboard.css';

import fileIconImg from '../assets/dashboard/file.png';
import tickIconImg from '../assets/dashboard/tick.png';
import pendingIconImg from '../assets/dashboard/pending.png';
import failIconImg from '../assets/dashboard/fail.png';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  ChartTitle, Tooltip, Legend, Filler
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    analyzed: 0,
    pending: 0,
    failed: 0,
    analyzedPct: 0
  });
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30D'); // Default is 30D as requested

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/files', { params: { limit: 100 } });
        const files = response.data.files || [];

        // Calculate totals
        const total = files.length;
        const analyzed = files.filter(f => f.status === 'done').length;
        const failed = files.filter(f => f.status === 'failed').length;
        const pending = files.filter(f => f.status === 'pending' || f.status === 'analyzing').length;
        const analyzedPct = total > 0 ? Math.round((analyzed / total) * 100) : 0;

        setStats({ total, analyzed, pending, failed, analyzedPct });

        // Calculate chart volume data based on selected time range
        const labels = [];
        const uploadCounts = [];
        const analyzedCounts = [];
        let numDays = 30;

        if (timeRange === '7D') numDays = 7;
        else if (timeRange === '30D') numDays = 30;
        else if (timeRange === '90D') numDays = 90;
        else if (timeRange === 'YTD') {
          const startOfYear = new Date(new Date().getFullYear(), 0, 1);
          const diffTime = Math.abs(new Date() - startOfYear);
          numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (numDays <= 0) numDays = 1;
        }

        for (let i = numDays - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          labels.push(dateStr);

          // Count files uploaded on this date
          const dateISO = d.toISOString().split('T')[0];
          const filesOnDate = files.filter(f => f.upload_time && f.upload_time.startsWith(dateISO));

          uploadCounts.push(filesOnDate.length);
          analyzedCounts.push(filesOnDate.filter(f => f.status === 'done').length);
        }

        setChartData({
          labels,
          datasets: [
            {
              label: 'Documents Ingested',
              data: uploadCounts,
              borderColor: '#A88B72',
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderDash: [4, 4],
              pointRadius: 0,
              fill: false,
              tension: 0.4,
            },
            {
              label: 'Documents Analyzed',
              data: analyzedCounts,
              borderColor: '#6A513E',
              backgroundColor: 'rgba(106, 81, 62, 0.04)',
              borderWidth: 2.5,
              pointRadius: 4,
              pointBackgroundColor: '#FAF7F2',
              pointBorderColor: '#6A513E',
              pointBorderWidth: 2,
              fill: true,
              tension: 0.4,
            }
          ]
        });

      } catch (err) {
        console.error('Failed to load dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeRange]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          color: '#8A7E74', 
          font: { size: 10, family: 'Inter' },
          maxTicksLimit: timeRange === '7D' ? 7 : timeRange === '30D' ? 7 : 10
        }
      },
      y: {
        grid: { color: '#E5DFD5' },
        ticks: {
          color: '#8A7E74',
          font: { size: 10, family: 'Inter' },
          stepSize: 1,
          precision: 0
        }
      }
    }
  };

  return (
    <PageWrapper>
      <div className="dashboard-page page-enter">
        <div className="dashboard-header-row">
          <div className="dashboard-meta-text">
            {/* Title and subtitle are rendered in Topbar */}
          </div>
        </div>

        {/* 4 Stats Grid */}
        <div className="dashboard-stats-grid">
          {/* Card 1: Total Files */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">TOTAL DATASETS</span>
              <img src={fileIconImg} className="dashboard-card-icon-img" alt="Files" />
            </div>
            <p className="stat-card-value">{loading ? '...' : stats.total}</p>
            <p className="stat-card-trend">
              <span>🗂</span> Datasets uploaded to S3
            </p>
          </div>

          {/* Card 2: Analyzed */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">ANALYZED</span>
              <img src={tickIconImg} className="dashboard-card-icon-img" alt="Success" />
            </div>
            <p className="stat-card-value">{loading ? '...' : stats.analyzed}</p>
            <div className="stat-card-progress-row">
              <div className="stat-card-progress-bar">
                <div className="stat-card-progress-fill" style={{ width: `${stats.analyzedPct}%` }} />
              </div>
              <span className="stat-card-progress-pct">{stats.analyzedPct}%</span>
            </div>
          </div>

          {/* Card 3: Pending */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">PENDING</span>
              <img src={pendingIconImg} className="dashboard-card-icon-img" alt="Pending" />
            </div>
            <p className="stat-card-value">{loading ? '...' : stats.pending}</p>
            <div className="stat-card-badge-row">
              {stats.pending > 0 ? (
                <span className="badge-processing">PROCESSING</span>
              ) : (
                <span className="badge-processing idle">IDLE</span>
              )}
            </div>
          </div>

          {/* Card 4: Failed */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">FAILED</span>
              <img src={failIconImg} className="dashboard-card-icon-img" alt="Failed" />
            </div>
            <p className="stat-card-value">{loading ? '...' : stats.failed}</p>
            <p className="stat-card-trend trend-down">
              <span>⚠</span> Requires attention
            </p>
          </div>
        </div>

        {/* Processing Volume Line Chart Card */}
        <div className="chart-card-container">
          <div className="chart-card-header">
            <div className="chart-title-area">
              <h3 className="chart-main-title">Processing Volume</h3>
              <p className="chart-sub-title">
                Daily document ingestion and analysis rates over the last {timeRange === '7D' ? '7' : timeRange === '30D' ? '30' : timeRange === '90D' ? '90' : 'YTD'} days.
              </p>
            </div>
            <div className="chart-actions-area">
              <div className="chart-range-selector">
                <button
                  className={`range-btn ${timeRange === '7D' ? 'active' : ''}`}
                  onClick={() => setTimeRange('7D')}
                >
                  7D
                </button>
                <button
                  className={`range-btn ${timeRange === '30D' ? 'active' : ''}`}
                  onClick={() => setTimeRange('30D')}
                >
                  30D
                </button>
                <button
                  className={`range-btn ${timeRange === '90D' ? 'active' : ''}`}
                  onClick={() => setTimeRange('90D')}
                >
                  90D
                </button>
                <button
                  className={`range-btn ${timeRange === 'YTD' ? 'active' : ''}`}
                  onClick={() => setTimeRange('YTD')}
                >
                  YTD
                </button>
              </div>
              <div className="chart-custom-legends">
                <div className="legend-item">
                  <span className="legend-circle hollow" />
                  <span className="legend-text">Documents Analyzed</span>
                </div>
                <div className="legend-item">
                  <span className="legend-circle filled" />
                  <span className="legend-text">Documents Ingested</span>
                </div>
              </div>
            </div>
          </div>

          <div className="chart-canvas-wrap">
            {!loading && <Line data={chartData} options={chartOptions} />}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
