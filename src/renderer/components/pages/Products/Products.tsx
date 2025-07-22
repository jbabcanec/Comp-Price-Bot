import React from 'react';
import './Products.css';

export const Products: React.FC = () => {
  return (
    <div className="products-page">
      <div className="page-header">
        <h1>Our Files</h1>
        <p>Select your directory and manage your HVAC product files</p>
      </div>

      <div className="page-actions">
        <button className="btn btn-primary">
          <div className="btn-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          Select Directory
        </button>
        <button className="btn btn-secondary">
          <div className="btn-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          Refresh Files
        </button>
        <button className="btn btn-secondary">
          <div className="btn-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          Select All
        </button>
      </div>

      <div className="products-content">
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>No Directory Selected</h3>
          <p>Choose a directory containing your HVAC product files (CSV, Excel, PDF). Files will be listed with checkboxes to select which ones to include.</p>
          <button className="btn btn-primary large">
            <div className="btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            Select Your Directory
          </button>
        </div>
      </div>
    </div>
  );
};