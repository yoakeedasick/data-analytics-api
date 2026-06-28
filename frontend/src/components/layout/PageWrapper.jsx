import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './PageWrapper.css';

export default function PageWrapper({ children, title, subTitle }) {
  return (
    <>
      <Sidebar />
      <div className="main-area">
        <Topbar title={title} subTitle={subTitle} />
        <main className="main-content page-enter">
          {children}
        </main>
      </div>
    </>
  );
}
