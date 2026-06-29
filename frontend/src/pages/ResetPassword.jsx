import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import logoImg from '../assets/logo/logo.png';
import lockIconImg from '../assets/icons/lock.svg';
import './Login.css';
import './VerifyOTP.css';
import './ResetPassword.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Backspace auto-focus previous input
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleReset = async e => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter all 6 digits of the OTP code.');
      return;
    }
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/reset-password', {
        email,
        otp_code: fullOtp,
        new_password: newPassword
      });
      setSuccess('Password has been reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Reset failed.';
      setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('A new verification code has been sent to your email.');
      setResendTimer(30);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0].focus();
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to resend code.';
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
        <p className="login-card-subtitle">Set New Password</p>

        <p className="otp-message">
          Enter the 6-digit code sent to <br />
          <strong>{email}</strong> and type your new password.
        </p>

        <form onSubmit={handleReset} className="login-card-form">
          <div className="otp-inputs">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                value={digit}
                onChange={e => handleOtpChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                ref={el => (inputRefs.current[index] = el)}
                className="otp-input-field"
                disabled={loading}
              />
            ))}
          </div>

          <div className="login-input-group">
            <label className="login-input-label">New Password</label>
            <div className="login-input-wrapper">
              <img src={lockIconImg} className="login-field-icon-img" alt="Password" />
              <input
                type="password"
                required
                placeholder="New Password"
                className="login-text-input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-input-label">Confirm New Password</label>
            <div className="login-input-wrapper">
              <img src={lockIconImg} className="login-field-icon-img" alt="Password" />
              <input
                type="password"
                required
                placeholder="Confirm Password"
                className="login-text-input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && <p className="login-error-msg" style={{ textAlign: 'center' }}>{error}</p>}
          {success && <p className="login-success-msg" style={{ textAlign: 'center' }}>{success}</p>}

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="otp-resend-container">
          {canResend ? (
            <>
              Didn't receive the code?{' '}
              <button onClick={handleResend} className="otp-resend-btn" disabled={loading}>
                Resend Code
              </button>
            </>
          ) : (
            <span>Resend code in {resendTimer}s</span>
          )}
        </div>
      </div>
    </div>
  );
}
