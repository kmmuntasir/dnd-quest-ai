/**
 * Provider Factory and Exports
 * Creates and manages provider instances with fallback support
 */

const { logger } = require('../utils/logger');
const {
  imageProviderConfig,
  textProviderConfig,
  getImageProviderConfig,
  getTextProviderConfig,
  getAvailableImageProviders,
  getAvailableTextProviders,
  validateProviderConfig,
  getImageFallbackChain,
  getTextFallbackChain
} = require('./config/providerConfig');

// Provider class imports (lazy loaded)
let PollinationsProvider = null;
let AIHordeProvider = null;
let GroqProvider = null;

// Provider instance cache
const imageProviderInstances = new Map();
const textProviderInstances = new Map();

/**
 * Lazy load provider classes to avoid circular dependencies
 */
function loadProviderClasses() {
  if (!PollinationsProvider) {
    PollinationsProvider = require('./image/PollinationsProvider');
  }
  if (!AIHordeProvider) {
    AIHordeProvider = require('./image/AIHordeProvider');
  }
  if (!GroqProvider) {
    GroqProvider = require('./text/GroqProvider');
  }
}

/**
 * Image Provider Factory
 * Creates or retrieves a cached image provider instance
 * @param {string} name - Provider name ('pollinations', 'aihorde')
 * @returns {ImageProvider|null} Provider instance or null if not available
 */
function getImageProvider(name) {
  loadProviderClasses();

  // Check cache first
  if (imageProviderInstances.has(name)) {
    return imageProviderInstances.get(name);
  }

  const config = getImageProviderConfig(name);
  if (!config) {
    logger.warn(`Image provider '${name}' not found in configuration`);
    return null;
  }

  let provider = null;

  switch (name) {
    case 'pollinations':
      provider = new PollinationsProvider(config);
      break;
    case 'aihorde':
      if (!config.apiKey) {
        logger.warn('AI Horde API key not configured, provider unavailable');
        return null;
      }
      provider = new AIHordeProvider(config);
      break;
    default:
      logger.warn(`Unknown image provider: ${name}`);
      return null;
  }

  // Cache the instance
  imageProviderInstances.set(name, provider);
  logger.info(`Created image provider: ${name}`);

  return provider;
}

/**
 * Text Provider Factory
 * Creates or retrieves a cached text provider instance
 * @param {string} name - Provider name ('groq')
 * @returns {TextProvider|null} Provider instance or null if not available
 */
function getTextProvider(name) {
  loadProviderClasses();

  // Check cache first
  if (textProviderInstances.has(name)) {
    return textProviderInstances.get(name);
  }

  const config = getTextProviderConfig(name);
  if (!config) {
    logger.warn(`Text provider '${name}' not found in configuration`);
    return null;
  }

  let provider = null;

  switch (name) {
    case 'groq':
      if (!config.apiKey) {
        logger.warn('Groq API key not configured, provider unavailable');
        return null;
      }
      provider = new GroqProvider(config);
      break;
    default:
      logger.warn(`Unknown text provider: ${name}`);
      return null;
  }

  // Cache the instance
  textProviderInstances.set(name, provider);
  logger.info(`Created text provider: ${name}`);

  return provider;
}

/**
 * Execute an operation with fallback chain
 * Tries providers in order until one succeeds or all fail
 * @param {string} type - Provider type ('image' or 'text')
 * @param {string} method - Method name to call
 * @param {Array} args - Arguments to pass to the method
 * @param {string[]} fallbackChain - Ordered list of provider names to try
 * @returns {Promise<any>} Result from first successful provider
 */
async function executeWithFallback(type, method, args, fallbackChain) {
  const errors = [];

  for (const providerName of fallbackChain) {
    const provider = type === 'image'
      ? getImageProvider(providerName)
      : getTextProvider(providerName);

    if (!provider) {
      logger.debug(`Provider ${providerName} not available, skipping`);
      continue;
    }

    // Check if provider can accept requests
    if (!provider.canRequest()) {
      logger.debug(`Provider ${providerName} circuit breaker open, skipping`);
      continue;
    }

    try {
      logger.debug(`Trying ${type} provider: ${providerName}`);
      const result = await provider[method](...args);
      logger.info(`Successfully used ${type} provider: ${providerName}`);
      return result;
    } catch (error) {
      errors.push({ provider: providerName, error: error.message });
      logger.warn(`Provider ${providerName} failed for ${method}`, {
        error: error.message
      });

      // Continue to next provider
    }
  }

  // All providers failed
  const errorSummary = errors.map(e => `${e.provider}: ${e.error}`).join('; ');
  throw new Error(`All ${type} providers failed. Errors: ${errorSummary}`);
}

/**
 * Execute image generation with fallback
 * @param {string} method - Method to call
 * @param {Array} args - Method arguments
 * @returns {Promise<any>}
 */
async function executeImageWithFallback(method, args) {
  return executeWithFallback('image', method, args, getImageFallbackChain());
}

/**
 * Execute text generation with fallback
 * @param {string} method - Method to call
 * @param {Array} args - Method arguments
 * @returns {Promise<any>}
 */
async function executeTextWithFallback(method, args) {
  return executeWithFallback('text', method, args, getTextFallbackChain());
}

/**
 * Get health status of all providers
 * @returns {Promise<Object>} Health status object
 */
async function getProvidersHealth() {
  const health = {
    image: {},
    text: {},
    timestamp: new Date().toISOString()
  };

  // Get image provider health
  for (const name of getAvailableImageProviders()) {
    const provider = getImageProvider(name);
    if (provider) {
      health.image[name] = provider.getHealth();
    }
  }

  // Get text provider health
  for (const name of getAvailableTextProviders()) {
    const provider = getTextProvider(name);
    if (provider) {
      health.text[name] = provider.getHealth();
    }
  }

  return health;
}

/**
 * Reset all provider circuit breakers
 */
function resetAllProviders() {
  for (const [name, provider] of imageProviderInstances) {
    provider.reset();
    logger.info(`Reset image provider: ${name}`);
  }

  for (const [name, provider] of textProviderInstances) {
    provider.reset();
    logger.info(`Reset text provider: ${name}`);
  }
}

/**
 * Initialize providers (validate configuration)
 */
function initializeProviders() {
  loadProviderClasses();

  const { valid, warnings } = validateProviderConfig();

  if (!valid) {
    logger.warn('Provider configuration has issues:', { warnings });
  }

  // Pre-create primary providers
  const primaryImage = getImageProvider(imageProviderConfig.primary);
  if (primaryImage) {
    logger.info(`Primary image provider initialized: ${imageProviderConfig.primary}`);
  }

  const primaryText = getTextProvider(textProviderConfig.primary);
  if (primaryText) {
    logger.info(`Primary text provider initialized: ${textProviderConfig.primary}`);
  }

  logger.info('Provider system initialized', {
    imageProviders: getAvailableImageProviders(),
    textProviders: getAvailableTextProviders(),
    imageFallbackChain: getImageFallbackChain(),
    textFallbackChain: getTextFallbackChain()
  });
}

// Export factory functions and utilities
module.exports = {
  // Factory functions
  getImageProvider,
  getTextProvider,

  // Fallback execution
  executeWithFallback,
  executeImageWithFallback,
  executeTextWithFallback,

  // Health and management
  getProvidersHealth,
  resetAllProviders,
  initializeProviders,

  // Configuration exports
  imageProviderConfig,
  textProviderConfig,
  getImageProviderConfig,
  getTextProviderConfig,
  getAvailableImageProviders,
  getAvailableTextProviders,
  getImageFallbackChain,
  getTextFallbackChain
};
