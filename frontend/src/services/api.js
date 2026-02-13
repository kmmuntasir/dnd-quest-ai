import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '../config/api';

/**
 * Safe localStorage utilities
 * Handles errors in environments where localStorage is unavailable
 */
const safeStorage = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Request deduplication map
 * Tracks pending requests to prevent duplicate API calls
 */
const pendingRequests = new Map();

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = safeStorage.get('auth_token');
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
          safeStorage.remove('auth_token');
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

// Override api methods to track pending requests for deduplication
// Note: We handle deduplication here instead of in the interceptor
// because we need access to the promise before the interceptor runs
const originalGet = api.get.bind(api);
const originalPost = api.post.bind(api);

api.get = (url, config = {}) => {
  const requestKey = `get:${url}::${JSON.stringify(config.params || {})}`;

  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const promise = originalGet(url, config);
  pendingRequests.set(requestKey, promise);
  promise.finally(() => pendingRequests.delete(requestKey));

  return promise;
};

api.post = (url, data, config = {}) => {
  // Only deduplicate specific POST endpoints using exact URL matching
  const deduplicatablePosts = [
    '/api/adventures/generate',
    '/api/settings/ai/test'
  ];

  const shouldDedupe = deduplicatablePosts.some(ep => url === ep);

  if (shouldDedupe) {
    const requestKey = `post:${url}:${JSON.stringify(data)}:`;

    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey);
    }

    const promise = originalPost(url, data, config);
    pendingRequests.set(requestKey, promise);
    promise.finally(() => pendingRequests.delete(requestKey));

    return promise;
  }

  return originalPost(url, data, config);
};

/**
 * Clear all pending requests
 * Useful for cleanup on logout or route change
 */
export function clearPendingRequests() {
  pendingRequests.clear();
}

/**
 * Adventures API
 */
export const adventuresAPI = {
  generate: (data) => api.post('/api/adventures/generate', data),
  generateCharacterName: (data) => api.post('/api/adventures/generate-character-name', data),
  generateContext: (data) => api.post('/api/adventures/generate-context', data),
  getById: (id) => api.get(`/api/adventures/${id}`),
  getAll: () => api.get('/api/adventures'),
  delete: (id) => api.delete(`/api/adventures/${id}`)
};

/**
 * Games API
 */
export const gamesAPI = {
  start: (data) => api.post('/api/games/start', data),
  getById: (id) => api.get(`/api/games/${id}`),
  submitChoice: (id, data) => api.post(`/api/games/${id}/choice`, data),
  goBack: (id) => api.post(`/api/games/${id}/go-back`),
  restart: (id) => api.post(`/api/games/${id}/restart`),
  save: (id) => api.post(`/api/games/${id}/save`)
};

/**
 * Saved Games API
 */
export const savedGamesAPI = {
  getAll: (params) => api.get('/api/saved-games', { params }),
  delete: (id) => api.delete(`/api/saved-games/${id}`),
  getAdventures: () => api.get('/api/saved-games/adventures'),
  getByAdventure: (adventureId) => api.get(`/api/saved-games/adventures/${adventureId}/games`)
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
 * Images API
 */
export const imagesAPI = {
  regenerate: (hash) => api.post(`/api/images/${hash}/regenerate`)
};

/**
 * Auth API
 */
export const authAPI = {
  login: (data) => api.post('/api/auth/login', data),
  register: (data) => api.post('/api/auth/register', data),
  getCurrentUser: () => api.get('/api/auth/me'),
  changePassword: (data) => api.put('/api/auth/password', data),
  logout: () => api.post('/api/auth/logout')
};

/**
 * Health check
 */
export const healthAPI = {
  check: () => api.get('/health')
};

export default api;
