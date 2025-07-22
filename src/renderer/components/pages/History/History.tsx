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
          <div className="empty-state-icon">📋</div>
          <h3>No History Yet</h3>
          <p>Process some competitor files and your history will appear here with detailed statistics and results.</p>
        </div>
      </div>
    </div>
  );
};