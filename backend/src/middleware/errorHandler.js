const { logger } = require('../utils/logger');

/**
 * Custom error classes for better error handling
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Distinguishes operational errors from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter = null) {
    super('Too many requests, please try again later', 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

class ExternalServiceError extends AppError {
  constructor(service = 'External service', message = null) {
    super(message || `${service} is temporarily unavailable`, 503, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

/**
 * Map SQLite error codes to user-friendly messages
 */
const SQLITE_ERROR_MESSAGES = {
  'SQLITE_CONSTRAINT': 'Data constraint violation',
  'SQLITE_CONSTRAINT_UNIQUE': 'This record already exists',
  'SQLITE_CONSTRAINT_FOREIGNKEY': 'Invalid reference to related data',
  'SQLITE_CONSTRAINT_NOTNULL': 'Required field is missing',
  'SQLITE_BUSY': 'Database is busy, please try again',
  'SQLITE_LOCKED': 'Database is locked, please try again',
  'SQLITE_FULL': 'Database is full',
  'SQLITE_READONLY': 'Database is read-only'
};

/**
 * Determine if error is safe to expose to client
 */
function isSafeToExpose(error) {
  // Operational errors are safe to expose
  if (error.isOperational) {
    return true;
  }

  // SQLite errors with known codes are safe
  if (error.code && SQLITE_ERROR_MESSAGES[error.code]) {
    return true;
  }

  // JSON parsing errors are safe
  if (error.type === 'entity.parse.failed') {
    return true;
  }

  // Validation errors from express-validator or similar
  if (error.name === 'ValidationError') {
    return true;
  }

  return false;
}

/**
 * Get user-safe error message
 */
function getSafeErrorMessage(error) {
  // Use custom message if available
  if (error.message && isSafeToExpose(error)) {
    return error.message;
  }

  // SQLite errors
  if (error.code && error.code.startsWith('SQLITE_')) {
    return SQLITE_ERROR_MESSAGES[error.code] || 'Database operation failed';
  }

  // Default generic message
  return 'An unexpected error occurred';
}

/**
 * Format error response
 */
function formatErrorResponse(error, includeDetails = false) {
  const response = {
    error: getSafeErrorMessage(error),
    code: error.code || 'INTERNAL_ERROR'
  };

  // Include validation details if available
  if (error.details) {
    response.details = error.details;
  }

  // Include retry-after for rate limit errors
  if (error.retryAfter) {
    response.retryAfter = error.retryAfter;
  }

  // Include stack trace in development
  if (includeDetails && process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.originalMessage = error.message;
  }

  return response;
}

/**
 * Main error handling middleware
 */
function errorHandler(err, req, res, next) {
  // Log the error with context
  const errorContext = {
    error: err.message,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };

  // Determine log level based on error severity
  const statusCode = err.statusCode || err.status || 500;
  if (statusCode >= 500) {
    logger.error('Server error', errorContext);
  } else if (statusCode >= 400) {
    logger.warn('Client error', errorContext);
  }

  // Handle specific error types

  // JSON parsing errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(formatErrorResponse({
      message: 'Invalid JSON in request body',
      code: 'INVALID_JSON'
    }));
  }

  // SQLite errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(500).json(formatErrorResponse(err));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(formatErrorResponse({
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    }));
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(formatErrorResponse({
      message: 'Token expired',
      code: 'TOKEN_EXPIRED'
    }));
  }

  // Validation errors (Zod, express-validator, etc.)
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    return res.status(400).json(formatErrorResponse({
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.details || err.errors
    }));
  }

  // Rate limit errors
  if (err.status === 429 || err.code === 'RATE_LIMIT_EXCEEDED') {
    return res.status(429).json(formatErrorResponse(err));
  }

  // Custom AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(formatErrorResponse(err, true));
  }

  // Default error response
  const status = err.status || err.statusCode || 500;
  return res.status(status).json(formatErrorResponse(err, true));
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  logger.debug('Route not found', {
    path: req.path,
    method: req.method
  });

  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    path: req.path
  });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError
};
