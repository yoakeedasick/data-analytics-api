import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo/logo.png';
import './Login.css';

import mailIconImg from '../assets/login/email.png';
import lockIconImg from '../assets/login/password.png';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const isRegister = location.pathname === '/register';

  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegister) {
        // Register user
        await register(form.email, form.password, form.fullName);
        // Redirect to OTP verification screen passing the email state
        navigate('/verify-otp', { state: { email: form.email } });
      } else {
        // Log in user
        await login(form.email, form.password);
        // Redirect to dashboard
        navigate('/dashboard');
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'An authentication error occurred.';
      setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo/Brand and subtitle */}
        <div className="login-brand-header">
          <img src={logoImg} alt="Dalytics Logo" className="login-logo-img" />
          <h2 className="login-brand-name">Dalytics</h2>
        </div>
        <p className="login-card-subtitle">
          {isRegister ? 'Create your account' : 'Sign in to your account'}
        </p>

        <form onSubmit={handleSubmit} className="login-card-form">
          {/* Full Name field (Register only) */}
          {isRegister && (
            <div className="login-input-group">
              <label className="login-input-label">Full Name</label>
              <div className="login-input-wrapper">
                <UserIcon />
                <input
                  name="fullName"
                  type="text"
                  required
                  placeholder="John Doe"
                  className="login-text-input"
                  value={form.fullName}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          {/* Email input field */}
          <div className="login-input-group">
            <label className="login-input-label">Email Address</label>
            <div className="login-input-wrapper">
              <img src={mailIconImg} className="login-field-icon-img" alt="Email" />
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="user@gmail.com"
                className="login-text-input"
                value={form.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Password input field */}
          <div className="login-input-group">
            <label className="login-input-label">Password</label>
            <div className="login-input-wrapper">
              <img src={lockIconImg} className="login-field-icon-img" alt="Password" />
              <input
                name="password"
                type="password"
                required
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder="••••••••"
                className="login-text-input"
                value={form.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Action Row: Back to Home & Forgot password */}
          <div className="login-actions-row">
            <Link to="/" className="login-back-home-link">
              ← Back to Home
            </Link>
            {!isRegister && <Link to="/forgot-password" className="login-forgot-link">Forgot password?</Link>}
          </div>

          {error && <p className="login-error-msg">{error}</p>}

          {/* Submit Button */}
          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? (isRegister ? 'Creating Account…' : 'Signing in…') : (
              <>
                {isRegister ? 'Create Account' : 'Sign In'} <span className="btn-arrow">→</span>
              </>
            )}
          </button>
        </form>

        {/* Footer toggling link */}
        <div className="login-card-footer">
          {isRegister ? (
            <>
              Already have an account?{' '}
              <Link to="/login" className="login-footer-link">Sign In</Link>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <Link to="/register" className="login-footer-link">Request Access</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}



function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      className="field-icon">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
