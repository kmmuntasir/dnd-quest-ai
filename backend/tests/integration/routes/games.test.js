/**
 * Games Route Tests
 * Testing that the router module loads correctly and middleware is available
 */

import { describe, it, expect } from 'vitest';

describe('Games Routes', () => {
  describe('Module Loading', () => {
    it('should import games router module', async () => {
      const gamesRouter = await import('../../../src/routes/games');
      expect(gamesRouter.default).toBeDefined();
      expect(typeof gamesRouter.default).toBe('function');
    });

    it('should import required middleware modules', async () => {
      const auth = await import('../../../src/middleware/auth');
      const ownership = await import('../../../src/middleware/ownership');
      const rateLimiter = await import('../../../src/middleware/rateLimiter');

      expect(typeof auth.requireAuth).toBe('function');
      expect(typeof ownership.checkOwnership).toBe('function');
      expect(typeof rateLimiter.aiLimiter).toBe('function');
    });
  });

  describe('Middleware Exports', () => {
    it('should export requireAuth function from auth middleware', async () => {
      const { requireAuth } = await import('../../../src/middleware/auth');
      expect(typeof requireAuth).toBe('function');
    });

    it('should export checkOwnership function from ownership middleware', async () => {
      const { checkOwnership } = await import('../../../src/middleware/ownership');
      expect(typeof checkOwnership).toBe('function');
    });

    it('should export aiLimiter from rate limiter middleware', async () => {
      const { aiLimiter } = await import('../../../src/middleware/rateLimiter');
      expect(typeof aiLimiter).toBe('function');
    });
  });
});
