const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const imageService = require('../services/imageService');

// Placeholder image path (fallback when image fails to load)
const PLACEHOLDER_IMAGE = path.resolve(__dirname, '../../storage/placeholder.png');

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
    const scene = imageService.findSceneByImageHash(hash);

    // Regenerate the image
    const result = await imageService.regenerateImage(hash);

    if (result.success) {
      // Update the scene with the new hash if scene was found
      if (scene) {
        imageService.updateSceneImageHash(scene.id, result.newHash);
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
    console.error('Error regenerating image:', error.message);
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
 */
router.get('/:hash', async (req, res) => {
  const { hash } = req.params;

  try {
    // Check if it's a fallback hash
    if (hash.startsWith('fallback-')) {
      return servePlaceholder(res, 'Fallback image');
    }

    // Get cached image or fetch if not cached
    const cachedPath = await imageService.getCachedImage(hash);

    if (cachedPath && fs.existsSync(cachedPath)) {
      // Serve the cached image
      return serveImage(res, cachedPath);
    }

    // If caching failed, try to get metadata and redirect to original URL
    const metadata = imageService.getImageMetadata(hash);

    if (metadata && metadata.pollinations_url) {
      // Redirect to Pollinations URL as fallback
      return res.redirect(metadata.pollinations_url);
    }

    // No image found, serve placeholder
    return servePlaceholder(res, 'Image not found');

  } catch (error) {
    console.error('Error serving image:', error.message);
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
    console.error('Error streaming image:', error.message);
    if (!res.headersSent) {
      servePlaceholder(res, 'Error streaming image');
    }
  });
}

/**
 * Serve a placeholder image
 * @param {Response} res - Express response object
 * @param {string} reason - Reason for showing placeholder
 */
function servePlaceholder(res, reason) {
  // Check if placeholder exists
  if (fs.existsSync(PLACEHOLDER_IMAGE)) {
    return serveImage(res, PLACEHOLDER_IMAGE);
  }

  // Generate a simple SVG placeholder
  const svg = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#4a1c6b"/>
      <text x="50%" y="50%" font-family="Arial" font-size="32" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
        Image Unavailable
      </text>
      <text x="50%" y="60%" font-family="Arial" font-size="18" fill="#888888" text-anchor="middle" dominant-baseline="middle">
        ${reason}
      </text>
    </svg>
  `;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  res.send(svg);
}

module.exports = router;
