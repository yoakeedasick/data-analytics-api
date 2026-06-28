import React, { useState, useEffect } from 'react'; // React component
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Topbar.css';

import searchIcon from '../../assets/topbar/search.png';
import bellIcon from '../../assets/topbar/notification.png';
import collapseSidebarIcon from '../../assets/sidebar/collapse_sidebar.png';
import expandSidebarIcon from '../../assets/sidebar/expand_sidebar.png';

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard Overview', sub: 'Your analytics at a glance.' },
  '/files': { title: 'File History', sub: 'Review recent editorial uploads and processing statuses.' },
  '/upload': { title: 'Upload Assets', sub: 'Upload your CSV data files for analysis' },
  '/settings': { title: 'Settings', sub: 'Manage your account preferences' },
  '/analytics': { title: 'Analysis Detail', sub: 'Comprehensive breakdown of editorial engagement metrics for the campaign.' },
};

export default function Topbar({ title, subTitle }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const basePath = '/' + pathname.split('/')[1];
  const info = PAGE_TITLES[basePath] || { title: 'Dalytics', sub: '' };

  const displayTitle = title || info.title;
  const displaySub = subTitle !== undefined ? subTitle : info.sub;

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      if (next) {
        document.body.classList.add('sidebar-collapsed');
      } else {
        document.body.classList.remove('sidebar-collapsed');
      }
      window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { isCollapsed: next } }));
      return next;
    });
  };

  useEffect(() => {
    const handleToggle = (e) => {
      setIsCollapsed(e.detail.isCollapsed);
    };
    window.addEventListener('sidebar-toggle', handleToggle);
    return () => window.removeEventListener('sidebar-toggle', handleToggle);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button onClick={toggleSidebar} className="topbar-toggle-btn" title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
          {isCollapsed ? (
            <img src={expandSidebarIcon} alt="Expand" className="topbar-toggle-icon" />
          ) : (
            <img src={collapseSidebarIcon} alt="Collapse" className="topbar-toggle-icon" />
          )}
        </button>
        <div className="topbar-title-wrap">
          <h1 className="topbar-title">{displayTitle}</h1>
          {displaySub && <p className="topbar-sub">{displaySub}</p>}
        </div>
      </div>
      <div className="topbar-right">
        <div className="topbar-search">
          <img src={searchIcon} className="topbar-icon-img" alt="Search" />
          <input placeholder="Search..." className="topbar-search-input" />
        </div>
        <button className="topbar-icon-btn" aria-label="Notifications">
          <img src={bellIcon} className="topbar-icon-img" alt="Notifications" />
        </button>
        <Link to="/settings" className="topbar-avatar-link" title="Settings">
          <div className="topbar-avatar">{userInitial}</div>
        </Link>
      </div>
    </header>
  );
}
