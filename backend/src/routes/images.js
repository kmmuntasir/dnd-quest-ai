const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/database');
const imageService = require('../services/imageService');
const { imageQueue } = require('../queue/imageQueue');
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
 * Regenerate an image asynchronously
 * Queues the job and returns immediately with the new hash
 * Frontend should poll for status updates
 */
router.post('/:hash/regenerate', async (req, res) => {
  const { hash } = req.params;

  try {
    // Check if it's a fallback hash
    if (hash.startsWith('fallback-')) {
      return res.status(400).json({ error: 'Cannot regenerate fallback image' });
    }

    // Get the old image metadata
    const oldImage = await db.get('SELECT * FROM images WHERE hash = ?', [hash]);
    if (!oldImage) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Generate a new hash for the regenerated image
    const newHash = crypto.randomBytes(16).toString('hex');

    // Find the scene using this image hash
    const scene = await imageService.findSceneByImageHash(hash);

    // Create new image record with pending status
    await db.run(`
      INSERT INTO images (hash, prompt, pollinations_url, width, height, status, provider)
      VALUES (?, ?, '', ?, ?, 'pending', 'queue')
    `, [newHash, oldImage.prompt, oldImage.width || 1024, oldImage.height || 1024]);

    // Update the scene with the new hash immediately (will show placeholder)
    if (scene) {
      await imageService.updateSceneImageHash(scene.id, newHash);
    }

    // Delete the old image record and file
    await imageService.deleteImage(hash);

    // Add the regeneration job to the queue
    imageQueue.addJob({
      hash: newHash,
      prompt: oldImage.prompt,
      type: 'regenerate',
      adventureId: scene?.adventure_id || null,
      entityId: scene?.id || null,
      options: {
        width: oldImage.width || 1024,
        height: oldImage.height || 1024,
        style: 'fantasy art'
      }
    });

    logger.info('Image regeneration queued', {
      oldHash: hash,
      newHash,
      sceneId: scene?.id
    });

    // Return immediately - frontend will poll for status
    return res.json({
      success: true,
      message: 'Image regeneration started',
      oldHash: hash,
      newHash,
      newUrl: `/api/images/${newHash}`,
      status: 'pending',
      sceneId: scene?.id
    });

  } catch (error) {
    logger.error('Error queueing image regeneration', { hash, error: error.message });
    return res.status(500).json({
      error: 'Failed to regenerate image',
      details: error.message
    });
  }
});

/**
 * GET /api/images/:hash/status
 * Get the status of an image (for polling)
 */
router.get('/:hash/status', async (req, res) => {
  const { hash } = req.params;

  try {
    const image = await db.get(`
      SELECT hash, status, cached_path, provider, error_message
      FROM images WHERE hash = ?
    `, [hash]);

    if (!image) {
      return res.status(404).json({
        hash,
        status: 'not_found',
        error: 'Image not found'
      });
    }

    return res.json({
      hash: image.hash,
      status: image.status,
      provider: image.provider,
      error: image.error_message,
      url: image.status === 'ready' ? `/api/images/${image.hash}` : null
    });

  } catch (error) {
    logger.error('Error getting image status', { hash, error: error.message });
    return res.status(500).json({
      hash,
      status: 'error',
      error: error.message
    });
  }
});

/**
 * GET /api/images/:hash
 * Serve an image by its hash
 *
 * New status-based serving:
 * - If ready + cached: serve from filesystem
 * - If pending/processing: serve loading placeholder
 * - If failed: serve error placeholder
 * - If not in queue (legacy): try to fetch (backward compatibility)
 */
router.get('/:hash', async (req, res) => {
  const { hash } = req.params;

  try {
    // Check if it's a fallback hash
    if (hash.startsWith('fallback-')) {
      return servePlaceholder(res, 'Fallback image', false, 'error');
    }

    // Get image metadata and status from database
    const image = await db.get(`
      SELECT hash, status, cached_path, provider, error_message
      FROM images WHERE hash = ?
    `, [hash]);

    // If image not found in database (legacy case), try to fetch
    if (!image) {
      logger.debug('Image not in queue, attempting legacy fetch', { hash });
      return await serveLegacyImage(res, hash);
    }

    // Handle based on status
    switch (image.status) {
      case 'ready':
        // Check if file exists
        if (image.cached_path && fs.existsSync(image.cached_path)) {
          return serveImage(res, image.cached_path);
        }
        // File missing but status is ready - try to refetch
        logger.warn('Image marked ready but file missing', { hash });
        return servePlaceholder(res, 'Image file not found', false, 'error');

      case 'processing':
        return servePlaceholder(res, 'Generating image...', false, 'processing');

      case 'pending':
        return servePlaceholder(res, 'Queued for generation...', false, 'pending');

      case 'failed':
        return servePlaceholder(res, image.error_message || 'Image generation failed', true, 'error');

      default:
        // Unknown status - try legacy fetch
        return await serveLegacyImage(res, hash);
    }

  } catch (error) {
    logger.error('Error serving image', { hash, error: error.message });
    return servePlaceholder(res, 'Error loading image', false, 'error');
  }
});

