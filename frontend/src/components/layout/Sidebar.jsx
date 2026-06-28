import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

import logoImg from '../../assets/logo/logo.png';
import dashboardIcon from '../../assets/sidebar/dashboard.png';
import filesIcon from '../../assets/sidebar/files.png';
import analyticsIcon from '../../assets/sidebar/analytics.png';
import settingsIcon from '../../assets/sidebar/setting.png';
import logoutIcon from '../../assets/sidebar/logout.png';
import homeIcon from '../../assets/sidebar/home.png';
import helpIcon from '../../assets/sidebar/help.png';
import collapseSidebarIcon from '../../assets/sidebar/collapse_sidebar.png';
import expandSidebarIcon from '../../assets/sidebar/expand_sidebar.png';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleToggle = (e) => {
      setIsCollapsed(e.detail.isCollapsed);
    };
    window.addEventListener('sidebar-toggle', handleToggle);
    return () => window.removeEventListener('sidebar-toggle', handleToggle);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className={`sidebar-brand ${isCollapsed ? 'collapsed' : ''}`}>
        {!isCollapsed ? (
          <div className="brand-wrapper">
            <img src={logoImg} alt="Dalytics" className="brand-logo-img" />
            <span className="brand-name">Dalytics</span>
          </div>
        ) : (
          <img src={logoImg} alt="Dalytics" className="brand-logo-img collapsed" />
        )}
      </div>

      <div className="sidebar-divider" />

      {/* New Project CTA */}
      <div className="sidebar-cta">
        <NavLink to="/upload" className="btn-new-project" title="New Project">
          <PlusIcon />
          {!isCollapsed && <span>New Project</span>}
        </NavLink>
      </div>

      {/* Nav Menu Items */}
      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          title="Dashboard"
        >
          <img src={dashboardIcon} className="menu-icon-img" alt="Dashboard" />
          {!isCollapsed && <span>Dashboard</span>}
        </NavLink>

        <NavLink
          to="/files"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          title="Files"
        >
          <img src={filesIcon} className="menu-icon-img" alt="Files" />
          {!isCollapsed && <span>Files</span>}
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) => `sidebar-nav-item ${(isActive || location.pathname.startsWith('/analysis/')) ? 'active' : ''}`}
          title="Analytics"
        >
          <img src={analyticsIcon} className="menu-icon-img" alt="Analytics" />
          {!isCollapsed && <span>Analytics</span>}
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          title="Settings"
        >
          <img src={settingsIcon} className="menu-icon-img" alt="Settings" />
          {!isCollapsed && <span>Settings</span>}
        </NavLink>
      </nav>

      {/* Footer Navigation */}
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="sidebar-footer-btn logout-btn" title="Sign Out">
          <img src={logoutIcon} className="menu-icon-img" alt="Sign Out" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>

        <Link to="/" className="sidebar-footer-link" title="Back to Home">
          <img src={homeIcon} className="menu-icon-img" alt="Home" />
          {!isCollapsed && <span>Back to Home</span>}
        </Link>

        <button className="sidebar-footer-btn" title="Help Center">
          <img src={helpIcon} className="menu-icon-img" alt="Help" />
          {!isCollapsed && <span>Help Center</span>}
        </button>
      </div>
    </aside>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
