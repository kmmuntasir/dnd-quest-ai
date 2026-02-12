/**
 * API Configuration
 * Environment-based configuration for API endpoints
 */

// Base API URL from environment or default
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// API timeout in milliseconds
export const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000;

// API version (for future versioning)
export const API_VERSION = 'v1';

// Full API URL with version if needed
export const getApiUrl = (path = '') => {
  if (path.startsWith('http')) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

// WebSocket URL (for future real-time features)
export const WS_URL = import.meta.env.VITE_WS_URL ||
  (typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? `wss://${window.location.host}`
    : `ws://${API_BASE_URL.replace(/^https?:\/\//, '')}`);

// Feature flags
export const FEATURES = {
  enableOfflineMode: import.meta.env.VITE_ENABLE_OFFLINE === 'true',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  debugMode: import.meta.env.VITE_DEBUG === 'true' || import.meta.env.DEV
};

// Log configuration in debug mode
if (FEATURES.debugMode) {
  console.log('[API Config]', {
    API_BASE_URL,
    API_TIMEOUT,
    FEATURES
  });
}

export default {
  API_BASE_URL,
  API_TIMEOUT,
  API_VERSION,
  WS_URL,
  FEATURES,
  getApiUrl
};
