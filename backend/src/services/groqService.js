/**
 * Groq Service Facade
 * Delegates to the provider system while maintaining backward compatibility
 */

const { logger } = require('../utils/logger');
const {
  getTextProvider,
  executeTextWithFallback,
  textProviderConfig
} = require('../providers');

/**
 * Generate adventure using text provider
 * @param {Object} params - Adventure generation parameters
 * @param {string} params.theme - Setting theme (fantasy, horror, sci-fi)
 * @param {string} params.tone - Story tone (serious, humorous, dark)
 * @param {string} params.difficulty - Game difficulty (easy, medium, hard)
 * @param {string} params.length - Adventure length (quick, standard, extended, ai)
 * @param {string} params.context - Additional context (optional)
 * @returns {Promise<Object>} Generated adventure data
 */
async function generateAdventure({ theme, tone, difficulty, length = 'standard', context }) {
  try {
    const provider = getTextProvider(textProviderConfig.primary);
    if (provider) {
      return await provider.generateAdventure({ theme, tone, difficulty, length, context });
    }

    // Fallback to direct execution with fallback chain
    return await executeTextWithFallback('generateAdventure', [{ theme, tone, difficulty, length, context }]);
  } catch (error) {
    logger.error('Failed to generate adventure in facade', { error: error.message });
    throw new Error('Failed to generate adventure: ' + error.message);
  }
}

/**
 * Generate scene response based on player choice
 * @param {Object} params - Scene generation parameters
 * @param {string} params.playerChoice - Player's chosen action
 * @param {number} params.diceRoll - d20 roll result
 * @param {Object} params.stats - Character stats
 * @param {string} params.sceneContext - Current scene context
 * @returns {Promise<Object>} Generated scene response
 */
async function generateSceneResponse({ playerChoice, diceRoll, stats, sceneContext }) {
  try {
    const provider = getTextProvider(textProviderConfig.primary);
    if (provider) {
      return await provider.generateSceneResponse({ playerChoice, diceRoll, stats, sceneContext });
    }

    return await executeTextWithFallback('generateSceneResponse', [{ playerChoice, diceRoll, stats, sceneContext }]);
  } catch (error) {
    logger.error('Failed to generate scene response in facade', { error: error.message });
    throw new Error('Failed to generate scene response: ' + error.message);
  }
}

/**
 * Generate story context suggestion
 * @param {Object} params - Context generation parameters
 * @param {string} params.theme - Setting theme
 * @param {string} params.tone - Story tone
 * @param {string} params.difficulty - Game difficulty
 * @returns {Promise<string>} Generated context suggestion
 */
async function generateContext({ theme, tone, difficulty }) {
  try {
    const provider = getTextProvider(textProviderConfig.primary);
    if (provider) {
      return await provider.generateContext({ theme, tone, difficulty });
    }

    return await executeTextWithFallback('generateContext', [{ theme, tone, difficulty }]);
  } catch (error) {
    logger.error('Failed to generate context in facade', { error: error.message });
    throw new Error('Failed to generate context: ' + error.message);
  }
}

/**
 * Generate character name based on class
 * @param {Object} params - Name generation parameters
 * @param {string} params.characterClass - Character class
 * @returns {Promise<string>} Generated character name
 */
async function generateCharacterName({ characterClass }) {
  try {
    const provider = getTextProvider(textProviderConfig.primary);
    if (provider) {
      return await provider.generateCharacterName({ characterClass });
    }

    return await executeTextWithFallback('generateCharacterName', [{ characterClass }]);
  } catch (error) {
    logger.error('Failed to generate character name in facade', { error: error.message });
    throw new Error('Failed to generate name: ' + error.message);
  }
}

/**
 * Test Groq API connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    const provider = getTextProvider(textProviderConfig.primary);
    if (provider) {
      return await provider.testConnection();
    }
    return false;
  } catch (error) {
    logger.error('Groq provider connection test failed', { error: error.message });
    return false;
  }
}

module.exports = {
  generateAdventure,
  generateSceneResponse,
  generateContext,
  generateCharacterName,
  testConnection
};
