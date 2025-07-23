import React, { useState, useEffect } from 'react';
import './Header.css';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'HVAC SKU Crosswalk Analyzer' }) => {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    // Get app version on mount
    const getVersion = async () => {
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.app?.getVersion) {
          const result = await electronAPI.app.getVersion();
          if (result.success) {
            setVersion(result.data);
          }
        }
      } catch (error) {
        console.error('Failed to get app version:', error);
      }
    };
    
    getVersion();
  }, []);


  return (
    <header className="app-header">
      <div className="header-left">
        <div className="app-logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 9h6v6H9z" fill="currentColor"/>
            </svg>
          </div>
          <div className="app-info">
            <h1 className="app-title">{title}</h1>
            {version && <span className="app-version">v{version}</span>}
          </div>
        </div>
      </div>

      <div className="header-center">
        <div className="status-indicator">
          <div className="status-dot online"></div>
          <span className="status-text">System Ready</span>
        </div>
      </div>

    </header>
  );
};