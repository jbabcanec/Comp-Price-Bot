import React from 'react';
import './History.css';

export const History: React.FC = () => {
  return (
    <div className="history-page">
      <div className="page-header">
        <h1>Processing History</h1>
        <p>View past file processing operations and their results</p>
      </div>

      <div className="history-content">
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 22h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>No History Yet</h3>
          <p>Process some competitor files and your history will appear here with detailed statistics and results.</p>
        </div>
      </div>
    </div>
  );
};