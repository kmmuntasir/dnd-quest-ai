const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const imageService = require('../services/imageService');
const { logger } = require('../utils/logger');

// Placeholder image path (fallback when image fails to load)
const PLACEHOLDER_IMAGE = path.resolve(__dirname, '../../storage/placeholder.png');

/**
 * GET /api/images/health
 * Check the health of the image generation service
 */
router.get('/health', async (req, res) => {
  try {
    const serviceStatus = imageService.getServiceStatus();
    const isConnected = await imageService.testConnection();

    res.json({
      status: isConnected ? 'healthy' : 'unhealthy',
      serviceDown: serviceStatus.isDown,
      lastDetected: serviceStatus.lastDetected,
      message: isConnected
        ? 'Image generation service is available'
        : 'Image generation service is temporarily unavailable. Please try again later.'
    });
  } catch (error) {
    logger.error('Error checking image service health', { error: error.message });
    res.status(503).json({
      status: 'error',
      message: 'Failed to check image service health',
      error: error.message
    });
  }
});

/**
 * POST /api/images/:hash/regenerate
 * Regenerate an image with a new seed
 * Updates the scene record with the new image hash
 */
router.post('/:hash/regenerate', async (req, res) => {
  const { hash } = req.params;

  try {
    // Check if it's a fallback hash
    if (hash.startsWith('fallback-')) {
      return res.status(400).json({ error: 'Cannot regenerate fallback image' });
    }

    // Find the scene using this image hash
    const scene = await imageService.findSceneByImageHash(hash);

    // Regenerate the image
    const result = await imageService.regenerateImage(hash);

    if (result.success) {
      // Update the scene with the new hash if scene was found
      if (scene) {
        await imageService.updateSceneImageHash(scene.id, result.newHash);
      }

      return res.json({
        success: true,
        message: 'Image regenerated successfully',
        oldHash: result.oldHash,
        newHash: result.newHash,
        newUrl: result.newUrl,
        sceneId: scene?.id
      });
    } else {
      return res.status(500).json({
        error: 'Failed to regenerate image',
        details: result.error
      });
    }
  } catch (error) {
    logger.error('Error regenerating image', { hash, error: error.message });
    return res.status(500).json({
      error: 'Failed to regenerate image',
      details: error.message
    });
  }
});

/**
 * GET /api/images/:hash
 * Serve an image by its hash
 * - If cached: serve from filesystem
 * - If not cached: fetch from Pollinations, cache, then serve
 * - If Pollinations unavailable: serve placeholder
 */
router.get('/:hash', async (req, res) => {
  const { hash } = req.params;

  try {
    // Check if it's a fallback hash
    if (hash.startsWith('fallback-')) {
      return servePlaceholder(res, 'Fallback image');
    }

    // Check if service is known to be down
    const serviceStatus = imageService.getServiceStatus();
    if (serviceStatus.isDown) {
      logger.warn('Image service is down, serving placeholder', { hash });
      return servePlaceholder(res, 'Service temporarily unavailable', true);
    }

    // Get cached image or fetch if not cached
    const cachedPath = await imageService.getCachedImage(hash);

    if (cachedPath && fs.existsSync(cachedPath)) {
      // Serve the cached image
      return serveImage(res, cachedPath);
    }

    // Check again if service was marked down during fetch
    const updatedStatus = imageService.getServiceStatus();
    if (updatedStatus.isDown) {
      logger.warn('Image service detected as down during fetch', { hash });
      return servePlaceholder(res, 'Service temporarily unavailable', true);
    }

    // If caching failed (likely Pollinations unavailable), serve placeholder
    logger.warn('Image not cached, serving placeholder', { hash });
    return servePlaceholder(res, 'Image loading...');

  } catch (error) {
    logger.error('Error serving image', { hash, error: error.message });
    return servePlaceholder(res, 'Error loading image');
  }
});

/**
 * Serve an image file with proper headers
 * @param {Response} res - Express response object
 * @param {string} imagePath - Path to image file
 */
function serveImage(res, imagePath) {
  const stat = fs.statSync(imagePath);
  const fileSize = stat.size;

  // Set headers
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Length', fileSize);
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  res.setHeader('ETag', require('crypto').createHash('md5').update(imagePath).digest('hex'));

  // Create read stream and pipe to response
  const fileStream = fs.createReadStream(imagePath);
  fileStream.pipe(res);

  fileStream.on('error', (error) => {
    logger.error('Error streaming image', { path: imagePath, error: error.message });
    if (!res.headersSent) {
      servePlaceholder(res, 'Error streaming image');
    }
  });
}

/**
 * Serve a placeholder image
 * @param {Response} res - Express response object
 * @param {string} reason - Reason for showing placeholder
 * @param {boolean} isServiceDown - Whether the image service is unavailable
 */
function servePlaceholder(res, reason, isServiceDown = false) {
  // Check if placeholder exists
  if (fs.existsSync(PLACEHOLDER_IMAGE) && !isServiceDown) {
    return serveImage(res, PLACEHOLDER_IMAGE);
  }

  // Generate a simple SVG placeholder
  const mainText = isServiceDown ? 'Image Service Unavailable' : 'Image Loading...';
  const subText = isServiceDown
    ? 'Please try refreshing or regenerating the image'
    : reason;

  const svg = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4a1c6b;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2d1b4e;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <text x="50%" y="45%" font-family="Arial" font-size="28" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
        ${mainText}
      </text>
      <text x="50%" y="55%" font-family="Arial" font-size="16" fill="#aaaaaa" text-anchor="middle" dominant-baseline="middle">
        ${subText}
      </text>
      ${isServiceDown ? `
      <rect x="40%" y="65%" width="20%" height="8%" rx="5" fill="#7c3aed"/>
      <text x="50%" y="69%" font-family="Arial" font-size="14" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
        Click to Retry
      </text>
      ` : ''}
    </svg>
  `;

  res.setHeader('Content-Type', 'image/svg+xml');
  // Cache for shorter time if service is down to allow quick retry
  res.setHeader('Cache-Control', isServiceDown ? 'public, max-age=10' : 'public, max-age=60');
  res.send(svg);
}

module.exports = router;
