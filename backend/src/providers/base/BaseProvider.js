/**
 * Base Provider Abstract Class
 * All AI providers (image and text) extend from this base
 */

const { logger } = require('../../utils/logger');
const { CircuitBreaker, retryWithBackoff } = require('../../utils/circuitBreaker');

/**
 * Abstract base class for all AI providers
 * Provides common functionality:
 * - Circuit breaker pattern
 * - Health tracking
 * - Retry logic
 * - Configuration management
 */
class BaseProvider {
  /**
   * @param {Object} config - Provider configuration
   * @param {string} config.name - Provider name (e.g., 'pollinations', 'groq')
   * @param {string} config.type - Provider type ('image' or 'text')
   * @param {Object} config.circuitBreaker - Circuit breaker options
   * @param {number} config.timeout - Default request timeout in ms
   * @param {number} config.maxRetries - Maximum retry attempts
   */
  constructor(config = {}) {
    if (this.constructor === BaseProvider) {
      throw new Error('BaseProvider is an abstract class and cannot be instantiated directly');
    }

    this.name = config.name || 'unknown';
    this.type = config.type || 'unknown';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.baseRetryDelay = config.baseRetryDelay || 1000;

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      name: `${this.name}-${this.type}`,
      failureThreshold: config.circuitBreaker?.failureThreshold || 5,
      resetTimeout: config.circuitBreaker?.resetTimeout || 30000,
      successThreshold: config.circuitBreaker?.successThreshold || 2
    });

    // Health tracking
    this.lastHealthCheck = null;
    this.healthStatus = 'unknown';
    this.consecutiveFailures = 0;
    this.totalRequests = 0;
    this.successfulRequests = 0;
  }

  /**
   * Check if provider can accept requests (circuit breaker state)
   * @returns {boolean}
   */
  canRequest() {
    return this.circuitBreaker.canRequest();
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    this.circuitBreaker.recordSuccess();
    this.consecutiveFailures = 0;
    this.successfulRequests++;
    this.healthStatus = 'healthy';
  }

  /**
   * Record a failed request
   * @param {Error} error - The error that occurred
   */
  recordFailure(error) {
    this.circuitBreaker.recordFailure();
    this.consecutiveFailures++;
    this.healthStatus = this.consecutiveFailures >= 3 ? 'unhealthy' : 'degraded';

    logger.error(`Provider ${this.name} request failed`, {
      error: error.message,
      consecutiveFailures: this.consecutiveFailures,
      circuitState: this.circuitBreaker.getState().state
    });
  }

  /**
   * Execute a request with circuit breaker and retry logic
   * @param {Function} fn - Async function to execute
   * @param {Object} options - Execution options
   * @returns {Promise<any>}
   */
  async executeWithProtection(fn, options = {}) {
    if (!this.canRequest()) {
      throw new Error(`${this.name} provider is currently unavailable (circuit breaker open)`);
    }

    this.totalRequests++;

    try {
      const result = await retryWithBackoff(fn, {
        maxRetries: options.maxRetries ?? this.maxRetries,
        baseDelay: options.baseRetryDelay ?? this.baseRetryDelay,
        shouldRetry: options.shouldRetry ?? ((error) => {
          // Retry on network errors or 5xx responses
          return !error.response || error.response?.status >= 500;
        })
      });

      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }

  /**
   * Get provider health status
   * @returns {Object} Health information
   */
  getHealth() {
    return {
      name: this.name,
      type: this.type,
      status: this.healthStatus,
      lastHealthCheck: this.lastHealthCheck,
      circuitBreaker: this.circuitBreaker.getState(),
      metrics: {
        totalRequests: this.totalRequests,
        successfulRequests: this.successfulRequests,
        failedRequests: this.totalRequests - this.successfulRequests,
        successRate: this.totalRequests > 0
          ? (this.successfulRequests / this.totalRequests * 100).toFixed(2) + '%'
          : 'N/A',
        consecutiveFailures: this.consecutiveFailures
      }
    };
  }

  /**
   * Test the provider connection
   * Must be implemented by subclasses
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    throw new Error('testConnection must be implemented by subclass');
  }

  /**
   * Perform a health check and update status
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const isHealthy = await this.testConnection();
      this.lastHealthCheck = new Date().toISOString();
      this.healthStatus = isHealthy ? 'healthy' : 'unhealthy';
      return this.getHealth();
    } catch (error) {
      this.lastHealthCheck = new Date().toISOString();
      this.healthStatus = 'unhealthy';
      return this.getHealth();
    }
  }

  /**
   * Reset provider state
   */
  reset() {
    this.circuitBreaker.reset();
    this.consecutiveFailures = 0;
    this.healthStatus = 'unknown';
    logger.info(`Provider ${this.name} reset`);
  }
}

module.exports = BaseProvider;
