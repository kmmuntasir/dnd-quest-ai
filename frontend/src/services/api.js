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

/**
 * Generate a unique key for request deduplication
 * @param {Object} config - Axios request config
 * @returns {string} Unique request key
 */
function getRequestKey(config) {
  const { method, url, data, params } = config;
  const dataStr = data ? JSON.stringify(data) : '';
  const paramsStr = params ? JSON.stringify(params) : '';
  return `${method}:${url}:${dataStr}:${paramsStr}`;
}

/**
 * Check if request should be deduplicated
 * Only deduplicate GET requests and specific POST endpoints
 * @param {Object} config - Axios request config
 * @returns {boolean} Whether to deduplicate
 */
function shouldDeduplicate(config) {
  // Always deduplicate GET requests
  if (config.method === 'get') return true;

  // For POST requests, only deduplicate specific endpoints
  // (e.g., not form submissions or state-changing operations)
  const deduplicatablePosts = [
    '/api/adventures/generate',
    '/api/settings/ai/test'
  ];

  if (config.method === 'post' && deduplicatablePosts.some(ep => config.url?.includes(ep))) {
    return true;
  }

  return false;
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add auth and handle deduplication
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = safeStorage.get('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Check for duplicate pending request
    if (shouldDeduplicate(config)) {
      const requestKey = getRequestKey(config);

      if (pendingRequests.has(requestKey)) {
        // Return the existing promise for duplicate requests
        // This creates a custom adapter that returns the cached promise
        const existingPromise = pendingRequests.get(requestKey);
        config.adapter = () => existingPromise;
        return config;
      }

      // Store the request promise for deduplication
      // The promise will be set in the response interceptor
      config._requestKey = requestKey;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and cleanup deduplication
api.interceptors.response.use(
  (response) => {
    // Clean up pending request
    const requestKey = response.config._requestKey;
    if (requestKey) {
      pendingRequests.delete(requestKey);
    }
    return response.data;
  },
  (error) => {
    // Clean up pending request on error
    const requestKey = error.config?._requestKey;
    if (requestKey) {
      pendingRequests.delete(requestKey);
    }

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

// Override api methods to track pending requests
const originalGet = api.get.bind(api);
const originalPost = api.post.bind(api);

api.get = (url, config = {}) => {
  const requestKey = `get:${url}::${JSON.stringify(config.params || {})}`;

  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const promise = originalGet(url, config);
  pendingRequests.set(requestKey, promise);

  // Clean up after resolution
  promise.finally(() => pendingRequests.delete(requestKey));

  return promise;
};

api.post = (url, data, config = {}) => {
  const deduplicatablePosts = [
    '/api/adventures/generate',
    '/api/settings/ai/test'
  ];

  const shouldDedupe = deduplicatablePosts.some(ep => url.includes(ep));

  if (shouldDedupe) {
    const requestKey = `post:${url}:${JSON.stringify(data)}:`;

    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey);
    }

    const promise = originalPost(url, data, config);
    pendingRequests.set(requestKey, promise);

    // Clean up after resolution
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
 * Images API
 */
export const imagesAPI = {
  regenerate: (hash) => api.post(`/api/images/${hash}/regenerate`)
};

/**
 * Health check
 */
export const healthAPI = {
  check: () => api.get('/health')
};

export default api;
