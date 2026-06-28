import React from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../assets/logo/logo.png';
import automatedAnalysisIcon from '../assets/home/automated_analysis.png';
import cloudAwsIcon from '../assets/home/cloud-aws.png';
import exportIcon from '../assets/home/export.png';
import dashboardDesignImg from '../assets/home/dashboard-design.webp';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing-page">
      {/* ── Navbar ── */}
      <header className="landing-navbar">
        <div className="navbar-logo">
          <img src={logoImg} alt="Dalytics Logo" className="landing-logo-img" />
          <span className="logo-text">Dalytics</span>
        </div>

        <div className="navbar-actions">
          <Link to="/login" className="btn-login-outline">Sign In</Link>
          <Link to="/login" className="btn-get-started">Get Started</Link>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="landing-hero-section">
        <h1 className="hero-main-title">
          Turn raw data into<br />elegant insights.
        </h1>
        <p className="hero-sub-text">
          An editorial suite for CSV processing, automated statistical analysis,<br />
          and minimalist dashboards.
        </p>
        <div className="hero-cta-buttons">
          <Link to="/login" className="btn-cta-primary">
            Start Analyzing Free
          </Link>
          <button className="btn-cta-outline">
            Watch Demo
          </button>
        </div>

        {/* Laptop Preview */}
        <div className="laptop-preview-container">
          <div className="laptop-bezel">
            <div className="laptop-screen">
              <img src={dashboardDesignImg} alt="Dashboard Preview" className="laptop-screen-img" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="landing-features-section">
        <div className="feature-column">
          <img src={automatedAnalysisIcon} className="feature-icon-img" alt="Automated Analysis" />
          <h3 className="feature-column-title">Automated Pandas Processing</h3>
          <p className="feature-column-desc">
            Automated Pandas processing, automated statisticals and data analytics.
          </p>
        </div>
        <div className="feature-v-divider" />
        <div className="feature-column">
          <img src={cloudAwsIcon} className="feature-icon-img" alt="Secure S3 Storage" />
          <h3 className="feature-column-title">Secure S3 Storage</h3>
          <p className="feature-column-desc">
            Secure S3 Storage in now clean storages, and minimalist dashboards.
          </p>
        </div>
        <div className="feature-v-divider" />
        <div className="feature-column">
          <img src={exportIcon} className="feature-icon-img" alt="Instant PDF Reports" />
          <h3 className="feature-column-title">Instant PDF Reports</h3>
          <p className="feature-column-desc">
            Instant PDF Reports for elegants, reports and now processing.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-left">
          <span className="footer-brand">Dalytics</span>
        </div>
        <div className="footer-middle">
          <span className="footer-copyright">© 2026 Dalytics Editorial Suite. All rights reserved.</span>
        </div>
        <div className="footer-right">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
          <a href="#contact">Contact</a>
          <a href="#status">Status</a>
        </div>
      </footer>
    </div>
  );
}
