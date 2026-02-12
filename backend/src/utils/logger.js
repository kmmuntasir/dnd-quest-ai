const winston = require('winston');

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

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  redactSensitive(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'dnd-backend' },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: '../logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all error logs to error.log
    new winston.transports.File({
      filename: '../logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Request logging middleware
function httpLogger(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP request', {
      method: req.method,
      path: req.path,
      query: req.query,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });

  next();
}

module.exports = {
  logger,
  httpLogger
};
