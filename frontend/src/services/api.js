import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// API methods
export const apiService = {
  // Health check
  checkHealth: () => api.get('/health'),
  
  // Agent status
  getAgentStatus: () => api.get('/agents/status'),
  
  // File upload
  uploadFile: (formData, onUploadProgress) => {
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
      timeout: 120000, // 2 minutes for file uploads
    });
  },
  
  // Search
  searchCompetitor: (query, searchWeb = false) => {
    return api.post('/search', { query, search_web: searchWeb });
  },
  
  // Matches
  getMatches: (page = 1, perPage = 20) => {
    return api.get('/matches', {
      params: { page, per_page: perPage }
    });
  },

  // API Key Management
  saveApiKey: (apiKey) => {
    return api.post('/config/api-key', { api_key: apiKey });
  },
  
  getApiKeyStatus: () => {
    return api.get('/config/api-key');
  },
};

export default api;