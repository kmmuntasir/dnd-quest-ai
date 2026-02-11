import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add auth or headers
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);

    // Handle common errors
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          break;
        case 404:
          // Not found
          error.message = data?.error || 'Resource not found';
          break;
        case 500:
          // Server error
          error.message = data?.error || 'Server error. Please try again.';
          break;
        default:
          error.message = data?.error || error.message;
      }
    } else if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please try again.';
    } else if (!navigator.onLine) {
      error.message = 'No internet connection. Please check your network.';
    }

    return Promise.reject(error);
  }
);

/**
 * Adventures API
 */
export const adventuresAPI = {
  generate: (data) => api.post('/api/adventures/generate', data),
  getById: (id) => api.get(`/api/adventures/${id}`),
  getAll: () => api.get('/api/adventures')
};

/**
 * Games API
 */
export const gamesAPI = {
  start: (data) => api.post('/api/games/start', data),
  getById: (id) => api.get(`/api/games/${id}`),
  submitChoice: (id, data) => api.post(`/api/games/${id}/choice`, data),
  save: (id) => api.post(`/api/games/${id}/save`)
};

/**
 * Saved Games API
 */
export const savedGamesAPI = {
  getAll: (params) => api.get('/api/saved-games', { params }),
  delete: (id) => api.delete(`/api/saved-games/${id}`)
};

/**
 * Settings API
 */
export const settingsAPI = {
  get: () => api.get('/api/settings'),
  update: (data) => api.put('/api/settings', data),
  testAI: () => api.get('/api/settings/ai/test')
};

/**
 * Health check
 */
export const healthAPI = {
  check: () => api.get('/health')
};

export default api;
