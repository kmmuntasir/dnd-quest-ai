/**
 * Ownership Middleware Tests
 * Uses in-memory database for testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import db from '../../../src/config/database';

// Wait for database to be ready
let dbReady = false;
beforeEach(async () => {
  if (!dbReady) {
    await db.ready;
    dbReady = true;
  }
});

// Import after database is configured
const { checkOwnership, RESOURCE_CONFIG } = await import('../../../src/middleware/ownership');

describe('Ownership Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let testUserId;
  let testAdventureId;
  let testGameId;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create test user
    const userResult = await db.run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      ['testuser', 'test@example.com', 'hash123']
    );
    testUserId = userResult.lastID;

    // Create test adventure
    const adventureResult = await db.run(
      'INSERT INTO adventures (title, description, user_id) VALUES (?, ?, ?)',
      ['Test Adventure', 'A test adventure', testUserId]
    );
    testAdventureId = adventureResult.lastID;

    // Create test game
    const gameResult = await db.run(
      `INSERT INTO saved_games (adventure_id, user_id, character_name, character_class, stats, hp, gold)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [testAdventureId, testUserId, 'TestChar', 'Warrior', '{}', 100, 50]
    );
    testGameId = gameResult.lastID;

    mockReq = {
      params: { id: String(testGameId) },
      user: { id: testUserId, email: 'test@example.com' }
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
  });

  afterEach(async () => {
    // Clean up test data
    await db.run('DELETE FROM saved_games');
    await db.run('DELETE FROM adventures');
    await db.run('DELETE FROM users');
  });

  describe('checkOwnership', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockReq.user = null;
      const middleware = checkOwnership('game');

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 if resource not found', async () => {
      mockReq.params.id = '99999';
      const middleware = checkOwnership('game');

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Resource not found',
        message: 'The requested game does not exist'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if user does not own the resource', async () => {
      // Create another user
      const otherUser = await db.run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        ['otheruser', 'other@example.com', 'hash456']
      );

      // Create game owned by other user
      const otherGame = await db.run(
        `INSERT INTO saved_games (adventure_id, user_id, character_name, character_class, stats, hp, gold)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [testAdventureId, otherUser.lastID, 'OtherChar', 'Mage', '{}', 80, 30]
      );

      mockReq.params.id = String(otherGame.lastID);
      const middleware = checkOwnership('game');

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'You do not have permission to access this resource'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next if user owns the resource', async () => {
      const middleware = checkOwnership('game');

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.resource).toEqual({
        type: 'game',
        id: String(testGameId),
        ownerId: testUserId
      });
    });

    it('should allow access if resource has no owner (null user_id)', async () => {
      // Create game with null user_id
      const noOwnerGame = await db.run(
        `INSERT INTO saved_games (adventure_id, user_id, character_name, character_class, stats, hp, gold)
         VALUES (?, NULL, ?, ?, ?, ?, ?)`,
        [testAdventureId, 'NoOwnerChar', 'Rogue', '{}', 60, 20]
      );

      mockReq.params.id = String(noOwnerGame.lastID);
      const middleware = checkOwnership('game');

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 500 for invalid resource type', async () => {
      const middleware = checkOwnership('invalid-type');

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Server configuration error',
        message: 'Invalid resource type'
      });
    });

    it('should work with adventure resource type', async () => {
      mockReq.params.id = String(testAdventureId);
      const middleware = checkOwnership('adventure');

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should work with savedGame resource type', async () => {
      const middleware = checkOwnership('savedGame');

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('RESOURCE_CONFIG', () => {
    it('should have correct config for game', () => {
      expect(RESOURCE_CONFIG.game).toEqual({
        table: 'saved_games',
        userIdColumn: 'user_id'
      });
    });

    it('should have correct config for adventure', () => {
      expect(RESOURCE_CONFIG.adventure).toEqual({
        table: 'adventures',
        userIdColumn: 'user_id'
      });
    });

    it('should have correct config for settings', () => {
      expect(RESOURCE_CONFIG.settings).toEqual({
        table: 'settings',
        userIdColumn: 'user_id'
      });
    });

    it('should have correct config for savedGame', () => {
      expect(RESOURCE_CONFIG.savedGame).toEqual({
        table: 'saved_games',
        userIdColumn: 'user_id'
      });
    });
  });
});
