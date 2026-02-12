/**
 * Environment variable validation
 * Fails fast if required configuration is missing
 */

const { logger } = require('../utils/logger');

// Required environment variables
const requiredVars = [
  'GROQ_API_KEY'
];

// Optional environment variables with defaults
const optionalVars = {
  'PORT': '3000',
  'NODE_ENV': 'development',
  'DATABASE_PATH': './data/dnd_ai.db',
  'LOG_LEVEL': 'info',
  'JWT_SECRET': 'dev-secret-key-change-in-production'
};

// Sensitive patterns to mask in logs
const sensitivePatterns = [
  'API_KEY',
  'SECRET',
  'PASSWORD',
  'TOKEN',
  'PRIVATE'
];

/**
 * Validate all required environment variables exist
 * @throws {Error} If required variables are missing
 */
function validateEnv() {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Set defaults for optional variables
  for (const [varName, defaultValue] of Object.entries(optionalVars)) {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
      logger.debug(`Using default value for ${varName}: ${defaultValue}`);
    }
  }

  // Check for placeholder values in API keys
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.includes('your_')) {
    warnings.push('GROQ_API_KEY appears to be a placeholder value');
  }

  // Check for JWT_SECRET in production - FAIL if insecure
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET ||
        process.env.JWT_SECRET.includes('dev-') ||
        process.env.JWT_SECRET.includes('change') ||
        process.env.JWT_SECRET.length < 32) {
      const message = 'JWT_SECRET must be set to a secure random value (minimum 32 characters) in production. Generate with: openssl rand -hex 32';
      logger.error(message);
      throw new Error(message);
    }
  }

  // Throw error if required vars are missing
  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(message);
    logger.error('Please check your .env file or environment configuration');
    throw new Error(message);
  }

  // Log warnings
  if (warnings.length > 0) {
    warnings.forEach(warning => logger.warn(warning));
  }

  // Log success (with masked values)
  logger.info('Environment validation passed', {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    groqKeyConfigured: !!process.env.GROQ_API_KEY,
    groqKeyPrefix: maskSensitive(process.env.GROQ_API_KEY)
  });
}

/**
 * Mask sensitive values for logging
 * @param {string} value - The value to mask
 * @returns {string} Masked value
 */
function maskSensitive(value) {
  if (!value) return '(not set)';
  if (value.length <= 8) return '***';
  return value.substring(0, 4) + '...' + value.substring(value.length - 4);
}

/**
 * Check if a variable name is sensitive
 * @param {string} varName - The variable name to check
 * @returns {boolean} True if sensitive
 */
function isSensitiveVar(varName) {
  return sensitivePatterns.some(pattern => varName.toUpperCase().includes(pattern));
}

/**
 * Get safe environment info for logging
 * @returns {object} Safe environment object
 */
function getSafeEnv() {
  const safeEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (isSensitiveVar(key)) {
      safeEnv[key] = maskSensitive(value);
    } else if (optionalVars[key] || requiredVars.includes(key)) {
      safeEnv[key] = value;
    }
  }
  return safeEnv;
}

module.exports = {
  validateEnv,
  maskSensitive,
  isSensitiveVar,
  getSafeEnv
};
