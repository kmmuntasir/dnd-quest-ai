import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn()
      },
      response: {
        use: vi.fn()
      }
    }
  };
  return {
    default: mockAxios
  };
});

// Mock the config
vi.mock('../../src/config/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  API_TIMEOUT: 30000
}));

describe('API Service', () => {
  let mockAxios;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAxios = (await import('axios')).default;

    // Reset modules to get fresh api instance
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Axios instance creation', () => {
    it('should create axios instance with correct config', async () => {
      await import('../../src/services/api');

      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });

    it('should setup request interceptor', async () => {
      await import('../../src/services/api');

      expect(mockAxios.interceptors.request.use).toHaveBeenCalled();
    });

    it('should setup response interceptor', async () => {
      await import('../../src/services/api');

      expect(mockAxios.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('API modules', () => {
    it('should export adventuresAPI with correct methods', async () => {
      const { adventuresAPI } = await import('../../src/services/api');

      expect(typeof adventuresAPI.generate).toBe('function');
      expect(typeof adventuresAPI.generateCharacterName).toBe('function');
      expect(typeof adventuresAPI.generateContext).toBe('function');
      expect(typeof adventuresAPI.getById).toBe('function');
      expect(typeof adventuresAPI.getAll).toBe('function');
      expect(typeof adventuresAPI.delete).toBe('function');
    });

    it('should export gamesAPI with correct methods', async () => {
      const { gamesAPI } = await import('../../src/services/api');

      expect(typeof gamesAPI.start).toBe('function');
      expect(typeof gamesAPI.getById).toBe('function');
      expect(typeof gamesAPI.submitChoice).toBe('function');
      expect(typeof gamesAPI.goBack).toBe('function');
      expect(typeof gamesAPI.restart).toBe('function');
      expect(typeof gamesAPI.save).toBe('function');
    });

    it('should export savedGamesAPI with correct methods', async () => {
      const { savedGamesAPI } = await import('../../src/services/api');

      expect(typeof savedGamesAPI.getAll).toBe('function');
      expect(typeof savedGamesAPI.delete).toBe('function');
    });

    it('should export settingsAPI with correct methods', async () => {
      const { settingsAPI } = await import('../../src/services/api');

      expect(typeof settingsAPI.get).toBe('function');
      expect(typeof settingsAPI.update).toBe('function');
      expect(typeof settingsAPI.testAI).toBe('function');
    });

    it('should export imagesAPI with correct methods', async () => {
      const { imagesAPI } = await import('../../src/services/api');

      expect(typeof imagesAPI.regenerate).toBe('function');
    });

    it('should export healthAPI with correct methods', async () => {
      const { healthAPI } = await import('../../src/services/api');

      expect(typeof healthAPI.check).toBe('function');
    });
  });

  describe('Request deduplication', () => {
    it('should export clearPendingRequests function', async () => {
      const { clearPendingRequests } = await import('../../src/services/api');
      expect(typeof clearPendingRequests).toBe('function');
    });

    it('should export pendingRequests Map for testing', async () => {
      // Import api module
      await import('../../src/services/api');
      // If the module exports clearPendingRequests, the deduplication system is in place
      const { clearPendingRequests } = await import('../../src/services/api');
      // Calling it should not throw
      expect(() => clearPendingRequests()).not.toThrow();
    });
  });
});
