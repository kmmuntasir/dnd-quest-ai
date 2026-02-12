const winston = require('winston');
const crypto = require('crypto');

// Sensitive key patterns to redact from logs
const sensitivePatterns = [
  /api[_-]?key/gi,
  /secret/gi,
  /password/gi,
  /token/gi,
  /authorization/gi,
  /bearer/gi,
  /gsk_/gi,  // Groq API key prefix
  /sk_/gi    // Common API key prefix
];

// Store for request-specific metadata (correlation IDs)
const requestContext = new Map();

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Redact sensitive values from log metadata
 */
const redactSensitive = winston.format((info) => {
  const redact = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    for (const key of Object.keys(obj)) {
      // Check if key name is sensitive
      const isSensitiveKey = sensitivePatterns.some(pattern => pattern.test(key));

      if (isSensitiveKey && typeof obj[key] === 'string') {
        // Mask the value
        if (obj[key].length <= 8) {
          obj[key] = '***';
        } else {
          obj[key] = obj[key].substring(0, 4) + '...' + obj[key].substring(obj[key].length - 4);
        }
      } else if (typeof obj[key] === 'object') {
        redact(obj[key]);
      }
    }
    return obj;
  };

  if (info.meta) redact(info.meta);
  redact(info);
  return info;
});

/**
 * Add request ID to log entries
 */
const addRequestId = winston.format((info) => {
  const requestId = requestContext.get('requestId');
  if (requestId) {
    info.requestId = requestId;
  }
  return info;
});

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  addRequestId(),
  redactSensitive(),
  winston.format.json()
);

// Pretty format for development
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  addRequestId(),
  winston.format.printf(({ level, message, timestamp, requestId, ...meta }) => {
    const reqId = requestId ? `[${requestId}] ` : '';
    let msg = `${timestamp} [${level}]: ${reqId}${message}`;
    // Filter out internal winston fields
    const cleanMeta = { ...meta };
    delete cleanMeta.service;
    if (Object.keys(cleanMeta).length > 0) {
      msg += ` ${JSON.stringify(cleanMeta)}`;
    }
    return msg;
  })
);

// Choose format based on environment
const isProduction = process.env.NODE_ENV === 'production';
const logFormat = isProduction ? jsonFormat : devFormat;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'dnd-backend' },
  transports: [
    // In production, write to files
    ...(isProduction ? [
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ] : [
      // In development, just console
      new winston.transports.Console()
    ])
  ]
});

/**
 * Set request ID for current context
 */
function setRequestId(id) {
  requestContext.set('requestId', id || generateRequestId());
  return requestContext.get('requestId');
}

/**
 * Get current request ID
 */
function getRequestId() {
  return requestContext.get('requestId');
}

/**
 * Clear request ID
 */
function clearRequestId() {
  requestContext.delete('requestId');
}

/**
 * Request ID middleware - adds correlation ID to all logs in a request
 */
function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || generateRequestId();
  req.requestId = requestId;
  setRequestId(requestId);

  // Add request ID to response headers
  res.setHeader('X-Request-Id', requestId);

  // Clear context when response finishes
  res.on('finish', () => {
    clearRequestId();
  });

  next();
}

/**
 * HTTP request logging middleware
 */
function httpLogger(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    // Log level based on status code
    if (res.statusCode >= 500) {
      logger.error('HTTP request', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP request', logData);
    } else {
      logger.info('HTTP request', logData);
    }
  });

  next();
}

/**
 * Create a child logger with additional context
 */
function createLogger(context) {
  return {
    info: (message, meta = {}) => logger.info(message, { ...context, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { ...context, ...meta }),
    error: (message, meta = {}) => logger.error(message, { ...context, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { ...context, ...meta }),
    verbose: (message, meta = {}) => logger.verbose(message, { ...context, ...meta })
  };
}

module.exports = {
  logger,
  httpLogger,
  requestIdMiddleware,
  setRequestId,
  getRequestId,
  clearRequestId,
  createLogger
};
