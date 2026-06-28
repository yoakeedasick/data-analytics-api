import React, { useState, useEffect } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Settings.css';

export default function Settings() {
  const { user } = useAuth();

  // Profile settings
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Platform preferences
  const [notifications, setNotifications] = useState(true);
  const [retentionPeriod, setRetentionPeriod] = useState('30');
  const [configLoading, setConfigLoading] = useState(false);
  const [configMessage, setConfigMessage] = useState('');
  const [configError, setConfigError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/auth/me');
        setName(response.data.full_name || '');
        setEmail(response.data.email || '');
      } catch (err) {
        setProfileError('Failed to fetch user profile details.');
      }
    };
    fetchProfile();

    // Load local preferences
    const storedNotifs = localStorage.getItem('pref_notifications');
    if (storedNotifs !== null) {
      setNotifications(storedNotifs === 'true');
    }
    const storedRetention = localStorage.getItem('pref_retention');
    if (storedRetention !== null) {
      setRetentionPeriod(storedRetention);
    }
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage('');
    setProfileError('');

    try {
      const response = await api.put('/auth/profile', { full_name: name });
      setProfileMessage('Profile settings saved successfully.');
      
      // Update local storage user object
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.name = response.data.full_name;
      localStorage.setItem('user', JSON.stringify(storedUser));
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleConfigSave = () => {
    setConfigLoading(true);
    setConfigMessage('');
    setConfigError('');
    localStorage.setItem('pref_notifications', notifications.toString());
    localStorage.setItem('pref_retention', retentionPeriod);
    setTimeout(() => {
      setConfigLoading(false);
      setConfigMessage('System configuration saved successfully.');
    }, 400);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    setPasswordMessage('');
    setPasswordError('');

    try {
      await api.put('/auth/password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      setPasswordMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.detail || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <PageWrapper title="Settings" subTitle="Manage your account preferences and system configuration.">
      <div className="settings-container">

        <div className="settings-card">
          <h2 className="settings-card-title">Profile Settings</h2>
          <form onSubmit={handleProfileSubmit} className="settings-form">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                className="form-control"
                disabled
              />
              <span className="form-help">Email cannot be changed. Contact your administrator.</span>
            </div>

            {profileError && <div className="settings-error-msg">{profileError}</div>}
            {profileMessage && <div className="settings-success-msg">{profileMessage}</div>}

            <button type="submit" className="btn btn-primary" disabled={profileLoading}>
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        <div className="settings-card">
          <h2 className="settings-card-title">Password</h2>
          <form onSubmit={handlePasswordSubmit} className="settings-form">
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-control"
                required
              />
            </div>

            {passwordError && <div className="settings-error-msg">{passwordError}</div>}
            {passwordMessage && <div className="settings-success-msg">{passwordMessage}</div>}

            <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        <div className="settings-card">
          <h2 className="settings-card-title">System Configuration</h2>
          <div className="settings-form">
            <div className="form-group check-group">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                />
                <span className="checkbox-label">Enable email processing notifications</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Data Retention Policy</label>
              <select
                value={retentionPeriod}
                onChange={(e) => setRetentionPeriod(e.target.value)}
                className="form-control"
              >
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="365">1 Year</option>
              </select>
              <span className="form-help">Automatically remove processed dataset files after selected period.</span>
            </div>

            {configError && <div className="settings-error-msg">{configError}</div>}
            {configMessage && <div className="settings-success-msg">{configMessage}</div>}

            <button
              onClick={handleConfigSave}
              className="btn btn-primary"
              disabled={configLoading}
            >
              {configLoading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
