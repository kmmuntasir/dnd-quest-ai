const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
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

module.exports = {
  generalLimiter: createConditionalLimiter(generalLimiter),
  aiLimiter: createConditionalLimiter(aiLimiter),
  authLimiter: createConditionalLimiter(authLimiter)
};
