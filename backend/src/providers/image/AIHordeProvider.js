/**
 * AI Horde Image Provider
 * Generates images using AI Horde (https://aihorde.net)
 *
 * AI Horde uses an async generation flow:
 * 1. POST to /generate/async to submit request
 * 2. Poll /generate/check/{id} until done
 * 3. Get image URL from the check response
 * 4. Fetch and cache the image
 */

const axios = require('axios');
const ImageProvider = require('../base/ImageProvider');
const { logger } = require('../../utils/logger');
const { sleep } = require('../../utils/circuitBreaker');

/**
 * AI Horde Image Provider
 * Implements image generation using the AI Horde API
 */
class AIHordeProvider extends ImageProvider {
  /**
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    super({
      name: 'aihorde',
      defaultWidth: config.width || 1024,
      defaultHeight: config.height || 1024,
      defaultStyle: 'fantasy art',
      timeout: config.timeout || 60000,
      circuitBreaker: config.circuitBreaker
    });

    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://aihorde.net/api/v2';
    this.model = config.model || 'AlbedoBase XL';
    this.steps = config.steps || 25;
    this.sampler = config.sampler || 'k_euler';
    this.cfgScale = config.cfgScale || 7;
    this.pollInterval = config.pollInterval || 5000;
    this.maxPollAttempts = config.maxPollAttempts || 120; // 10 minutes max
  }

  /**
   * Get common headers for API requests
   * @returns {Object}
   */
  getHeaders() {
    return {
      'apikey': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Submit async image generation request
   * @param {string} prompt - Image prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Request ID
   */
  async submitGenerationRequest(prompt, options = {}) {
    const { width = this.defaultWidth, height = this.defaultHeight } = options;

    const payload = {
      prompt,
      params: {
        sampler_name: this.sampler,
        cfg_scale: this.cfgScale,
        width,
        height,
        steps: this.steps,
        karras: true,
        post_processing: ['GFPGAN'] // Optional face restoration
      },
      models: [this.model],
      r2: true // Use R2 for faster image delivery
    };

    const response = await axios.post(
      `${this.apiUrl}/generate/async`,
      payload,
      {
        headers: this.getHeaders(),
        timeout: 30000
      }
    );

    if (!response.data.id) {
      throw new Error('No request ID returned from AI Horde');
    }

    logger.info('AI Horde generation request submitted', {
      requestId: response.data.id,
      model: this.model
    });

    return response.data.id;
  }

  /**
   * Check generation status
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Status response
   */
  async checkGenerationStatus(requestId) {
    const response = await axios.get(
      `${this.apiUrl}/generate/check/${requestId}`,
      {
        headers: this.getHeaders(),
        timeout: 10000
      }
    );

    return response.data;
  }

  /**
   * Wait for generation to complete
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Generation result with image URL
   */
  async waitForGeneration(requestId) {
    let attempts = 0;

    while (attempts < this.maxPollAttempts) {
      const status = await this.checkGenerationStatus(requestId);

      if (status.done) {
        logger.info('AI Horde generation complete', {
          requestId,
          generations: status.generations?.length || 0
        });

        if (status.generations && status.generations.length > 0) {
          return status.generations[0];
        }

        throw new Error('Generation complete but no images returned');
      }

      if (status.faulted) {
        throw new Error(`AI Horde generation failed: ${status.message || 'Unknown error'}`);
      }

      if (status.processing > 0 || status.waiting > 0) {
        const queuePosition = status.queue_position || 'unknown';
        const waitTime = status.wait_time || 'unknown';
        logger.debug('AI Horde generation in progress', {
          requestId,
          queuePosition,
          waitTime,
          processing: status.processing,
          waiting: status.waiting,
          attempt: attempts + 1
        });
      }

      await sleep(this.pollInterval);
      attempts++;
    }

    throw new Error('AI Horde generation timed out');
  }

  /**
   * Generate image and return hash (lazy loading - doesn't fetch the image)
   * Note: For AI Horde, this still generates the image but doesn't download it
   * @param {string} prompt - Image generation prompt
   * @param {Object} options - Additional options
   * @param {string} options.style - Image style (default: 'fantasy art')
   * @param {number} options.width - Image width (default: 1024)
   * @param {number} options.height - Image height (default: 1024)
   * @returns {Promise<{hash: string, url: string}>}
   */
  async generateImage(prompt, options = {}) {
    const { style = this.defaultStyle, width = this.defaultWidth, height = this.defaultHeight } = options;

    // Enhance prompt with style keywords
    const enhancedPrompt = this.enhancePrompt(prompt, style);

    try {
      // Generate unique hash for this image
      const hash = this.generateHash();

      // Use executeWithProtection for circuit breaker support
      const result = await this.executeWithProtection(async () => {
        // Submit generation request
        const requestId = await this.submitGenerationRequest(enhancedPrompt, { width, height });

        // Wait for completion
        const generation = await this.waitForGeneration(requestId);

        return {
          hash,
          imageUrl: generation.img,
          seed: generation.seed
        };
      });

      // Store metadata in database
      await this.storeImageMetadata({
        hash: result.hash,
        prompt: enhancedPrompt,
        providerUrl: result.imageUrl,
        width,
        height
      });

      return {
        hash: result.hash,
        url: `/api/images/${result.hash}`,
        providerUrl: result.imageUrl
      };
    } catch (error) {
      logger.error('AI Horde image generation error', {
        error: error.message,
        prompt: enhancedPrompt.substring(0, 100)
      });

      // Return a fallback hash
      const fallbackHash = 'fallback-' + this.generateHash();
      return {
        hash: fallbackHash,
        url: `/api/images/${fallbackHash}`
      };
    }
  }

  /**
   * Generate image AND fetch it immediately (for eager loading/queue)
   * This is the preferred method for the queue system
   * @param {string} prompt - Image generation prompt
   * @param {Object} options - Additional options
   * @returns {Promise<{hash: string, url: string, file_path: string}>}
   */
  async generateAndFetch(prompt, options = {}) {
    const { style = this.defaultStyle, width = this.defaultWidth, height = this.defaultHeight } = options;

    // Enhance prompt with style keywords
    const enhancedPrompt = this.enhancePrompt(prompt, style);

    return this.executeWithProtection(async () => {
      // Generate unique hash for this image
      const hash = this.generateHash();

      // Store metadata with processing status first
      const db = require('../../config/database');
      await db.run(`
        INSERT INTO images (hash, prompt, pollinations_url, width, height, status, provider)
        VALUES (?, ?, '', ?, ?, 'processing', 'aihorde')
      `, [hash, enhancedPrompt, width, height]);

      logger.info('Generating and fetching image', { hash, provider: 'aihorde' });

      // Submit generation request
      const requestId = await this.submitGenerationRequest(enhancedPrompt, { width, height });

      // Wait for completion
      const generation = await this.waitForGeneration(requestId);
      const imageUrl = generation.img;

      // Update with actual URL
      await db.run(`
        UPDATE images SET pollinations_url = ? WHERE hash = ?
      `, [imageUrl, hash]);

      // Download the image immediately
      logger.info('Downloading image from AI Horde', { hash });
      const response = await axios.get(imageUrl, {
        timeout: this.timeout,
        responseType: 'arraybuffer'
      });

      if (response.status !== 200 || response.data.byteLength === 0) {
        throw new Error(`Failed to download image: status ${response.status}`);
      }

      // Save to cache
      const file_path = this.saveToCache(hash, response.data);

      // Update status to ready
      await db.run(`
        UPDATE images SET status = 'ready', cached_path = ? WHERE hash = ?
      `, [file_path, hash]);

      return {
        hash,
        url: `/api/images/${hash}`,
        file_path,
        provider: 'aihorde'
      };
    });
  }

  /**
   * Fetch and cache an image
   * @param {string} hash - Image hash
   * @returns {Promise<string|null>} Path to cached file or null on error
   */
  async fetchImage(hash) {
    // Check if it's a fallback hash
    if (this.isFallbackHash(hash)) {
      return null;
    }

    const metadata = await this.getImageMetadata(hash);

    if (!metadata) {
      logger.warn('No metadata found for hash', { hash });
      return null;
    }

    // If already cached, return the path
    const existingCache = this.getCachedPath(hash);
    if (existingCache) {
      return existingCache;
    }

    // Fetch from stored URL
    if (!metadata.pollinations_url) {
      logger.warn('No provider URL stored for hash', { hash });
      return null;
    }

    return this.executeWithProtection(async () => {
      logger.info('Fetching image from AI Horde', { hash });

      const response = await axios.get(metadata.pollinations_url, {
        timeout: this.timeout,
        responseType: 'arraybuffer'
      });

      if (response.status === 200 && response.data.byteLength > 0) {
        const cachedPath = this.saveToCache(hash, response.data);

        // Update database with cached path
        await this.updateCachedPath(hash, cachedPath);

        return cachedPath;
      }

      throw new Error(`Invalid response: status ${response.status}`);
    });
  }

  /**
   * Test AI Horde API connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      // Check if API key is valid by checking user stats
      const response = await axios.get(
        `${this.apiUrl}/find_user`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );

      if (response.status === 200 && response.data.id) {
        logger.info('AI Horde connection successful', {
          userId: response.data.id,
          username: response.data.username
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('AI Horde connection test failed', {
        error: error.message,
        status: error.response?.status
      });
      return false;
    }
  }

  /**
   * Get available models from AI Horde
   * @returns {Promise<Array>} List of available models
   */
  async getAvailableModels() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/models`,
        { timeout: 10000 }
      );

      return response.data
        .filter(model => model.type === 'image')
        .map(model => ({
          name: model.name,
          count: model.count,
          performance: model.performance
        }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      logger.error('Failed to get AI Horde models', { error: error.message });
      return [];
    }
  }

  /**
   * Get user info (kudos balance, etc.)
   * @returns {Promise<Object|null>}
   */
  async getUserInfo() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/find_user`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );

      return {
        id: response.data.id,
        username: response.data.username,
        kudos: response.data.kudos,
        trusted: response.data.trusted
      };
    } catch (error) {
      logger.error('Failed to get AI Horde user info', { error: error.message });
      return null;
    }
  }
}

module.exports = AIHordeProvider;
