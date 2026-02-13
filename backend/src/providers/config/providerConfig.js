/**
 * Provider Configuration
 * Centralized configuration for all AI providers
 * Values are loaded from environment variables with sensible defaults
 */

const { logger } = require('../../utils/logger');

/**
 * Image Provider Configuration
 */
const imageProviderConfig = {
  // Primary provider to use
  primary: process.env.IMAGE_PROVIDER_PRIMARY || 'pollinations',

  // Fallback providers (comma-separated list)
  fallbacks: (process.env.IMAGE_PROVIDER_FALLBACKS || 'aihorde')
    .split(',')
    .map(p => p.trim())
    .filter(p => p),

  // Pollinations-specific config
  pollinations: {
    apiKey: process.env.POLLINATIONS_API_KEY || null,
    defaultModel: 'flux',
    defaultWidth: 1024,
    defaultHeight: 1024,
    enhance: true,
    timeout: parseInt(process.env.POLLINATIONS_TIMEOUT) || 30000,
    appReferrer: 'dungeons-and-dragons-rpg',
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
      successThreshold: 2
    }
  },

  // AI Horde-specific config
  aihorde: {
    apiKey: process.env.AI_HORDE_API_KEY || null,
    apiUrl: 'https://aihorde.net/api/v2',
    model: process.env.AI_HORDE_MODEL || 'AlbedoBase XL',
    steps: parseInt(process.env.AI_HORDE_STEPS) || 25,
    sampler: process.env.AI_HORDE_SAMPLER || 'k_euler',
    width: parseInt(process.env.AI_HORDE_WIDTH) || 1024,
    height: parseInt(process.env.AI_HORDE_HEIGHT) || 1024,
    cfgScale: parseFloat(process.env.AI_HORDE_CFG_SCALE) || 7,
    // Polling configuration for async generation
    pollInterval: parseInt(process.env.AI_HORDE_POLL_INTERVAL) || 5000,
    maxPollAttempts: parseInt(process.env.AI_HORDE_MAX_POLL_ATTEMPTS) || 120, // 10 min max
    timeout: parseInt(process.env.AI_HORDE_TIMEOUT) || 60000,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000,
      successThreshold: 2
    }
  }
};

/**
 * Text Provider Configuration
 */
const textProviderConfig = {
  // Primary provider to use
  primary: process.env.TEXT_PROVIDER_PRIMARY || 'groq',

  // Fallback providers (comma-separated list)
  fallbacks: (process.env.TEXT_PROVIDER_FALLBACKS || '')
    .split(',')
    .map(p => p.trim())
    .filter(p => p),

  // Groq-specific config
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultTemperature: 0.8,
    defaultMaxTokens: 4000,
    timeout: parseInt(process.env.GROQ_TIMEOUT) || 45000,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
      successThreshold: 2
    }
  }
};

/**
 * Get configuration for a specific image provider
 * @param {string} providerName - Provider name
 * @returns {Object|null} Provider configuration or null if not found
 */
function getImageProviderConfig(providerName) {
  if (!imageProviderConfig[providerName]) {
    logger.warn(`Unknown image provider: ${providerName}`);
    return null;
  }
  return imageProviderConfig[providerName];
}

/**
 * Get configuration for a specific text provider
 * @param {string} providerName - Provider name
 * @returns {Object|null} Provider configuration or null if not found
 */
function getTextProviderConfig(providerName) {
  if (!textProviderConfig[providerName]) {
    logger.warn(`Unknown text provider: ${providerName}`);
    return null;
  }
  return textProviderConfig[providerName];
}

/**
 * Get list of available image providers
 * @returns {string[]}
 */
function getAvailableImageProviders() {
  return Object.keys(imageProviderConfig).filter(
    key => typeof imageProviderConfig[key] === 'object' && imageProviderConfig[key] !== null
  );
}

/**
 * Get list of available text providers
 * @returns {string[]}
 */
function getAvailableTextProviders() {
  return Object.keys(textProviderConfig).filter(
    key => typeof textProviderConfig[key] === 'object' && textProviderConfig[key] !== null
  );
}

/**
 * Validate provider configuration
 * Logs warnings for missing required configuration
 */
function validateProviderConfig() {
  const warnings = [];

  // Check image providers
  const primaryImage = imageProviderConfig.primary;
  if (!getAvailableImageProviders().includes(primaryImage)) {
    warnings.push(`Primary image provider '${primaryImage}' is not available`);
  }

  // Check if AI Horde has API key when configured
  if (primaryImage === 'aihorde' || imageProviderConfig.fallbacks.includes('aihorde')) {
    if (!imageProviderConfig.aihorde.apiKey) {
      warnings.push('AI_HORDE_API_KEY is not set - AI Horde provider will not work');
    }
  }

  // Check text providers
  const primaryText = textProviderConfig.primary;
  if (!getAvailableTextProviders().includes(primaryText)) {
    warnings.push(`Primary text provider '${primaryText}' is not available`);
  }

  // Check if Groq has API key
  if (primaryText === 'groq' && !textProviderConfig.groq.apiKey) {
    warnings.push('GROQ_API_KEY is not set - Groq provider will not work');
  }

  // Log warnings
  warnings.forEach(warning => logger.warn(warning));

  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * Get effective fallback chain for image providers
 * @returns {string[]} Array of provider names in order
 */
function getImageFallbackChain() {
  return [
    imageProviderConfig.primary,
    ...imageProviderConfig.fallbacks
  ].filter((provider, index, self) => self.indexOf(provider) === index); // Remove duplicates
}

/**
 * Get effective fallback chain for text providers
 * @returns {string[]} Array of provider names in order
 */
function getTextFallbackChain() {
  return [
    textProviderConfig.primary,
    ...textProviderConfig.fallbacks
  ].filter((provider, index, self) => self.indexOf(provider) === index); // Remove duplicates
}

module.exports = {
  imageProviderConfig,
  textProviderConfig,
  getImageProviderConfig,
  getTextProviderConfig,
  getAvailableImageProviders,
  getAvailableTextProviders,
  validateProviderConfig,
  getImageFallbackChain,
  getTextFallbackChain
};
