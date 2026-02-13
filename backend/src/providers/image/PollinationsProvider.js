/**
 * Pollinations.ai Image Provider
 * Generates images using Pollinations.ai API
 */

const axios = require('axios');
const ImageProvider = require('../base/ImageProvider');
const { logger } = require('../../utils/logger');

/**
 * Pollinations.ai Image Provider
 * Implements image generation using the Pollinations.ai API
 */
class PollinationsProvider extends ImageProvider {
  /**
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    super({
      name: 'pollinations',
      defaultWidth: config.defaultWidth || 1024,
      defaultHeight: config.defaultHeight || 1024,
      defaultStyle: 'fantasy art',
      timeout: config.timeout || 30000,
      circuitBreaker: config.circuitBreaker
    });

    this.apiKey = config.apiKey || null;
    this.defaultModel = config.defaultModel || 'flux';
    this.enhance = config.enhance !== false;
    this.appReferrer = config.appReferrer || 'dungeons-and-dragons-rpg';
  }

  /**
   * Build Pollinations.ai URL from parameters
   * @param {string} prompt - Image prompt
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} seed - Random seed
   * @returns {string} Pollinations.ai URL
   */
  buildPollinationsUrl(prompt, width, height, seed) {
    const encodedPrompt = encodeURIComponent(prompt);

    const params = new URLSearchParams({
      width: width.toString(),
      height: height.toString(),
      seed: seed.toString(),
      enhance: this.enhance.toString(),
      model: this.defaultModel,
      referrer: this.appReferrer
    });

    if (this.apiKey) {
      params.append('nologo', 'true');
    }

    return `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;
  }

  /**
   * Generate image and return hash (lazy loading - doesn't fetch the image)
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

      // Generate seed based on hash for reproducibility
      const seed = parseInt(hash.substring(0, 8), 16) % 1000000;

      // Build Pollinations URL
      const pollinationsUrl = this.buildPollinationsUrl(enhancedPrompt, width, height, seed);

      // Store metadata in database with pending status
      await this._storeImageMetadataWithStatus({
        hash,
        prompt: enhancedPrompt,
        providerUrl: pollinationsUrl,
        width,
        height,
        status: 'pending',
        provider: 'pollinations'
      });

      // Return hash - the /api/images/:hash endpoint will handle serving
      return {
        hash,
        url: `/api/images/${hash}`,
        providerUrl: pollinationsUrl
      };
    } catch (error) {
      logger.error('Pollinations image generation error', { error: error.message });
      // Return a fallback hash (will show placeholder)
      const fallbackHash = 'fallback-' + this.generateHash();
      return {
        hash: fallbackHash,
        url: `/api/images/${fallbackHash}`
      };
    }
  }

  /**
   * Generate image AND fetch it immediately (for eager loading/queue)
   * @param {string} prompt - Image generation prompt
   * @param {Object} options - Additional options
   * @param {string} options.existingHash - Use existing hash instead of generating new one
   * @returns {Promise<{hash: string, url: string, file_path: string}>}
   */
  async generateAndFetch(prompt, options = {}) {
    const { style = this.defaultStyle, width = this.defaultWidth, height = this.defaultHeight, existingHash } = options;

    // Enhance prompt with style keywords
    const enhancedPrompt = this.enhancePrompt(prompt, style);

    return this.executeWithProtection(async () => {
      // Use existing hash if provided (for queue), otherwise generate new one
      const hash = existingHash || this.generateHash();

      // Generate seed based on hash for reproducibility
      const seed = parseInt(hash.substring(0, 8), 16) % 1000000;

      // Build Pollinations URL
      const pollinationsUrl = this.buildPollinationsUrl(enhancedPrompt, width, height, seed);

      const db = require('../../config/database');

      // Check if image record exists (for queue jobs)
      const existingImage = await db.get('SELECT hash FROM images WHERE hash = ?', [hash]);

      if (existingImage) {
        // Update existing record
        await db.run(`
          UPDATE images
          SET pollinations_url = ?, status = 'processing', provider = 'pollinations'
          WHERE hash = ?
        `, [pollinationsUrl, hash]);
      } else {
        // Create new record
        await db.run(`
          INSERT INTO images (hash, prompt, pollinations_url, width, height, status, provider)
          VALUES (?, ?, ?, ?, ?, 'processing', 'pollinations')
        `, [hash, enhancedPrompt, pollinationsUrl, width, height]);
      }

      logger.info('Generating and fetching image', { hash, provider: 'pollinations' });

      // Fetch the image immediately
      const file_path = await this._fetchFromUrl(pollinationsUrl, hash);

      // Update status to ready
      await db.run(`
        UPDATE images SET status = 'ready', cached_path = ? WHERE hash = ?
      `, [file_path, hash]);

      return {
        hash,
        url: `/api/images/${hash}`,
        file_path,
        provider: 'pollinations'
      };
    });
  }

  /**
   * Store image metadata with status (for queue system)
   * @private
   */
  async _storeImageMetadataWithStatus({ hash, prompt, providerUrl, width, height, status, provider }) {
    const db = require('../../config/database');
    try {
      await db.run(`
        INSERT INTO images (hash, prompt, pollinations_url, width, height, status, provider)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [hash, prompt, providerUrl, width, height, status, provider]);
    } catch (error) {
      logger.error('Failed to store image metadata', { hash, error: error.message });
      throw error;
    }
  }

  /**
   * Fetch and cache an image from Pollinations.ai
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

    return this.executeWithProtection(async () => {
      return this._fetchFromUrl(metadata.pollinations_url, hash);
    });
  }

  /**
   * Fetch image from URL and save to cache
   * @param {string} url - Image URL
   * @param {string} hash - Image hash
   * @returns {Promise<string>} Path to cached file
   */
  async _fetchFromUrl(url, hash) {
    const headers = {};
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    logger.info('Fetching image from Pollinations.ai', { hash });

    const response = await axios.get(url, {
      timeout: this.timeout,
      headers,
      responseType: 'arraybuffer'
    });

    if (response.status === 200 && response.data.byteLength > 0) {
      const cachedPath = this.saveToCache(hash, response.data);

      // Update database with cached path
      await this.updateCachedPath(hash, cachedPath);

      return cachedPath;
    }

    throw new Error(`Invalid response: status ${response.status}`);
  }

  /**
   * Test Pollinations.ai API connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const params = new URLSearchParams({
        width: '512',
        height: '512',
        seed: Date.now().toString(),
        referrer: this.appReferrer
      });

      if (this.apiKey) {
        params.append('nologo', 'true');
      }

      const testUrl = `https://image.pollinations.ai/prompt/fantasy%20landscape?${params.toString()}`;

      const headers = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await axios.get(testUrl, {
        timeout: 60000,
        headers,
        responseType: 'arraybuffer'
      });

      // Check for valid response with actual image data
      const isValid = response.status === 200 && response.data.byteLength > 1000;

      if (!isValid) {
        logger.warn('Pollinations test returned empty or small response', {
          status: response.status,
          size: response.data.byteLength
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Pollinations.ai connection test failed', {
        error: error.message,
        status: error.response?.status
      });
      return false;
    }
  }

  /**
   * Regenerate an image with a new seed
   * @param {string} oldHash - Old image hash
   * @returns {Promise<Object>} Result with success status and new hash
   */
  async regenerateImage(oldHash) {
    const metadata = await this.getImageMetadata(oldHash);

    if (!metadata) {
      return { success: false, error: 'Image not found' };
    }

    // Check circuit breaker
    if (!this.canRequest()) {
      return {
        success: false,
        error: 'Service temporarily unavailable (circuit breaker open)'
      };
    }

    try {
      // Generate a new hash for the new image
      const newHash = this.generateHash();

      // Generate a new seed using timestamp for randomness
      const newSeed = Date.now() % 1000000;

      // Build new Pollinations URL with new seed
      const newUrl = this.buildPollinationsUrl(
        metadata.prompt,
        metadata.width,
        metadata.height,
        newSeed
      );

      logger.info('Regenerating image', { oldHash, newHash });

      // Fetch new image
      const cachedPath = await this._fetchFromUrl(newUrl, newHash);

      // Store new image metadata in database
      await this.storeImageMetadata({
        hash: newHash,
        prompt: metadata.prompt,
        providerUrl: newUrl,
        width: metadata.width,
        height: metadata.height
      });

      // Delete old image
      await this.deleteImage(oldHash);

      logger.info('Image regenerated successfully', { oldHash, newHash });

      return {
        success: true,
        oldHash,
        newHash,
        newUrl: `/api/images/${newHash}`
      };
    } catch (error) {
      this.recordFailure(error);
      logger.error('Failed to regenerate image', {
        oldHash,
        error: error.message,
        circuitState: this.circuitBreaker.getState().state
      });

      return { success: false, error: error.message };
    }
  }
}

module.exports = PollinationsProvider;
