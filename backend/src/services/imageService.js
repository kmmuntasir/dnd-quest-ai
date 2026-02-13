/**
 * Image Service Facade
 * Delegates to the provider system while maintaining backward compatibility
 */

const crypto = require('crypto');
const { logger } = require('../utils/logger');
const {
  getImageProvider,
  executeImageWithFallback,
  getProvidersHealth,
  initializeProviders,
  imageProviderConfig
} = require('../providers');

// Database access for backward compatibility
const db = require('../config/database');

// Track service status for backward compatibility
let serviceDownDetected = false;
let serviceDownTime = null;

/**
 * Initialize the image service
 */
function init() {
  initializeProviders();
  logger.info('Image service initialized with provider facade');
}

// Initialize on module load
init();

/**
 * Generate a random image hash (for queueing)
 * @returns {string} 32-character hex hash
 */
function generateImageHash() {
  return crypto.randomBytes(16).toString('hex');
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
  try {
    // Use fallback chain for generation
    const provider = getImageProvider(imageProviderConfig.primary);
    if (provider) {
      return await provider.generateImage(prompt, options);
    }

    // Fallback to direct execution with fallback chain
    return await executeImageWithFallback('generateImage', [prompt, options]);
  } catch (error) {
    logger.error('Image generation failed in facade', { error: error.message });

    // Return fallback hash for backward compatibility
    const crypto = require('crypto');
    const fallbackHash = 'fallback-' + crypto.randomBytes(16).toString('hex');
    return {
      hash: fallbackHash,
      url: `/api/images/${fallbackHash}`
    };
  }
}

/**
 * Fetch and cache an image
 * Uses fallback chain when primary provider fails
 * @param {string} hash - Image hash
 * @returns {Promise<string|null>} Path to cached file or null on error
 */
async function fetchAndCacheImage(hash) {
  try {
    return await executeImageWithFallback('fetchImage', [hash]);
  } catch (error) {
    logger.error('Failed to fetch image in facade', { hash, error: error.message });
    return null;
  }
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

  try {
    return await executeImageWithFallback('fetchImage', [hash]);
  } catch (error) {
    logger.error('Failed to get cached image', { hash, error: error.message });
    return null;
  }
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
  const fs = require('fs');
  const path = require('path');

  try {
    const metadata = await getImageMetadata(hash);

    if (metadata) {
      // Delete cached file if exists
      const cacheDir = path.resolve(__dirname, '../../storage/images');
      const cachedPath = path.join(cacheDir, `${hash}.png`);

      if (fs.existsSync(cachedPath)) {
        fs.unlinkSync(cachedPath);
        logger.info('Deleted cached image', { path: cachedPath });
      }

      // Also check for jpg
      const jpgPath = path.join(cacheDir, `${hash}.jpg`);
      if (fs.existsSync(jpgPath)) {
        fs.unlinkSync(jpgPath);
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
 * Test image provider connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    const provider = getImageProvider(imageProviderConfig.primary);
    if (provider) {
      return await provider.testConnection();
    }
    return false;
  } catch (error) {
    logger.error('Image provider connection test failed', { error: error.message });
    return false;
  }
}

/**
 * Regenerate an image with a new seed
 * @param {string} oldHash - Old image hash
 * @returns {Promise<Object>} Result with success status and new hash
 */
async function regenerateImage(oldHash) {
  try {
    const provider = getImageProvider(imageProviderConfig.primary);

    // Check if provider supports regeneration
    if (provider && typeof provider.regenerateImage === 'function') {
      return await provider.regenerateImage(oldHash);
    }

    // Fallback: Generate new image with original prompt
    const metadata = await getImageMetadata(oldHash);
    if (!metadata) {
      return { success: false, error: 'Image not found' };
    }

    const newResult = await generateImage(metadata.prompt, {
      width: metadata.width,
      height: metadata.height
    });

    await deleteImage(oldHash);

    return {
      success: true,
      oldHash,
      newHash: newResult.hash,
      newUrl: newResult.url
    };
  } catch (error) {
    logger.error('Failed to regenerate image', { oldHash, error: error.message });
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

/**
 * Check if the image service is currently detected as down
 * @returns {Object} Status object with isDown and lastDetected properties
 */
function getServiceStatus() {
  // Auto-recover after 5 minutes
  if (serviceDownDetected && serviceDownTime && (Date.now() - serviceDownTime > 300000)) {
    serviceDownDetected = false;
    serviceDownTime = null;
    logger.info('Image service auto-recovery triggered');
  }
  return {
    isDown: serviceDownDetected,
    lastDetected: serviceDownTime
  };
}

/**
 * Mark service as down
 */
function markServiceDown() {
  serviceDownDetected = true;
  serviceDownTime = Date.now();
  logger.warn('Image service marked as down', { serviceDownTime });
}

/**
 * Mark service as up
 */
function markServiceUp() {
  if (serviceDownDetected) {
    logger.info('Image service recovered');
  }
  serviceDownDetected = false;
  serviceDownTime = null;
}

/**
 * Get health status of all image providers
 * @returns {Promise<Object>}
 */
async function getProviderHealth() {
  return getProvidersHealth();
}

module.exports = {
  generateImage,
  generateImageHash,
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
  findSceneByImageHash,
  getServiceStatus,
  markServiceDown,
  markServiceUp,
  getProviderHealth
};
