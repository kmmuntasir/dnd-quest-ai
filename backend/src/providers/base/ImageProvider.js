/**
 * Image Provider Abstract Class
 * Base class for all image generation providers
 */

const BaseProvider = require('./BaseProvider');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('../../config/database');
const { logger } = require('../../utils/logger');

// Default cache directory for images (backend/storage/images)
const DEFAULT_CACHE_DIR = path.resolve(__dirname, '../../../storage/images');

/**
 * Abstract base class for image generation providers
 * Extends BaseProvider with image-specific functionality:
 * - Image caching
 * - Metadata storage
 * - Prompt enhancement
 */
class ImageProvider extends BaseProvider {
  /**
   * @param {Object} config - Provider configuration
   * @param {string} config.cacheDir - Directory for cached images
   * @param {string} config.defaultStyle - Default image style
   * @param {number} config.defaultWidth - Default image width
   * @param {number} config.defaultHeight - Default image height
   */
  constructor(config = {}) {
    super({
      ...config,
      type: 'image'
    });

    if (this.constructor === ImageProvider) {
      throw new Error('ImageProvider is an abstract class and cannot be instantiated directly');
    }

    this.cacheDir = config.cacheDir || DEFAULT_CACHE_DIR;
    this.defaultStyle = config.defaultStyle || 'fantasy art';
    this.defaultWidth = config.defaultWidth || 1024;
    this.defaultHeight = config.defaultHeight || 1024;

    // Ensure cache directory exists
    this._ensureCacheDir();
  }

  /**
   * Ensure the cache directory exists
   * @private
   */
  _ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      logger.info(`Created image cache directory: ${this.cacheDir}`);
    }
  }

  /**
   * Generate a random hash for image identification
   * @returns {string} 32-character hex hash
   */
  generateHash() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Enhance a prompt with style keywords
   * @param {string} prompt - Original prompt
   * @param {string} style - Image style
   * @returns {string} Enhanced prompt
   */
  enhancePrompt(prompt, style = this.defaultStyle) {
    return `${prompt}, ${style} style, high quality, detailed, atmospheric`;
  }

  /**
   * Store image metadata in database
   * @param {Object} metadata - Image metadata
   * @param {string} metadata.hash - Image hash
   * @param {string} metadata.prompt - Image prompt
   * @param {string} metadata.providerUrl - Provider-specific URL
   * @param {number} metadata.width - Image width
   * @param {number} metadata.height - Image height
   * @param {string} metadata.provider - Provider name
   */
  async storeImageMetadata({ hash, prompt, providerUrl, width, height }) {
    try {
      const result = await db.run(`
        INSERT INTO images (hash, prompt, pollinations_url, width, height)
        VALUES (?, ?, ?, ?, ?)
      `, [hash, prompt, providerUrl, width, height]);

      if (result.changes === 0) {
        logger.warn('Image metadata not inserted - hash may already exist', { hash });
      }
    } catch (error) {
      logger.error('Failed to store image metadata', { hash, error: error.message });
      throw error;
    }
  }

  /**
   * Get image metadata from database
   * @param {string} hash - Image hash
   * @returns {Promise<Object|null>}
   */
  async getImageMetadata(hash) {
    return await db.get('SELECT * FROM images WHERE hash = ?', [hash]);
  }

  /**
   * Update cached path in database
   * @param {string} hash - Image hash
   * @param {string} cachedPath - Path to cached file
   */
  async updateCachedPath(hash, cachedPath) {
    await db.run(`
      UPDATE images SET cached_path = ? WHERE hash = ?
    `, [cachedPath, hash]);
  }

  /**
   * Save image data to cache
   * @param {string} hash - Image hash
   * @param {Buffer} imageData - Image data buffer
   * @param {string} extension - File extension (default: 'png')
   * @returns {string} Path to cached file
   */
  saveToCache(hash, imageData, extension = 'png') {
    const cachedPath = path.join(this.cacheDir, `${hash}.${extension}`);
    fs.writeFileSync(cachedPath, imageData);
    logger.info('Image cached successfully', { hash, path: cachedPath });
    return cachedPath;
  }

  /**
   * Check if image is already cached
   * @param {string} hash - Image hash
   * @returns {string|null} Path to cached file or null
   */
  getCachedPath(hash) {
    const cachedPath = path.join(this.cacheDir, `${hash}.png`);
    if (fs.existsSync(cachedPath)) {
      return cachedPath;
    }

    // Also check for jpg
    const jpgPath = path.join(this.cacheDir, `${hash}.jpg`);
    if (fs.existsSync(jpgPath)) {
      return jpgPath;
    }

    return null;
  }

  /**
   * Check if hash is a fallback hash
   * @param {string} hash - Image hash
   * @returns {boolean}
   */
  isFallbackHash(hash) {
    return hash.startsWith('fallback-');
  }

  /**
   * Generate an image
   * Must be implemented by subclasses
   * @param {string} prompt - Image generation prompt
   * @param {Object} options - Generation options
   * @returns {Promise<{hash: string, url: string}>}
   */
  async generateImage(prompt, options = {}) {
    throw new Error('generateImage must be implemented by subclass');
  }

  /**
   * Fetch and cache an image
   * Must be implemented by subclasses
   * @param {string} hash - Image hash
   * @returns {Promise<string|null>} Path to cached file or null
   */
  async fetchImage(hash) {
    throw new Error('fetchImage must be implemented by subclass');
  }

  /**
   * Delete an image (cache file and metadata)
   * @param {string} hash - Image hash
   * @returns {Promise<boolean>}
   */
  async deleteImage(hash) {
    try {
      const metadata = await this.getImageMetadata(hash);

      if (metadata) {
        // Delete cached file if exists
        const cachedPath = this.getCachedPath(hash);
        if (cachedPath) {
          fs.unlinkSync(cachedPath);
          logger.info('Deleted cached image', { path: cachedPath });
        }

        // Delete from database
        await db.run('DELETE FROM images WHERE hash = ?', [hash]);
        logger.info('Deleted image metadata', { hash });
      }

      return true;
    } catch (error) {
      logger.error('Failed to delete image', { hash, error: error.message });
      return false;
    }
  }
}

module.exports = ImageProvider;
