import React from 'react';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your HVAC SKU crosswalk operations</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card stats">
          <div className="card-header">
            <h3>Statistics</h3>
            <div className="card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 3v18h18M8 12l4-4 4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number">0</span>
              <span className="stat-label">Products Loaded</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">0</span>
              <span className="stat-label">Mappings Created</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">0</span>
              <span className="stat-label">Files Processed</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">0%</span>
              <span className="stat-label">Match Success Rate</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card quick-actions">
          <div className="card-header">
            <h3>Quick Actions</h3>
            <div className="card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
          </div>
          <div className="actions-grid">
            <button className="action-button primary">
              <div className="action-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="action-text">Select Our Files</span>
            </button>
            <button className="action-button">
              <div className="action-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="action-text">Upload Competitor Data</span>
            </button>
            <button className="action-button">
              <div className="action-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <span className="action-text">View Reports</span>
            </button>
            <button className="action-button">
              <div className="action-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="action-text">Settings</span>
            </button>
          </div>
        </div>

        <div className="dashboard-card system-status">
          <div className="card-header">
            <h3>System Status</h3>
            <div className="card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2"/>
                <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
          </div>
          <div className="status-list">
            <div className="status-item online">
              <span className="status-dot"></span>
              <span className="status-label">Database</span>
              <span className="status-value">Connected</span>
            </div>
            <div className="status-item pending">
              <span className="status-dot"></span>
              <span className="status-label">OpenAI API</span>
              <span className="status-value">Not Configured</span>
            </div>
            <div className="status-item online">
              <span className="status-dot"></span>
              <span className="status-label">File System</span>
              <span className="status-value">Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};