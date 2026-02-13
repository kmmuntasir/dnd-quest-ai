/**
 * Text Provider Abstract Class
 * Base class for all text generation providers
 */

const BaseProvider = require('./BaseProvider');

/**
 * Abstract base class for text generation providers
 * Extends BaseProvider with text-specific functionality
 */
class TextProvider extends BaseProvider {
  /**
   * @param {Object} config - Provider configuration
   * @param {string} config.defaultModel - Default model to use
   * @param {number} config.defaultTemperature - Default temperature for generation
   * @param {number} config.defaultMaxTokens - Default max tokens
   */
  constructor(config = {}) {
    super({
      ...config,
      type: 'text'
    });

    if (this.constructor === TextProvider) {
      throw new Error('TextProvider is an abstract class and cannot be instantiated directly');
    }

    this.defaultModel = config.defaultModel || 'default';
    this.defaultTemperature = config.defaultTemperature || 0.8;
    this.defaultMaxTokens = config.defaultMaxTokens || 4000;
  }

  /**
   * Parse JSON response with error handling
   * @param {string} content - JSON string to parse
   * @returns {Object|null} Parsed object or null
   */
  safeJsonParse(content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      const { logger } = require('../../utils/logger');
      logger.error('JSON parse error', {
        error: error.message,
        content: content.substring(0, 200)
      });
      return null;
    }
  }

  /**
   * Generate adventure
   * Must be implemented by subclasses
   * @param {Object} params - Adventure generation parameters
   * @returns {Promise<Object>}
   */
  async generateAdventure(params) {
    throw new Error('generateAdventure must be implemented by subclass');
  }

  /**
   * Generate scene response
   * Must be implemented by subclasses
   * @param {Object} params - Scene response parameters
   * @returns {Promise<Object>}
   */
  async generateSceneResponse(params) {
    throw new Error('generateSceneResponse must be implemented by subclass');
  }

  /**
   * Generate context suggestion
   * Must be implemented by subclasses
   * @param {Object} params - Context generation parameters
   * @returns {Promise<string>}
   */
  async generateContext(params) {
    throw new Error('generateContext must be implemented by subclass');
  }

  /**
   * Generate character name
   * Must be implemented by subclasses
   * @param {Object} params - Name generation parameters
   * @returns {Promise<string>}
   */
  async generateCharacterName(params) {
    throw new Error('generateCharacterName must be implemented by subclass');
  }
}

module.exports = TextProvider;
