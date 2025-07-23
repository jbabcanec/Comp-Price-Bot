import React, { useState, useEffect } from 'react';
import './History.css';

interface ProcessingHistoryRecord {
  id: number;
  fileName: string;
  fileHash: string;
  companyName: string;
  totalItems: number;
  matchedItems: number;
  unmatchedItems: number;
  averageConfidence: number;
  processingTimeMs: number;
  processedAt: string;
  exactMatches: number;
  fuzzyMatches: number;
  specMatches: number;
  aiMatches: number;
  reviewRequired: number;
  fileSize: number;
}

interface AnalyticsData {
  totalProcessedFiles: number;
  totalProcessedItems: number;
  overallMatchRate: number;
  averageConfidence: number;
  averageProcessingTime: number;
  matchMethodBreakdown: {
    exact: number;
    fuzzy: number;
    specs: number;
    ai: number;
  };
  topCompanies: Array<{
    company: string;
    itemCount: number;
    matchRate: number;
  }>;
  recentActivity: ProcessingHistoryRecord[];
  confidenceDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    none: number;
  };
}

export const History: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [historyRecords, setHistoryRecords] = useState<ProcessingHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{start: string; end: string}>({
    start: '',
    end: ''
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'analytics'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load analytics data
      const analyticsResponse = await window.electronAPI.history.getAnalytics();
      if (analyticsResponse.success) {
        setAnalytics(analyticsResponse.data);
      }

      // Load history records
      const historyResponse = await window.electronAPI.history.getAll(100, 0);
      if (historyResponse.success && historyResponse.data) {
        setHistoryRecords(historyResponse.data);
      }
    } catch (error) {
      console.error('Failed to load history data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportHistory = async () => {
    try {
      const response = await window.electronAPI.history.exportCsv();
      if (response.success && response.data) {
        // Create and download CSV file
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `processing-history-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!confirm('Are you sure you want to delete this history record?')) return;
    
    try {
      const response = await window.electronAPI.history.delete(id);
      if (response.success) {
        setHistoryRecords(records => records.filter(r => r.id !== id));
        loadData(); // Refresh analytics
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number): string => {
    return `${(value).toFixed(1)}%`;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.95) return '#059669'; // green
    if (confidence >= 0.85) return '#0891b2'; // blue
    if (confidence >= 0.70) return '#d97706'; // orange
    if (confidence >= 0.50) return '#dc2626'; // red
    return '#6b7280'; // gray
  };

  const getMatchRateColor = (rate: number): string => {
    if (rate >= 90) return '#059669';
    if (rate >= 80) return '#0891b2';
    if (rate >= 70) return '#d97706';
    return '#dc2626';
  };

  if (loading) {
    return (
      <div className="history-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (!analytics || analytics.totalProcessedFiles === 0) {
    return (
      <div className="history-page">
        <div className="page-header-container">
          <div className="page-header">
            <h1>Processing History & Analytics</h1>
            <p>Track processing performance and analyze matching accuracy</p>
          </div>
        </div>

        <div className="history-content">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M9 11H7a2 2 0 000 4h2m4-4h2a2 2 0 010 4h-2m-4-4v4m0-4L9 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>No Processing History</h3>
            <p>Process some competitor files and your analytics will appear here with detailed statistics and performance metrics.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="page-header-container">
        <div className="page-header">
          <h1>Processing History & Analytics</h1>
          <p>Track processing performance and analyze matching accuracy</p>
        </div>
        <div className="page-actions">
          <button onClick={handleExportHistory} className="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <div className="history-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      <div className="history-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            {/* Key Metrics */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="metric-content">
                  <div className="metric-value">{analytics.totalProcessedFiles}</div>
                  <div className="metric-label">Files Processed</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke="currentColor" strokeWidth="2"/>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="metric-content">
                  <div className="metric-value">{analytics.totalProcessedItems.toLocaleString()}</div>
                  <div className="metric-label">Total Products</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="metric-content">
                  <div className="metric-value" style={{ color: getMatchRateColor(analytics.overallMatchRate) }}>
                    {formatPercentage(analytics.overallMatchRate)}
                  </div>
                  <div className="metric-label">Match Rate</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="metric-content">
                  <div className="metric-value" style={{ color: getConfidenceColor(analytics.averageConfidence) }}>
                    {formatPercentage(analytics.averageConfidence * 100)}
                  </div>
                  <div className="metric-label">Avg Confidence</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="section-card">
              <h3>Recent Activity</h3>
              {analytics.recentActivity.length > 0 ? (
                <div className="recent-activity">
                  {analytics.recentActivity.slice(0, 5).map(record => (
                    <div key={record.id} className="activity-item">
                      <div className="activity-info">
                        <div className="activity-file">{record.fileName}</div>
                        <div className="activity-company">{record.companyName}</div>
                      </div>
                      <div className="activity-stats">
                        <span className="activity-items">{record.totalItems} items</span>
                        <span 
                          className="activity-rate"
                          style={{ color: getMatchRateColor((record.matchedItems / record.totalItems) * 100) }}
                        >
                          {formatPercentage((record.matchedItems / record.totalItems) * 100)} matched
                        </span>
                      </div>
                      <div className="activity-time">
                        {new Date(record.processedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No recent activity</p>
              )}
            </div>

            {/* Top Companies */}
            <div className="section-card">
              <h3>Top Companies by Volume</h3>
              {analytics.topCompanies.length > 0 ? (
                <div className="top-companies">
                  {analytics.topCompanies.map((company, index) => (
                    <div key={company.company} className="company-item">
                      <div className="company-rank">#{index + 1}</div>
                      <div className="company-info">
                        <div className="company-name">{company.company}</div>
                        <div className="company-stats">
                          {company.itemCount} items • {formatPercentage(company.matchRate)} match rate
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No company data available</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-section">
            {/* Match Method Breakdown */}
            <div className="section-card">
              <h3>Match Method Distribution</h3>
              <div className="method-breakdown">
                <div className="method-item">
                  <div className="method-label">Exact Matches</div>
                  <div className="method-bar">
                    <div 
                      className="method-fill exact" 
                      style={{ 
                        width: `${(analytics.matchMethodBreakdown.exact / Math.max(analytics.totalProcessedItems, 1)) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="method-count">{analytics.matchMethodBreakdown.exact}</div>
                </div>
                
                <div className="method-item">
                  <div className="method-label">Fuzzy Matches</div>
                  <div className="method-bar">
                    <div 
                      className="method-fill fuzzy" 
                      style={{ 
                        width: `${(analytics.matchMethodBreakdown.fuzzy / Math.max(analytics.totalProcessedItems, 1)) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="method-count">{analytics.matchMethodBreakdown.fuzzy}</div>
                </div>
                
                <div className="method-item">
                  <div className="method-label">Spec Matches</div>
                  <div className="method-bar">
                    <div 
                      className="method-fill specs" 
                      style={{ 
                        width: `${(analytics.matchMethodBreakdown.specs / Math.max(analytics.totalProcessedItems, 1)) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="method-count">{analytics.matchMethodBreakdown.specs}</div>
                </div>
                
                <div className="method-item">
                  <div className="method-label">AI Matches</div>
                  <div className="method-bar">
                    <div 
                      className="method-fill ai" 
                      style={{ 
                        width: `${(analytics.matchMethodBreakdown.ai / Math.max(analytics.totalProcessedItems, 1)) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="method-count">{analytics.matchMethodBreakdown.ai}</div>
                </div>
              </div>
            </div>

            {/* Confidence Distribution */}
            <div className="section-card">
              <h3>Confidence Score Distribution</h3>
              <div className="confidence-distribution">
                <div className="confidence-item excellent">
                  <div className="confidence-label">Excellent (95-100%)</div>
                  <div className="confidence-count">{analytics.confidenceDistribution.excellent}</div>
                </div>
                <div className="confidence-item good">
                  <div className="confidence-label">Good (85-94%)</div>
                  <div className="confidence-count">{analytics.confidenceDistribution.good}</div>
                </div>
                <div className="confidence-item fair">
                  <div className="confidence-label">Fair (70-84%)</div>
                  <div className="confidence-count">{analytics.confidenceDistribution.fair}</div>
                </div>
                <div className="confidence-item poor">
                  <div className="confidence-label">Poor (50-69%)</div>
                  <div className="confidence-count">{analytics.confidenceDistribution.poor}</div>
                </div>
                <div className="confidence-item none">
                  <div className="confidence-label">None (0-49%)</div>
                  <div className="confidence-count">{analytics.confidenceDistribution.none}</div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="section-card">
              <h3>Performance Metrics</h3>
              <div className="performance-metrics">
                <div className="performance-item">
                  <div className="performance-label">Average Processing Time</div>
                  <div className="performance-value">{formatDuration(analytics.averageProcessingTime)}</div>
                </div>
                <div className="performance-item">
                  <div className="performance-label">Items per Hour</div>
                  <div className="performance-value">
                    {analytics.averageProcessingTime > 0 ? 
                      Math.round(3600000 / analytics.averageProcessingTime).toLocaleString() : 
                      'N/A'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            <div className="history-filters">
              <select 
                value={selectedCompany} 
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Companies</option>
                {analytics.topCompanies.map(company => (
                  <option key={company.company} value={company.company}>
                    {company.company}
                  </option>
                ))}
              </select>
            </div>

            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Company</th>
                    <th>Items</th>
                    <th>Match Rate</th>
                    <th>Confidence</th>
                    <th>Processing Time</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRecords
                    .filter(record => selectedCompany === 'all' || record.companyName === selectedCompany)
                    .map(record => (
                    <tr key={record.id}>
                      <td>
                        <div className="file-info">
                          <div className="file-name">{record.fileName}</div>
                          <div className="file-size">{formatFileSize(record.fileSize)}</div>
                        </div>
                      </td>
                      <td>{record.companyName}</td>
                      <td>
                        <div className="items-breakdown">
                          <div>{record.totalItems} total</div>
                          <div className="items-matched">{record.matchedItems} matched</div>
                        </div>
                      </td>
                      <td>
                        <span 
                          className="match-rate"
                          style={{ color: getMatchRateColor((record.matchedItems / record.totalItems) * 100) }}
                        >
                          {formatPercentage((record.matchedItems / record.totalItems) * 100)}
                        </span>
                      </td>
                      <td>
                        <span 
                          className="confidence-score"
                          style={{ color: getConfidenceColor(record.averageConfidence) }}
                        >
                          {formatPercentage(record.averageConfidence * 100)}
                        </span>
                      </td>
                      <td>{formatDuration(record.processingTimeMs)}</td>
                      <td>{new Date(record.processedAt).toLocaleDateString()}</td>
                      <td>
                        <button 
                          onClick={() => handleDeleteRecord(record.id)}
                          className="btn-delete"
                          title="Delete record"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2"/>
                            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};