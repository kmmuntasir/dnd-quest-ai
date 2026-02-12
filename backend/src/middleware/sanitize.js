const sanitizeHtml = require('sanitize-html');
const { logger } = require('../utils/logger');

/**
 * Default sanitization options - strips all HTML
 */
const defaultOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard'
};

/**
 * Lenient sanitization options - allows basic formatting
 */
const lenientOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
  allowedAttributes: {},
  disallowedTagsMode: 'discard'
};

/**
 * Sanitize a string value by removing HTML tags
 * @param {string} value - The value to sanitize
 * @param {object} options - Sanitization options
 * @returns {string} Sanitized value
 */
function sanitizeString(value, options = defaultOptions) {
  if (typeof value !== 'string') return value;

  const sanitized = sanitizeHtml(value, options);

  // Log if content was modified (potential XSS attempt)
  if (sanitized !== value && process.env.NODE_ENV !== 'test') {
    logger.warn('Input sanitized - HTML tags removed', {
      originalLength: value.length,
      sanitizedLength: sanitized.length,
      preview: value.substring(0, 50)
    });
  }

  return sanitized;
}

/**
 * Recursively sanitize an object
 * @param {any} obj - The object to sanitize
 * @param {object} options - Sanitization options
 * @returns {any} Sanitized object
 */
function sanitizeObject(obj, options = defaultOptions) {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizeString(obj, options);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value, options);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Middleware to sanitize request body
 * @param {object} options - Sanitization options
 * @returns {Function} Express middleware
 */
function sanitizeBody(options = defaultOptions) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, options);
    }
    next();
  };
}

/**
 * Middleware to sanitize specific fields only
 * @param {string[]} fields - Array of field names to sanitize
 * @param {object} options - Sanitization options
 * @returns {Function} Express middleware
 */
function sanitizeFields(fields, options = defaultOptions) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      for (const field of fields) {
        if (req.body[field] !== undefined) {
          if (typeof req.body[field] === 'string') {
            req.body[field] = sanitizeString(req.body[field], options);
          } else if (typeof req.body[field] === 'object') {
            req.body[field] = sanitizeObject(req.body[field], options);
          }
        }
      }
    }
    next();
  };
}

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeBody,
  sanitizeFields,
  defaultOptions,
  lenientOptions
};
