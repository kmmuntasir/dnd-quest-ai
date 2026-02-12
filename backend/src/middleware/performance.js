const { logger } = require('../utils/logger');

/**
 * Performance monitoring middleware
 * Logs slow requests and tracks response times
 */

// Threshold for slow requests (3 seconds)
const SLOW_REQUEST_THRESHOLD = 3000;

// Threshold for very slow requests (10 seconds)
const VERY_SLOW_REQUEST_THRESHOLD = 10000;

/**
 * Middleware to monitor request performance
 * Logs warnings for slow requests and tracks metrics
 */
function performanceMonitor(req, res, next) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // Listen for response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    const route = `${req.method}:${req.route?.path || req.path}`;

    // Calculate memory delta
    const memoryDelta = {
      heapUsed: Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024),
      external: Math.round((endMemory.external - startMemory.external) / 1024 / 1024)
    };

    // Prepare log data
    const logData = {
      route,
      duration: `${duration}ms`,
      statusCode: res.statusCode,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent')?.substring(0, 100),
      memoryDelta: `${memoryDelta.heapUsed}MB heap`
    };

    // Log based on severity
    if (duration > VERY_SLOW_REQUEST_THRESHOLD) {
      logger.error('Very slow request detected', logData);
    } else if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn('Slow request detected', logData);
    } else if (process.env.NODE_ENV === 'development' && duration > 1000) {
      // In development, log requests over 1 second as info
      logger.info('Request completed', { route, duration: `${duration}ms` });
    }
  });

  next();
}

/**
 * Create a timer for tracking async operations
 * @param {string} operation - Name of the operation
 * @returns {Function} Function to call when operation completes
 */
function createTimer(operation) {
  const start = Date.now();

  return function end(customLogData = {}) {
    const duration = Date.now() - start;

    if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn('Slow operation', {
        operation,
        duration: `${duration}ms`,
        ...customLogData
      });
    }

    return duration;
  };
}

/**
 * Track AI API call performance
 */
function trackAIPerformance(provider, operation) {
  const start = Date.now();

  return function end(success, tokensUsed = 0) {
    const duration = Date.now() - start;

    logger.info('AI API call completed', {
      provider,
      operation,
      duration: `${duration}ms`,
      success,
      tokensUsed
    });

    // Warn if AI call takes too long
    if (duration > 30000) { // 30 seconds
      logger.warn('Very slow AI API call', {
        provider,
        operation,
        duration: `${duration}ms`
      });
    }

    return duration;
  };
}

module.exports = {
  performanceMonitor,
  createTimer,
  trackAIPerformance,
  SLOW_REQUEST_THRESHOLD,
  VERY_SLOW_REQUEST_THRESHOLD
};
