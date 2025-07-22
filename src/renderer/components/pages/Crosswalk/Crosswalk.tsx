import React from 'react';
import './Crosswalk.css';

export const Crosswalk: React.FC = () => {
  return (
    <div className="crosswalk-page">
      <div className="page-header">
        <h1>Crosswalk Table</h1>
        <p>Review and manage SKU mappings between competitors and your products</p>
      </div>

      <div className="crosswalk-content">
        <div className="empty-state">
          <div className="empty-state-icon">🔄</div>
          <h3>No Crosswalks Yet</h3>
          <p>Upload competitor files to start creating intelligent SKU mappings with AI assistance.</p>
          <button className="btn btn-primary large">
            <span className="btn-icon">📁</span>
            Upload Competitor Files
          </button>
        </div>
      </div>
    </div>
  );
};