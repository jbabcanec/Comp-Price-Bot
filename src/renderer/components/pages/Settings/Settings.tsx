import React from 'react';
import './Settings.css';

export const Settings: React.FC = () => {
  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure your application preferences and API settings</p>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h3>OpenAI API Configuration</h3>
          <div className="form-group">
            <label htmlFor="api-key">API Key</label>
            <input 
              type="password" 
              id="api-key" 
              placeholder="Enter your OpenAI API key"
              className="form-input"
            />
            <p className="form-help">Required for AI-powered SKU matching</p>
          </div>
        </div>

        <div className="settings-section">
          <h3>Default Company Settings</h3>
          <div className="form-group">
            <label htmlFor="company-name">Your Company Name</label>
            <input 
              type="text" 
              id="company-name" 
              placeholder="Enter your company name"
              className="form-input"
            />
          </div>
        </div>

        <div className="settings-section">
          <h3>Processing Options</h3>
          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>  Enable automatic processing</span>
            </label>
            <p className="form-help">Automatically process files when uploaded</p>
          </div>
          
          <div className="form-group">
            <label htmlFor="match-threshold">Match Confidence Threshold</label>
            <div className="range-container">
              <input 
                type="range" 
                id="match-threshold" 
                min="0" 
                max="1" 
                step="0.1" 
                defaultValue="0.8"
                className="form-range"
              />
              <span className="range-value">80%</span>
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <button className="btn btn-primary">
            <div className="btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            Save Settings
          </button>
          <button className="btn btn-secondary">
            <div className="btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <polyline points="1 4 1 10 7 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};