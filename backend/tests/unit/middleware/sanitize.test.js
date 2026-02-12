/**
 * Sanitize Middleware Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sanitizeString, sanitizeObject, sanitizeBody, sanitizeFields, defaultOptions, lenientOptions } from '../../../src/middleware/sanitize';

describe('Sanitize Middleware', () => {
  describe('sanitizeString', () => {
    it('should strip HTML tags from string', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('should remove script tags', () => {
      const input = '<script>document.cookie</script>';
      const result = sanitizeString(input);
      expect(result).toBe('');
    });

    it('should remove onclick attributes', () => {
      const input = '<div onclick="alert(1)">Content</div>';
      const result = sanitizeString(input);
      expect(result).toBe('Content');
    });

    it('should return non-string values unchanged', () => {
      expect(sanitizeString(123)).toBe(123);
      expect(sanitizeString(null)).toBe(null);
      expect(sanitizeString(undefined)).toBe(undefined);
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle strings without HTML', () => {
      const input = 'Just plain text';
      expect(sanitizeString(input)).toBe(input);
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>Safe content';
      const result = sanitizeString(input);
      expect(result).toBe('Safe content');
    });

    it('should remove img tags with onerror', () => {
      const input = '<img src="x" onerror="alert(1)">Text';
      const result = sanitizeString(input);
      expect(result).toBe('Text');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values in object', () => {
      const input = {
        name: '<b>John</b>',
        email: 'test@example.com',
        bio: '<script>alert(1)</script>Hello'
      };
      const result = sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.email).toBe('test@example.com');
      expect(result.bio).toBe('Hello');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<script>evil</script>Alice',
          profile: {
            bio: '<b>Bold</b> text'
          }
        }
      };
      const result = sanitizeObject(input);
      expect(result.user.name).toBe('Alice');
      expect(result.user.profile.bio).toBe('Bold text');
    });

    it('should handle arrays', () => {
      const input = {
        tags: ['<script>xss</script>tag1', 'tag2', '<b>tag3</b>']
      };
      const result = sanitizeObject(input);
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle null and undefined values', () => {
      const input = {
        name: 'John',
        nickname: null,
        middleName: undefined
      };
      const result = sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.nickname).toBe(null);
      expect(result.middleName).toBe(undefined);
    });

    it('should handle non-object values', () => {
      expect(sanitizeObject('string')).toBe('string');
      expect(sanitizeObject(123)).toBe(123);
      expect(sanitizeObject(null)).toBe(null);
    });

    it('should handle empty objects', () => {
      const result = sanitizeObject({});
      expect(result).toEqual({});
    });

    it('should preserve non-string types', () => {
      const input = {
        count: 42,
        active: true,
        data: { nested: 'value' }
      };
      const result = sanitizeObject(input);
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.data).toEqual({ nested: 'value' });
    });
  });

  describe('sanitizeBody middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
      mockReq = { body: {} };
      mockRes = {};
      mockNext = vi.fn();
    });

    it('should sanitize request body', () => {
      mockReq.body = {
        name: '<script>alert(1)</script>John',
        email: 'test@example.com'
      };
      const middleware = sanitizeBody();

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.name).toBe('John');
      expect(mockReq.body.email).toBe('test@example.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty body', () => {
      mockReq.body = {};
      const middleware = sanitizeBody();

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body).toEqual({});
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing body', () => {
      delete mockReq.body;
      const middleware = sanitizeBody();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('sanitizeFields middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
      mockReq = { body: {} };
      mockRes = {};
      mockNext = vi.fn();
    });

    it('should sanitize only specified fields', () => {
      mockReq.body = {
        name: '<b>John</b>',
        email: 'test@example.com',
        bio: '<script>evil</script>Hello'
      };
      const middleware = sanitizeFields(['name', 'bio']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.name).toBe('John');
      expect(mockReq.body.bio).toBe('Hello');
      expect(mockReq.body.email).toBe('test@example.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing fields gracefully', () => {
      mockReq.body = { name: 'John' };
      const middleware = sanitizeFields(['name', 'bio']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.name).toBe('John');
      expect(mockReq.body.bio).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle nested field values', () => {
      mockReq.body = {
        user: {
          name: '<script>xss</script>Alice'
        }
      };
      const middleware = sanitizeFields(['user']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.user.name).toBe('Alice');
    });
  });

  describe('options', () => {
    it('defaultOptions should strip all tags', () => {
      const input = '<b><i>Mixed</i></b>';
      const result = sanitizeString(input, defaultOptions);
      expect(result).toBe('Mixed');
    });

    it('lenientOptions should allow basic formatting tags', () => {
      const input = '<b><i>Bold and italic</i></b><script>xss</script>';
      const result = sanitizeString(input, lenientOptions);
      expect(result).toBe('<b><i>Bold and italic</i></b>');
    });
  });
});
