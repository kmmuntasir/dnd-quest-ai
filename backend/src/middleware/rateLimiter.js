const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

/**
 * General API rate limiter
 * Higher limit in development, production limit per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher in dev
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Skip rate limiting for lightweight status/polling endpoints
  skip: (req) => {
    const skipPaths = [
      '/status',           // Image status polling
      '/health',           // Health checks
      '/health/live',      // Liveness probe
      '/health/ready'      // Readiness probe
    ];
    return skipPaths.some(path => req.path.endsWith(path));
  },
  message: {
    error: 'Too many requests',
    message: 'Please try again later.'
  },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json(options.message);
  }
});

/**
 * AI generation rate limiter (stricter)
 * 10 requests per 15 minutes per IP
 * Applied to expensive AI operations
 */
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many AI requests',
    message: 'AI generation is limited. Please wait before generating more content.'
  },
  handler: (req, res, next, options) => {
    logger.warn('AI rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json(options.message);
  }
});

/**
 * Authentication rate limiter (very strict)
 * 5 requests per 15 minutes per IP
 * Applied to login/register to prevent brute force
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts',
    message: 'Please wait before trying again.'
  },
  handler: (req, res, next, options) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json(options.message);
  }
});

/**
 * Skip rate limiting in test environment
 */
const createConditionalLimiter = (limiter) => {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }
    return limiter(req, res, next);
  };
};

/**
 * Create a user-based rate limiter
 * Uses user ID if authenticated, otherwise falls back to IP
 * @param {object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.name - Name for logging
 * @returns {Function} Express middleware
 */
const createUserLimiter = ({ windowMs = 15 * 60 * 1000, max = 10, name = 'user-limiter' }) => {
  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // Use user ID if authenticated, otherwise let library handle IP (IPv6 safe)
    keyGenerator: (req, res) => {
      if (req.user?.id) {
        return `user:${req.user.id}`;
      }
      // Return undefined to use the library's default IP key generator
      // This ensures proper IPv6 handling
      return undefined;
    },
    message: {
      error: 'Too many requests',
      message: 'Please wait before making more requests.'
    },
    handler: (req, res, next, options) => {
      logger.warn(`${name} rate limit exceeded`, {
        userId: req.user?.id,
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      res.status(429).json(options.message);
    }
  });

  return createConditionalLimiter(limiter);
};

/**
 * User-based AI generation rate limiter
 * 10 requests per 15 minutes per user (or IP if not authenticated)
 */
const userAiLimiter = createUserLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  name: 'user-ai'
});

module.exports = {
  generalLimiter: createConditionalLimiter(generalLimiter),
  aiLimiter: createConditionalLimiter(aiLimiter),
  authLimiter: createConditionalLimiter(authLimiter),
  createUserLimiter,
  userAiLimiter
};
