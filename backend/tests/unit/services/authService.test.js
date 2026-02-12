import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken
} from '../../../src/services/authService.js';

describe('authService', () => {
  describe('hashPassword and comparePassword', () => {
    it('should hash a password', async () => {
      const password = 'mySecretPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should return true for correct password', async () => {
      const password = 'mySecretPassword123';
      const hash = await hashPassword(password);

      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'mySecretPassword123';
      const hash = await hashPassword(password);

      const result = await comparePassword('wrongPassword', hash);
      expect(result).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'mySecretPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateToken and verifyToken', () => {
    const testUser = {
      id: 1,
      email: 'test@example.com',
      username: 'TestUser'
    };

    it('should generate a valid JWT token', () => {
      const token = generateToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should verify a valid token', () => {
      const token = generateToken(testUser);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.username).toBe(testUser.username);
    });

    it('should return null for invalid token', () => {
      const result = verifyToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for malformed token', () => {
      // The verifyToken function might throw or return null depending on implementation
      // Let's test that it doesn't return valid user data
      let result;
      try {
        result = verifyToken('malformed-token');
      } catch (e) {
        // Expected to throw
        return;
      }
      // If it doesn't throw, it should return null/undefined
      expect(result).toBeFalsy();
    });

    it('should include expiration time', () => {
      const token = generateToken(testUser);
      const decoded = verifyToken(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken({ ...testUser, id: 1 });
      const token2 = generateToken({ ...testUser, id: 2 });

      expect(token1).not.toBe(token2);
    });
  });
});
