const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');

// API key for Pollinations.ai (removes watermark when provided)
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;

// App referrer for Pollinations.ai API identification
const APP_REFERRER = 'dungeons-and-dragons-rpg';

// Cache directory for images
const CACHE_DIR = path.resolve(__dirname, '../../storage/images');

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
 * @returns {void}
 */
function storeImageMetadata(hash, prompt, pollinationsUrl, width, height) {
  db.prepare(`
    INSERT OR IGNORE INTO images (hash, prompt, pollinations_url, width, height)
    VALUES (?, ?, ?, ?, ?)
  `).run(hash, prompt, pollinationsUrl, width, height);
}

/**
 * Update cached path in database
 * @param {string} hash - Image hash
 * @param {string} cachedPath - Path to cached file
 * @returns {void}
 */
function updateCachedPath(hash, cachedPath) {
  db.prepare(`
    UPDATE images SET cached_path = ? WHERE hash = ?
  `).run(cachedPath, hash);
}

/**
 * Get image metadata from database
 * @param {string} hash - Image hash
 * @returns {Object|null} Image metadata or null
 */
function getImageMetadata(hash) {
  return db.prepare('SELECT * FROM images WHERE hash = ?').get(hash);
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
    storeImageMetadata(hash, enhancedPrompt, pollinationsUrl, width, height);

    // Return hash instead of URL - the /api/images/:hash endpoint will handle serving
    return {
      hash,
      url: `/api/images/${hash}`
    };
  } catch (error) {
    console.error('Image generation error:', error.message);
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
 * @param {string} hash - Image hash
 * @returns {Promise<string|null>} Path to cached file or null on error
 */
async function fetchAndCacheImage(hash) {
  const metadata = getImageMetadata(hash);

  if (!metadata) {
    console.error('No metadata found for hash:', hash);
    return null;
  }

  // If already cached, return the path
  if (metadata.cached_path && fs.existsSync(metadata.cached_path)) {
    return metadata.cached_path;
  }

  try {
    console.log('Fetching image from Pollinations.ai:', hash);

    const headers = {};
    if (POLLINATIONS_API_KEY) {
      headers['Authorization'] = `Bearer ${POLLINATIONS_API_KEY}`;
    }

    const response = await axios.get(metadata.pollinations_url, {
      timeout: 90000, // 90 seconds timeout
      headers,
      responseType: 'arraybuffer'
    });

    if (response.status === 200 && response.data.byteLength > 0) {
      // Save to cache
      const cachedPath = path.join(CACHE_DIR, `${hash}.png`);
      fs.writeFileSync(cachedPath, response.data);

      // Update database
      updateCachedPath(hash, cachedPath);

      console.log('Image cached successfully:', hash);
      return cachedPath;
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch image:', error.message);
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

  const metadata = getImageMetadata(hash);

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
 * @returns {boolean} True if deleted successfully
 */
function deleteImage(hash) {
  try {
    const metadata = getImageMetadata(hash);

    if (metadata) {
      // Delete cached file if exists
      if (metadata.cached_path && fs.existsSync(metadata.cached_path)) {
        fs.unlinkSync(metadata.cached_path);
        console.log('Deleted cached image:', metadata.cached_path);
      }

      // Delete from database
      db.prepare('DELETE FROM images WHERE hash = ?').run(hash);
      console.log('Deleted image metadata:', hash);
    }

    return true;
  } catch (error) {
    console.error('Failed to delete image:', error.message);
    return false;
  }
}

/**
 * Delete all images for an adventure
 * @param {number} adventureId - Adventure ID
 */
function deleteAdventureImages(adventureId) {
  try {
    // Get all scene image hashes
    const sceneHashes = db.prepare(`
      SELECT image_hash FROM scenes WHERE adventure_id = ? AND image_hash IS NOT NULL
    `).all(adventureId).map(row => row.image_hash);

    // Get all NPC portrait hashes
    const npcHashes = db.prepare(`
      SELECT portrait_hash FROM npcs WHERE adventure_id = ? AND portrait_hash IS NOT NULL
    `).all(adventureId).map(row => row.portrait_hash);

    // Combine and delete all
    const allHashes = [...sceneHashes, ...npcHashes];
    allHashes.forEach(hash => deleteImage(hash));

    console.log(`Deleted ${allHashes.length} images for adventure ${adventureId}`);
  } catch (error) {
    console.error('Failed to delete adventure images:', error.message);
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
    console.error('Pollinations.ai connection test failed:', error.message);
    return false;
  }
}

/**
 * Regenerate an image with a new seed
 * @param {string} hash - Image hash to regenerate
 * @returns {Promise<Object>} Result with success status and new cached path
 */
async function regenerateImage(hash) {
  const metadata = getImageMetadata(hash);

  if (!metadata) {
    return { success: false, error: 'Image not found' };
  }

  try {
    console.log('Regenerating image:', hash);

    // Generate a new seed using timestamp for randomness
    const newSeed = Date.now() % 1000000;

    // Build new Pollinations URL with new seed
    const newUrl = buildPollinationsUrl(metadata.prompt, metadata.width, metadata.height, newSeed);

    // Update the URL in the database
    db.prepare(`
      UPDATE images SET pollinations_url = ? WHERE hash = ?
    `).run(newUrl, hash);

    // Delete old cached file if exists
    if (metadata.cached_path && fs.existsSync(metadata.cached_path)) {
      fs.unlinkSync(metadata.cached_path);
      console.log('Deleted old cached image:', metadata.cached_path);
    }

    // Clear cached path in database
    db.prepare(`
      UPDATE images SET cached_path = NULL WHERE hash = ?
    `).run(hash);

    // Fetch new image
    const headers = {};
    if (POLLINATIONS_API_KEY) {
      headers['Authorization'] = `Bearer ${POLLINATIONS_API_KEY}`;
    }

    const response = await axios.get(newUrl, {
      timeout: 90000,
      headers,
      responseType: 'arraybuffer'
    });

    if (response.status === 200 && response.data.byteLength > 0) {
      // Save to cache
      const cachedPath = path.join(CACHE_DIR, `${hash}.png`);
      fs.writeFileSync(cachedPath, response.data);

      // Update database
      updateCachedPath(hash, cachedPath);

      console.log('Image regenerated successfully:', hash);
      return { success: true, cachedPath };
    }

    return { success: false, error: 'Failed to fetch new image' };
  } catch (error) {
    console.error('Failed to regenerate image:', error.message);
    return { success: false, error: error.message };
  }
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
  regenerateImage
};
