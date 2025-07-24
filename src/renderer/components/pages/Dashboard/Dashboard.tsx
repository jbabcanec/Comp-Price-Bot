import React from 'react';
import { IconComponent } from '../../shared/IconComponent';
import './Dashboard.css';

interface DashboardProps {
  onNavigate?: (pageId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
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
              <IconComponent name="chart" size={20} />
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
              <IconComponent name="plus" size={20} />
            </div>
          </div>
          <div className="actions-grid">
            <button 
              className="action-button primary"
              onClick={() => onNavigate?.('products')}
              title="Navigate to Our Files page"
            >
              <div className="action-icon">
                <IconComponent name="folder" size={20} />
              </div>
              <span className="action-text">Select Our Files</span>
            </button>
            <button 
              className="action-button"
              onClick={() => onNavigate?.('upload')}
              title="Navigate to Competitor Data upload page"
            >
              <div className="action-icon">
                <IconComponent name="upload" size={20} />
              </div>
              <span className="action-text">Upload Competitor Data</span>
            </button>
            <button 
              className="action-button"
              onClick={() => onNavigate?.('history')}
              title="Navigate to History & Analytics page"
            >
              <div className="action-icon">
                <IconComponent name="reports" size={20} />
              </div>
              <span className="action-text">View Reports</span>
            </button>
            <button 
              className="action-button"
              onClick={() => onNavigate?.('settings')}
              title="Navigate to Settings page"
            >
              <div className="action-icon">
                <IconComponent name="settings" size={20} />
              </div>
              <span className="action-text">Settings</span>
            </button>
          </div>
        </div>

        <div className="dashboard-card system-status">
          <div className="card-header">
            <h3>System Status</h3>
            <div className="card-icon">
              <IconComponent name="database" size={20} />
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