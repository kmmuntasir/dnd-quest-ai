const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { logger } = require('../utils/logger');
const { CircuitBreaker, retryWithBackoff } = require('../utils/circuitBreaker');

// API key for Pollinations.ai (removes watermark when provided)
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;

// App referrer for Pollinations.ai API identification
const APP_REFERRER = 'dungeons-and-dragons-rpg';

// Cache directory for images
const CACHE_DIR = path.resolve(__dirname, '../../storage/images');

// Configuration
const IMAGE_TIMEOUT = parseInt(process.env.IMAGE_TIMEOUT) || 30000; // 30 seconds (reduced from 90)
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1000;

// Circuit breaker for Pollinations API
const pollinationsCircuitBreaker = new CircuitBreaker({
  name: 'pollinations-api',
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds before trying again
  successThreshold: 2
});

/**
 * Generate a random hash for image identification
 * @returns {string} Random 32-character hash
 */
function generateHash() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Build Pollinations.ai URL from parameters
 * @param {string} prompt - Image prompt
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} seed - Random seed
 * @returns {string} Pollinations.ai URL
 */
function buildPollinationsUrl(prompt, width, height, seed) {
  const encodedPrompt = encodeURIComponent(prompt);

  const params = new URLSearchParams({
    width: width.toString(),
    height: height.toString(),
    seed: seed.toString(),
    enhance: 'true',
    model: 'flux',
    referrer: APP_REFERRER
  });

  if (POLLINATIONS_API_KEY) {
    params.append('nologo', 'true');
  }

  return `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;
}

/**
 * Store image metadata in database
 * @param {string} hash - Image hash
 * @param {string} prompt - Image prompt
 * @param {string} pollinationsUrl - Pollinations.ai URL
 * @param {number} width - Image width
 * @param {number} height - Image height
 */
async function storeImageMetadata(hash, prompt, pollinationsUrl, width, height) {
  await db.run(`
    INSERT OR IGNORE INTO images (hash, prompt, pollinations_url, width, height)
    VALUES (?, ?, ?, ?, ?)
  `, [hash, prompt, pollinationsUrl, width, height]);
}

/**
 * Update cached path in database
 * @param {string} hash - Image hash
 * @param {string} cachedPath - Path to cached file
 */
async function updateCachedPath(hash, cachedPath) {
  await db.run(`
    UPDATE images SET cached_path = ? WHERE hash = ?
  `, [cachedPath, hash]);
}

/**
 * Get image metadata from database
 * @param {string} hash - Image hash
 * @returns {Promise<Object|null>} Image metadata or null
 */
async function getImageMetadata(hash) {
  return await db.get('SELECT * FROM images WHERE hash = ?', [hash]);
}

/**
 * Generate image and return hash
 * @param {string} prompt - Image generation prompt
 * @param {Object} options - Additional options
 * @param {string} options.style - Image style (fantasy art, realistic, cartoon)
 * @param {number} options.width - Image width (default: 1024)
 * @param {number} options.height - Image height (default: 1024)
 * @returns {Promise<Object>} Object with hash and url properties
 */
async function generateImage(prompt, options = {}) {
  const { style = 'fantasy art', width = 1024, height = 1024 } = options;

  // Enhance prompt with style keywords
  const enhancedPrompt = `${prompt}, ${style} style, high quality, detailed, atmospheric`;

  try {
    // Generate unique hash for this image
    const hash = generateHash();

    // Generate seed based on hash for reproducibility
    const seed = parseInt(hash.substring(0, 8), 16) % 1000000;

    // Build Pollinations URL
    const pollinationsUrl = buildPollinationsUrl(enhancedPrompt, width, height, seed);

    // Store metadata in database
    await storeImageMetadata(hash, enhancedPrompt, pollinationsUrl, width, height);

    // Return hash instead of URL - the /api/images/:hash endpoint will handle serving
    return {
      hash,
      url: `/api/images/${hash}`
    };
  } catch (error) {
    logger.error('Image generation error', { error: error.message });
    // Return a fallback hash (will show placeholder)
    const fallbackHash = 'fallback-' + generateHash();
    return {
      hash: fallbackHash,
      url: `/api/images/${fallbackHash}`
    };
  }
}

/**
 * Fetch and cache an image from Pollinations.ai
 * Uses circuit breaker and retry logic for reliability
 * @param {string} hash - Image hash
 * @returns {Promise<string|null>} Path to cached file or null on error
 */
async function fetchAndCacheImage(hash) {
  const metadata = await getImageMetadata(hash);

  if (!metadata) {
    logger.warn('No metadata found for hash', { hash });
    return null;
  }

  // If already cached, return the path
  if (metadata.cached_path && fs.existsSync(metadata.cached_path)) {
    return metadata.cached_path;
  }

  // Check circuit breaker
  if (!pollinationsCircuitBreaker.canRequest()) {
    logger.warn('Circuit breaker is open, skipping image fetch', { hash });
    return null;
  }

  try {
    const cachedPath = await retryWithBackoff(
      async () => fetchImageFromUrl(metadata.pollinations_url, hash),
      {
        maxRetries: MAX_RETRIES,
        baseDelay: RETRY_BASE_DELAY,
        shouldRetry: (error) => {
          // Retry on network errors or 5xx responses
          return !error.response || error.response.status >= 500;
        }
      }
    );

    // Update circuit breaker on success
    pollinationsCircuitBreaker.recordSuccess();

    // Update database with cached path
    if (cachedPath) {
      await updateCachedPath(hash, cachedPath);
    }

    return cachedPath;
  } catch (error) {
    // Update circuit breaker on failure
    pollinationsCircuitBreaker.recordFailure();

    logger.error('Failed to fetch image after retries', {
      hash,
      error: error.message,
      circuitState: pollinationsCircuitBreaker.getState().state
    });
    return null;
  }
}

/**
 * Fetch image from URL and save to cache
 * @param {string} url - Image URL
 * @param {string} hash - Image hash
 * @returns {Promise<string>} Path to cached file
 */
async function fetchImageFromUrl(url, hash) {
  const headers = {};
  if (POLLINATIONS_API_KEY) {
    headers['Authorization'] = `Bearer ${POLLINATIONS_API_KEY}`;
  }

  logger.info('Fetching image from Pollinations.ai', { hash });

  const response = await axios.get(url, {
    timeout: IMAGE_TIMEOUT,
    headers,
    responseType: 'arraybuffer'
  });

  if (response.status === 200 && response.data.byteLength > 0) {
    const cachedPath = path.join(CACHE_DIR, `${hash}.png`);
    fs.writeFileSync(cachedPath, response.data);

    logger.info('Image cached successfully', { hash });
    return cachedPath;
  }

  throw new Error(`Invalid response: status ${response.status}`);
}

/**
 * Get cached image path or fetch if not cached
 * @param {string} hash - Image hash
 * @returns {Promise<string|null>} Path to cached file or null
 */
async function getCachedImage(hash) {
  // Check if it's a fallback hash
  if (hash.startsWith('fallback-')) {
    return null;
  }

  const metadata = await getImageMetadata(hash);

  if (!metadata) {
    return null;
  }

  // Check if already cached
  if (metadata.cached_path && fs.existsSync(metadata.cached_path)) {
    return metadata.cached_path;
  }

  // Fetch and cache
  return fetchAndCacheImage(hash);
}

/**
 * Generate images for scenes
 * @param {Array} scenes - Array of scene objects with imagePrompt
 * @param {string} style - Image style
 * @returns {Promise<Array>} Array of scene objects with image hashes
 */
async function generateSceneImages(scenes, style = 'fantasy art') {
  const sceneImages = await Promise.all(
    scenes.map(async (scene) => {
      const { hash, url } = await generateImage(scene.imagePrompt, { style });
      return {
        ...scene,
        image_url: url,
        image_hash: hash
      };
    })
  );

  return sceneImages;
}

/**
 * Generate NPC portrait
 * @param {Object} npc - NPC object with name and description
 * @param {string} style - Image style
 * @returns {Promise<Object>} Object with hash and url properties
 */
async function generateNPCPortrait(npc, style = 'fantasy art') {
  const prompt = `Portrait of ${npc.name}, ${npc.description}, ${npc.role}, character design`;
  return generateImage(prompt, { style, width: 512, height: 512 });
}

/**
 * Delete cached image and database record
 * @param {string} hash - Image hash
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteImage(hash) {
  try {
    const metadata = await getImageMetadata(hash);

    if (metadata) {
      // Delete cached file if exists
      if (metadata.cached_path && fs.existsSync(metadata.cached_path)) {
        fs.unlinkSync(metadata.cached_path);
        logger.info('Deleted cached image', { path: metadata.cached_path });
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

/**
 * Delete all images for an adventure
 * @param {number} adventureId - Adventure ID
 */
async function deleteAdventureImages(adventureId) {
  try {
    // Get all scene image hashes
    const sceneRows = await db.all(`
      SELECT image_hash FROM scenes WHERE adventure_id = ? AND image_hash IS NOT NULL
    `, [adventureId]);
    const sceneHashes = sceneRows.map(row => row.image_hash);

    // Get all NPC portrait hashes
    const npcRows = await db.all(`
      SELECT portrait_hash FROM npcs WHERE adventure_id = ? AND portrait_hash IS NOT NULL
    `, [adventureId]);
    const npcHashes = npcRows.map(row => row.portrait_hash);

    // Combine and delete all
    const allHashes = [...sceneHashes, ...npcHashes];
    for (const hash of allHashes) {
      await deleteImage(hash);
    }

    logger.info('Deleted adventure images', { adventureId, count: allHashes.length });
  } catch (error) {
    logger.error('Failed to delete adventure images', { adventureId, error: error.message });
  }
}

/**
 * Test Pollinations.ai API connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    const params = new URLSearchParams({
      width: '512',
      height: '512',
      referrer: APP_REFERRER
    });

    if (POLLINATIONS_API_KEY) {
      params.append('nologo', 'true');
    }

    const testUrl = `https://image.pollinations.ai/prompt/test?${params.toString()}`;

    const headers = {};
    if (POLLINATIONS_API_KEY) {
      headers['Authorization'] = `Bearer ${POLLINATIONS_API_KEY}`;
    }

    const response = await axios.get(testUrl, {
      timeout: 60000,
      headers,
      responseType: 'arraybuffer'
    });

    return response.status === 200 && response.data.byteLength > 0;
  } catch (error) {
    logger.error('Pollinations.ai connection test failed', { error: error.message });
    return false;
  }
}

