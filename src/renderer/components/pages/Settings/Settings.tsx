import React, { useState, useEffect } from 'react';
import './Settings.css';

interface ApiKeyMetadata {
  hasKey: boolean;
  timestamp?: string;
  masked?: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyMetadata, setApiKeyMetadata] = useState<ApiKeyMetadata>({ hasKey: false });
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [matchThreshold, setMatchThreshold] = useState(0.8);
  const [databaseLocation, setDatabaseLocation] = useState('');
  const [isSecureStorageAvailable, setIsSecureStorageAvailable] = useState(false);

  // Load initial data
  useEffect(() => {
    loadApiKeyMetadata();
    loadSettings();
    checkSecureStorage();
  }, []);

  const loadApiKeyMetadata = async () => {
    try {
      const metadata = await (window as any).electronAPI.apiKey.getMetadata();
      setApiKeyMetadata(metadata);
    } catch (error) {
      console.error('Failed to load API key metadata:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await (window as any).electronAPI.settings.getAll();
      if (settings.success) {
        setCompanyName(settings.data.companyName || '');
        setAutoProcessing(settings.data.autoProcessing || false);
        setMatchThreshold(settings.data.matchThreshold || 0.8);
        setDatabaseLocation(settings.data.databaseLocation || '');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const checkSecureStorage = async () => {
    try {
      const available = await (window as any).electronAPI.apiKey.isSecureStorageAvailable();
      setIsSecureStorageAvailable(available);
    } catch (error) {
      console.error('Failed to check secure storage:', error);
    }
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setValidationResult(null);
  };

  const validateApiKey = async (keyToValidate?: string) => {
    const testKey = keyToValidate || apiKey;
    if (!testKey) return;

    setIsValidating(true);
    try {
      const result = await (window as any).electronAPI.apiKey.validateOpenAI(testKey);
      setValidationResult(result);
    } catch (error) {
      setValidationResult({ valid: false, error: 'Validation failed' });
    } finally {
      setIsValidating(false);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey) return;

    setIsSaving(true);
    try {
      const result = await (window as any).electronAPI.apiKey.storeOpenAI(apiKey);
      if (result.success) {
        setApiKey('');
        await loadApiKeyMetadata();
        setValidationResult({ valid: true });
      } else {
        setValidationResult({ valid: false, error: result.error });
      }
    } catch (error) {
      setValidationResult({ valid: false, error: 'Failed to save API key' });
    } finally {
      setIsSaving(false);
    }
  };

  const removeApiKey = async () => {
    if (!confirm('Are you sure you want to remove the stored API key?')) return;

    try {
      const result = await (window as any).electronAPI.apiKey.removeOpenAI();
      if (result.success) {
        await loadApiKeyMetadata();
        setValidationResult(null);
      }
    } catch (error) {
      console.error('Failed to remove API key:', error);
    }
  };

  const testExistingKey = async () => {
    setIsValidating(true);
    try {
      const result = await (window as any).electronAPI.apiKey.validateOpenAI();
      setValidationResult(result);
    } catch (error) {
      setValidationResult({ valid: false, error: 'Test failed' });
    } finally {
      setIsValidating(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        (window as any).electronAPI.settings.set('companyName', companyName),
        (window as any).electronAPI.settings.set('autoProcessing', autoProcessing),
        (window as any).electronAPI.settings.set('matchThreshold', matchThreshold),
        (window as any).electronAPI.settings.set('databaseLocation', databaseLocation)
      ]);
      
      // Show success feedback (you could add a toast notification here)
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setIsSaving(false);
    }
  };

  const resetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) return;

    try {
      await (window as any).electronAPI.settings.reset();
      await loadSettings();
      await loadApiKeyMetadata();
      setValidationResult(null);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  };

  const handleBrowseDatabaseLocation = async () => {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.file?.select) {
        alert('Directory selection not available');
        return;
      }

      const result = await electronAPI.file.select({
        title: 'Select Database Directory',
        properties: ['openDirectory']
      });

      if (result.success && result.data) {
        setDatabaseLocation(result.data);
      }
    } catch (error) {
      console.error('Directory selection failed:', error);
      alert('Failed to select directory: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure your application preferences and API settings</p>
      </div>

      <div className="settings-content">
        {/* OpenAI API Configuration */}
        <div className="settings-section">
          <h3>OpenAI API Configuration</h3>
          
          {/* Security indicator */}
          <div className="security-indicator">
            <div className={`security-badge ${isSecureStorageAvailable ? 'secure' : 'fallback'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 1l3 9h9l-7 5 3 9-8-6-8 6 3-9-7-5h9z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              {isSecureStorageAvailable ? 'Hardware encryption available' : 'Using software encryption'}
            </div>
          </div>

          {/* Current API key status */}
          {apiKeyMetadata.hasKey && (
            <div className="api-key-status">
              <div className="status-row">
                <span>Status:</span>
                <div className="status-badge success">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  API Key Configured
                </div>
              </div>
              <div className="status-row">
                <span>Key:</span>
                <span className="masked-key">{apiKeyMetadata.masked}</span>
              </div>
              {apiKeyMetadata.timestamp && (
                <div className="status-row">
                  <span>Stored:</span>
                  <span>{new Date(apiKeyMetadata.timestamp).toLocaleDateString()}</span>
                </div>
              )}
              <div className="api-key-actions">
                <button 
                  className="btn btn-sm btn-secondary" 
                  onClick={testExistingKey}
                  disabled={isValidating}
                >
                  {isValidating ? 'Testing...' : 'Test Key'}
                </button>
                <button 
                  className="btn btn-sm btn-danger" 
                  onClick={removeApiKey}
                >
                  Remove Key
                </button>
              </div>
            </div>
          )}

          {/* API key input */}
          <div className="form-group">
            <label htmlFor="api-key">
              {apiKeyMetadata.hasKey ? 'Replace API Key' : 'OpenAI API Key'}
            </label>
            <div className="input-with-actions">
              <input 
                type={showApiKey ? 'text' : 'password'}
                id="api-key" 
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="sk-..."
                className="form-input"
              />
              <div className="input-actions">
                <button 
                  type="button"
                  className="btn-icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    {showApiKey ? (
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="2"/>
                    ) : (
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                    )}
                  </svg>
                </button>
                {apiKey && (
                  <button 
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => validateApiKey()}
                    disabled={isValidating}
                  >
                    {isValidating ? 'Validating...' : 'Test'}
                  </button>
                )}
              </div>
            </div>
            
            {/* Validation result */}
            {validationResult && (
              <div className={`validation-result ${validationResult.valid ? 'success' : 'error'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  {validationResult.valid ? (
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2"/>
                  ) : (
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  )}
                </svg>
                {validationResult.valid ? 'API key is valid' : validationResult.error}
              </div>
            )}

            {apiKey && (
              <button 
                className="btn btn-primary btn-sm"
                onClick={saveApiKey}
                disabled={isSaving || isValidating}
              >
                {isSaving ? 'Saving...' : 'Save API Key'}
              </button>
            )}
            
            <p className="form-help">
              Required for AI-powered SKU matching. Get your API key from{' '}
              <a 
                href="https://platform.openai.com/account/api-keys" 
                onClick={(e) => {
                  e.preventDefault();
                  window.electronAPI.external.openUrl('https://platform.openai.com/account/api-keys');
                }}
                style={{ cursor: 'pointer', color: '#007bff', textDecoration: 'underline' }}
              >
                OpenAI Platform
              </a>
            </p>
          </div>
        </div>

        {/* Company Settings */}
        <div className="settings-section">
          <h3>Default Company Settings</h3>
          <div className="form-group">
            <label htmlFor="company-name">Your Company Name</label>
            <input 
              type="text" 
              id="company-name" 
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter your company name"
              className="form-input"
            />
            <p className="form-help">Used as default in product mappings</p>
          </div>
        </div>

        {/* Processing Options */}
        <div className="settings-section">
          <h3>Processing Options</h3>
          <div className="form-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={autoProcessing}
                onChange={(e) => setAutoProcessing(e.target.checked)}
              />
              <span>Enable automatic processing</span>
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
                value={matchThreshold}
                onChange={(e) => setMatchThreshold(parseFloat(e.target.value))}
                className="form-range"
              />
              <span className="range-value">{Math.round(matchThreshold * 100)}%</span>
            </div>
            <p className="form-help">Minimum confidence required for automatic matches</p>
          </div>
        </div>

        {/* Database Location */}
        <div className="settings-section">
          <h3>Database Configuration</h3>
          <div className="form-group">
            <label htmlFor="database-location">Database Directory</label>
            <div className="database-location-input">
              <input
                type="text"
                id="database-location"
                value={databaseLocation}
                onChange={(e) => setDatabaseLocation(e.target.value)}
                placeholder="Default: [User Data Directory]"
                className="form-input"
              />
              <button 
                type="button"
                onClick={handleBrowseDatabaseLocation}
                className="btn btn-secondary btn-sm"
              >
                <div className="btn-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                Browse
              </button>
            </div>
            <p className="form-help">
              Choose where to store your crosswalk database file (hvac-crosswalk.db). 
              Leave empty to use the default application data directory.
            </p>
            {databaseLocation && (
              <div className="database-path">
                <strong>Full path:</strong> {databaseLocation}/hvac-crosswalk.db
              </div>
            )}
            <div className="database-note">
              💡 Use the <strong>Export CSV</strong> button in the Database page to backup your crosswalk data.
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <button 
            className="btn btn-primary"
            onClick={saveSettings}
            disabled={isSaving}
          >
            <div className="btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          <button 
            className="btn btn-secondary"
            onClick={resetSettings}
          >
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