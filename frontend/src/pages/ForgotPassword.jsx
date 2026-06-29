import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import logoImg from '../assets/logo/logo.png';
import mailIconImg from '../assets/login/email.png';
import './Login.css';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('Verification code sent! Redirecting...');
      setTimeout(() => {
        navigate('/reset-password', { state: { email } });
      }, 1500);
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to request password reset.';
      setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand-header">
          <img src={logoImg} alt="Dalytics Logo" className="login-logo-img" />
          <h2 className="login-brand-name">Dalytics</h2>
        </div>
        <p className="login-card-subtitle">Reset Password</p>

        <p className="forgot-description">
          Enter your email address and we'll send you a 6-digit OTP code to verify and reset your password.
        </p>

        <form onSubmit={handleSubmit} className="login-card-form">
          <div className="login-input-group">
            <label htmlFor="email" className="login-input-label">Email Address</label>
            <div className="login-input-wrapper">
              <img src={mailIconImg} className="login-field-icon-img" alt="Email" />
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@gmail.com"
                className="login-text-input"
                disabled={loading}
                required
              />
            </div>
          </div>

          {error && <p className="login-error-msg">{error}</p>}
          {success && <p className="login-success-msg">{success}</p>}

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? 'Sending Code...' : 'Send Verification Code'}
          </button>
        </form>

        <div className="forgot-footer">
          <Link to="/login" className="forgot-back-link">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
