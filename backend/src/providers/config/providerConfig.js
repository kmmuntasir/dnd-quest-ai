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
  // Primary provider to use (aihorde-sdxl for quality, aihorde for speed)
  primary: process.env.IMAGE_PROVIDER_PRIMARY || 'aihorde-sdxl',

  // Fallback providers (comma-separated list)
  // Falls back to fast aihorde if SDXL fails, then pollinations
  fallbacks: (process.env.IMAGE_PROVIDER_FALLBACKS || 'aihorde,pollinations')
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

  // AI Horde-specific config (optimized for speed)
  aihorde: {
    apiKey: process.env.AI_HORDE_API_KEY || null,
    apiUrl: 'https://aihorde.net/api/v2',
    model: process.env.AI_HORDE_MODEL || 'stable_diffusion', // Faster than XL models
    steps: parseInt(process.env.AI_HORDE_STEPS) || 20, // Fewer steps = faster
    sampler: process.env.AI_HORDE_SAMPLER || 'k_euler_a', // Fast sampler
    width: parseInt(process.env.AI_HORDE_WIDTH) || 512, // Smaller = faster
    height: parseInt(process.env.AI_HORDE_HEIGHT) || 512, // Smaller = faster
    cfgScale: parseFloat(process.env.AI_HORDE_CFG_SCALE) || 7,
    // Polling configuration for async generation
    pollInterval: parseInt(process.env.AI_HORDE_POLL_INTERVAL) || 3000, // Check every 3s
    maxPollAttempts: parseInt(process.env.AI_HORDE_MAX_POLL_ATTEMPTS) || 180, // 9 min max (3s * 180)
    timeout: parseInt(process.env.AI_HORDE_TIMEOUT) || 120000, // 2 minute overall timeout
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000,
      successThreshold: 2
    }
  },

  // AI Horde SDXL-specific config (optimized for quality)
  // Higher quality but slower (~60-90 seconds per image)
  'aihorde-sdxl': {
    apiKey: process.env.AI_HORDE_API_KEY || null, // Uses same API key
    apiUrl: 'https://aihorde.net/api/v2',
    model: process.env.AI_HORDE_SDXL_MODEL || 'AlbedoBase XL (SDXL)', // Best SDXL model on Horde
    steps: parseInt(process.env.AI_HORDE_SDXL_STEPS) || 30, // 30 is sweet spot for SDXL
    sampler: process.env.AI_HORDE_SDXL_SAMPLER || 'k_dpmpp_2m', // Best sampler for SDXL
    width: parseInt(process.env.AI_HORDE_SDXL_WIDTH) || 1024, // SDXL native resolution
    height: parseInt(process.env.AI_HORDE_SDXL_HEIGHT) || 1024, // SDXL native resolution
    cfgScale: parseFloat(process.env.AI_HORDE_SDXL_CFG_SCALE) || 7,
    karras: process.env.AI_HORDE_SDXL_KARRAS !== 'false', // Default true, improves details
    // Longer polling for SDXL (slower generation)
    pollInterval: parseInt(process.env.AI_HORDE_SDXL_POLL_INTERVAL) || 5000, // Check every 5s
    maxPollAttempts: parseInt(process.env.AI_HORDE_SDXL_MAX_POLL_ATTEMPTS) || 180, // 15 min max (5s * 180)
    timeout: parseInt(process.env.AI_HORDE_SDXL_TIMEOUT) || 180000, // 3 minute overall timeout
    circuitBreaker: {
      failureThreshold: 3, // Lower threshold since SDXL is less reliable
      resetTimeout: 120000, // 2 minutes
      successThreshold: 1
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
  // Only return actual provider config keys, not metadata like 'primary' or 'fallbacks'
  const providerKeys = ['pollinations', 'aihorde', 'aihorde-sdxl'];
  return providerKeys.filter(key => {
    const config = imageProviderConfig[key];
    return config && typeof config === 'object' && !Array.isArray(config);
  });
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

  // Check if AI Horde SDXL has API key when configured
  if (primaryImage === 'aihorde-sdxl' || imageProviderConfig.fallbacks.includes('aihorde-sdxl')) {
    if (!imageProviderConfig['aihorde-sdxl'].apiKey) {
      warnings.push('AI_HORDE_API_KEY is not set - AI Horde SDXL provider will not work');
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