/**
 * Serve image using legacy fetch method (backward compatibility)
 * @param {Response} res - Express response
 * @param {string} hash - Image hash
 */
async function serveLegacyImage(res, hash) {
  try {
    // Check if service is known to be down
    const serviceStatus = imageService.getServiceStatus();
    if (serviceStatus.isDown) {
      logger.warn('Image service is down, serving placeholder', { hash });
      return servePlaceholder(res, 'Service temporarily unavailable', true, 'error');
    }

    // Get cached image or fetch if not cached
    const cachedPath = await imageService.getCachedImage(hash);

    if (cachedPath && fs.existsSync(cachedPath)) {
      return serveImage(res, cachedPath);
    }

    // Check again if service was marked down during fetch
    const updatedStatus = imageService.getServiceStatus();
    if (updatedStatus.isDown) {
      logger.warn('Image service detected as down during fetch', { hash });
      return servePlaceholder(res, 'Service temporarily unavailable', true, 'error');
    }

    // If caching failed, serve placeholder
    logger.warn('Image not cached, serving placeholder', { hash });
    return servePlaceholder(res, 'Image loading...', false, 'pending');

  } catch (error) {
    logger.error('Legacy image fetch failed', { hash, error: error.message });
    return servePlaceholder(res, 'Error loading image', false, 'error');
  }
}

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
 * @param {string} status - Image status ('pending', 'processing', 'error')
 */
function servePlaceholder(res, reason, isServiceDown = false, status = 'pending') {
  // Check if placeholder exists
  if (fs.existsSync(PLACEHOLDER_IMAGE) && status === 'error') {
    return serveImage(res, PLACEHOLDER_IMAGE);
  }

  // Generate a simple SVG placeholder based on status
  let mainText, subText, gradient;

  switch (status) {
    case 'processing':
      mainText = 'Generating Image...';
      subText = 'This may take a moment';
      gradient = ['#4a1c6b', '#2d1b4e'];
      break;
    case 'pending':
      mainText = 'Image Queued';
      subText = reason || 'Waiting to generate...';
      gradient = ['#3b5998', '#1a237e'];
      break;
    case 'error':
    default:
      mainText = isServiceDown ? 'Image Service Unavailable' : 'Image Unavailable';
      subText = isServiceDown
        ? 'Please try refreshing or regenerating the image'
        : reason || 'Image generation failed';
      gradient = ['#c62828', '#7c3aed'];
      break;
  }

  const svg = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${gradient[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${gradient[1]};stop-opacity:1" />
        </linearGradient>
        ${status === 'processing' ? `
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          .pulse { animation: pulse 2s ease-in-out infinite; }
        </style>
        ` : ''}
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      ${status === 'processing' ? `
      <circle cx="512" cy="400" r="40" fill="#ffffff" class="pulse" opacity="0.6"/>
      <circle cx="432" cy="480" r="30" fill="#ffffff" class="pulse" opacity="0.4" style="animation-delay: 0.3s"/>
      <circle cx="592" cy="480" r="30" fill="#ffffff" class="pulse" opacity="0.4" style="animation-delay: 0.6s"/>
      ` : ''}
      <text x="50%" y="${status === 'processing' ? '60%' : '45%'}" font-family="Arial" font-size="28" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
        ${mainText}
      </text>
      <text x="50%" y="${status === 'processing' ? '68%' : '55%'}" font-family="Arial" font-size="16" fill="#aaaaaa" text-anchor="middle" dominant-baseline="middle">
        ${subText}
      </text>
      ${isServiceDown || status === 'error' ? `
      <rect x="40%" y="65%" width="20%" height="8%" rx="5" fill="#7c3aed"/>
      <text x="50%" y="69%" font-family="Arial" font-size="14" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
        Click to Retry
      </text>
      ` : ''}
    </svg>
  `;

  res.setHeader('Content-Type', 'image/svg+xml');
  // Cache for shorter time to allow quick updates
  const cacheTime = status === 'processing' ? 2 : (status === 'pending' ? 5 : (isServiceDown ? 10 : 60));
  res.setHeader('Cache-Control', `public, max-age=${cacheTime}`);
  res.send(svg);
}

module.exports = router;
