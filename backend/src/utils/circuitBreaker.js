/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily blocking requests to a failing service
 */

const { logger } = require('./logger');

// Circuit states
const CircuitState = {
  CLOSED: 'CLOSED',     // Normal operation - requests pass through
  OPEN: 'OPEN',         // Failing - requests are blocked
  HALF_OPEN: 'HALF_OPEN' // Testing if service recovered
};

/**
 * Circuit Breaker class
 */
class CircuitBreaker {
  /**
   * @param {Object} options - Circuit breaker options
   * @param {string} options.name - Name for logging
   * @param {number} options.failureThreshold - Number of failures before opening (default: 5)
   * @param {number} options.resetTimeout - Time in ms before trying half-open (default: 30000)
   * @param {number} options.successThreshold - Successes in half-open to close (default: 2)
   */
  constructor(options = {}) {
    this.name = options.name || 'circuit-breaker';
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.successThreshold = options.successThreshold || 2;

    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();
  }

  /**
   * Check if requests are allowed
   * @returns {boolean} True if request should proceed
   */
  canRequest() {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      // Check if enough time has passed to try half-open
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.resetTimeout) {
        this.transitionTo(CircuitState.HALF_OPEN);
        return true;
      }
      return false;
    }

    // HALF_OPEN - allow limited requests
    return true;
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Record a failed request
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Failure in half-open state -> back to open
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Transition to a new state
   * @param {string} newState - The new state
   */
  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === CircuitState.CLOSED) {
      this.successCount = 0;
      this.failureCount = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
    }

    logger.info('Circuit breaker state changed', {
      name: this.name,
      from: oldState,
      to: newState,
      failureCount: this.failureCount
    });
  }

  /**
   * Get current state info
   * @returns {Object} State information
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange
    };
  }

  /**
   * Reset the circuit breaker
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();

    logger.info('Circuit breaker reset', { name: this.name });
  }
}

/**
 * Retry with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.shouldRetry - Function to determine if retry should happen
 * @returns {Promise<any>} Result of the function
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      logger.warn('Retrying after error', {
        attempt: attempt + 1,
        maxRetries,
        delay,
        error: error.message
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  CircuitBreaker,
  CircuitState,
  retryWithBackoff,
  sleep
};
