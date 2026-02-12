import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, retryWithBackoff, sleep } from '../../../src/utils/circuitBreaker.js';

describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test-breaker',
      failureThreshold: 3,
      resetTimeout: 1000,
      successThreshold: 2
    });
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.state).toBe('CLOSED');
      expect(breaker.failureCount).toBe(0);
      expect(breaker.successCount).toBe(0);
    });

    it('should allow requests in CLOSED state', () => {
      expect(breaker.canRequest()).toBe(true);
    });
  });

  describe('recordSuccess', () => {
    it('should reset failure count on success', () => {
      breaker.failureCount = 5;
      breaker.recordSuccess();
      expect(breaker.failureCount).toBe(0);
    });

    it('should increment success count in HALF_OPEN state', () => {
      breaker.state = 'HALF_OPEN';
      breaker.recordSuccess();
      expect(breaker.successCount).toBe(1);
    });

    it('should transition to CLOSED after successThreshold successes', () => {
      breaker.state = 'HALF_OPEN';
      breaker.recordSuccess();
      breaker.recordSuccess();
      expect(breaker.state).toBe('CLOSED');
    });
  });

  describe('recordFailure', () => {
    it('should increment failure count', () => {
      breaker.recordFailure();
      expect(breaker.failureCount).toBe(1);
    });

    it('should update lastFailureTime', () => {
      const before = Date.now();
      breaker.recordFailure();
      expect(breaker.lastFailureTime).toBeGreaterThanOrEqual(before);
    });

    it('should transition to OPEN after failureThreshold failures', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.state).toBe('OPEN');
    });

    it('should transition to OPEN immediately on failure in HALF_OPEN', () => {
      breaker.state = 'HALF_OPEN';
      breaker.recordFailure();
      expect(breaker.state).toBe('OPEN');
    });
  });

  describe('canRequest', () => {
    it('should return true in CLOSED state', () => {
      expect(breaker.canRequest()).toBe(true);
    });

    it('should return false in OPEN state (before timeout)', () => {
      breaker.state = 'OPEN';
      breaker.lastFailureTime = Date.now();
      expect(breaker.canRequest()).toBe(false);
    });

    it('should transition to HALF_OPEN after timeout', () => {
      breaker.state = 'OPEN';
      breaker.lastFailureTime = Date.now() - 1001; // 1ms past timeout
      expect(breaker.canRequest()).toBe(true);
      expect(breaker.state).toBe('HALF_OPEN');
    });

    it('should return true in HALF_OPEN state', () => {
      breaker.state = 'HALF_OPEN';
      expect(breaker.canRequest()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      breaker.state = 'OPEN';
      breaker.failureCount = 10;
      breaker.successCount = 5;
      breaker.lastFailureTime = Date.now();

      breaker.reset();

      expect(breaker.state).toBe('CLOSED');
      expect(breaker.failureCount).toBe(0);
      expect(breaker.successCount).toBe(0);
      expect(breaker.lastFailureTime).toBeNull();
    });
  });

  describe('getState', () => {
    it('should return current state info', () => {
      const state = breaker.getState();
      expect(state).toHaveProperty('name', 'test-breaker');
      expect(state).toHaveProperty('state', 'CLOSED');
      expect(state).toHaveProperty('failureCount', 0);
      expect(state).toHaveProperty('successCount', 0);
    });
  });
});

describe('retryWithBackoff', () => {
  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const result = await retryWithBackoff(fn, { baseDelay: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(retryWithBackoff(fn, { maxRetries: 2, baseDelay: 10 }))
      .rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should respect shouldRetry option', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const shouldRetry = vi.fn().mockReturnValue(false);

    await expect(retryWithBackoff(fn, { shouldRetry, baseDelay: 10 }))
      .rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalled();
  });
});

describe('sleep', () => {
  it('should delay execution', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some variance
  });
});