/**
 * Regenerate an image with a new seed and new hash
 * Uses circuit breaker and retry logic for reliability
 * @param {string} oldHash - Old image hash to regenerate
 * @returns {Promise<Object>} Result with success status, new hash, and new URL
 */
async function regenerateImage(oldHash) {
  const metadata = await getImageMetadata(oldHash);

  if (!metadata) {
    return { success: false, error: 'Image not found' };
  }

  // Check circuit breaker
  if (!pollinationsCircuitBreaker.canRequest()) {
    return {
      success: false,
      error: 'Service temporarily unavailable (circuit breaker open)'
    };
  }

  try {
    // Generate a new hash for the new image
    const newHash = generateHash();

    // Generate a new seed using timestamp for randomness
    const newSeed = Date.now() % 1000000;

    // Build new Pollinations URL with new seed
    const newUrl = buildPollinationsUrl(metadata.prompt, metadata.width, metadata.height, newSeed);

    logger.info('Regenerating image', { oldHash, newHash });

    // Fetch new image with retry logic
    const cachedPath = await retryWithBackoff(
      async () => fetchImageFromUrl(newUrl, newHash),
      {
        maxRetries: MAX_RETRIES,
        baseDelay: RETRY_BASE_DELAY,
        shouldRetry: (error) => {
          return !error.response || error.response.status >= 500;
        }
      }
    );

    // Record success
    pollinationsCircuitBreaker.recordSuccess();

    // Store new image metadata in database
    await storeImageMetadata(newHash, metadata.prompt, newUrl, metadata.width, metadata.height);
    await updateCachedPath(newHash, cachedPath);

    // Delete old image (file and db record)
    await deleteImage(oldHash);

    logger.info('Image regenerated successfully', { oldHash, newHash });

    return {
      success: true,
      oldHash,
      newHash,
      newUrl: `/api/images/${newHash}`
    };
  } catch (error) {
    // Record failure
    pollinationsCircuitBreaker.recordFailure();

    logger.error('Failed to regenerate image', {
      oldHash,
      error: error.message,
      circuitState: pollinationsCircuitBreaker.getState().state
    });

    return { success: false, error: error.message };
  }
}

/**
 * Update scene's image hash in database
 * @param {number} sceneId - Scene ID
 * @param {string} newHash - New image hash
 * @returns {Promise<boolean>} True if updated successfully
 */
async function updateSceneImageHash(sceneId, newHash) {
  try {
    await db.run(`
      UPDATE scenes SET image_hash = ?, image_url = ? WHERE id = ?
    `, [newHash, `/api/images/${newHash}`, sceneId]);
    logger.info('Updated scene image hash', { sceneId, newHash });
    return true;
  } catch (error) {
    logger.error('Failed to update scene image hash', { sceneId, error: error.message });
    return false;
  }
}

/**
 * Find scene by image hash
 * @param {string} hash - Image hash
 * @returns {Promise<Object|null>} Scene object or null
 */
async function findSceneByImageHash(hash) {
  return await db.get('SELECT * FROM scenes WHERE image_hash = ?', [hash]);
}

module.exports = {
  generateImage,
  generateSceneImages,
  generateNPCPortrait,
  getCachedImage,
  fetchAndCacheImage,
  getImageMetadata,
  deleteImage,
  deleteAdventureImages,
  testConnection,
  regenerateImage,
  updateSceneImageHash,
  findSceneByImageHash
};
