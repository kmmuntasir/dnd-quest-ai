/**
 * Saved Games Route Tests
 * Testing that the router module loads correctly and middleware is available
 */

import { describe, it, expect } from 'vitest';

describe('Saved Games Routes', () => {
  describe('Module Loading', () => {
    it('should import savedGames router module', async () => {
      const savedGamesRouter = await import('../../../src/routes/savedGames');
      expect(savedGamesRouter.default).toBeDefined();
      expect(typeof savedGamesRouter.default).toBe('function');
    });

    it('should import required middleware modules', async () => {
      const auth = await import('../../../src/middleware/auth');
      const ownership = await import('../../../src/middleware/ownership');

      expect(typeof auth.requireAuth).toBe('function');
      expect(typeof ownership.checkOwnership).toBe('function');
      expect(typeof ownership.requireAuthAndFilter).toBe('function');
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
  });
});
