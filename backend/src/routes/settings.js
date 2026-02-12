const express = require('express');
const router = express.Router();
const db = require('../config/database');
const groqService = require('../services/groqService');
const imageService = require('../services/imageService');
const { logger } = require('../utils/logger');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/settings
 * Get current user settings
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user-specific settings, or create default if not exists
    let settings = await db.get('SELECT * FROM settings WHERE user_id = ?', [userId]);

    if (!settings) {
      // Create default settings for user
      await db.run(`
        INSERT INTO settings (image_style, difficulty, dice_animations, user_id)
        VALUES ('fantasy art', 'medium', 1, ?)
      `, [userId]);

      settings = await db.get('SELECT * FROM settings WHERE user_id = ?', [userId]);
    }

    res.json({
      imageStyle: settings.image_style,
      difficulty: settings.difficulty,
      diceAnimations: Boolean(settings.dice_animations)
    });
  } catch (error) {
    logger.error('Error fetching settings', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch settings',
      details: error.message
    });
  }
});

/**
 * PUT /api/settings
 * Update user settings
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageStyle, difficulty, diceAnimations } = req.body;

    // Whitelist of allowed fields to prevent SQL injection
    const allowedFields = {
      imageStyle: 'image_style',
      difficulty: 'difficulty',
      diceAnimations: 'dice_animations'
    };

    // Build update query with only allowed fields
    const updates = [];
    const values = [];

    if (imageStyle !== undefined) {
      updates.push(`${allowedFields.imageStyle} = ?`);
      values.push(imageStyle);
    }

    if (difficulty !== undefined) {
      updates.push(`${allowedFields.difficulty} = ?`);
      values.push(difficulty);
    }

    if (diceAnimations !== undefined) {
      updates.push(`${allowedFields.diceAnimations} = ?`);
      values.push(diceAnimations ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid settings to update' });
    }

    // Check if user has settings record
    let settings = await db.get('SELECT id FROM settings WHERE user_id = ?', [userId]);

    if (!settings) {
      // Create settings record first
      await db.run(`
        INSERT INTO settings (image_style, difficulty, dice_animations, user_id)
        VALUES ('fantasy art', 'medium', 1, ?)
      `, [userId]);
    }

    values.push(userId);

    await db.run(`
      UPDATE settings
      SET ${updates.join(', ')}
      WHERE user_id = ?
    `, values);

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    logger.error('Error updating settings', { error: error.message });
    res.status(500).json({
      error: 'Failed to update settings',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/test
 * Test AI service connections
 */
router.get('/ai/test', async (req, res) => {
  try {
    // Test Groq connection
    const groqConnected = await groqService.testConnection();

    // Test Pollinations.ai connection
    const imageConnected = await imageService.testConnection();

    res.json({
      groq: {
        connected: groqConnected,
        model: process.env.GROQ_MODEL
      },
      pollinations: {
        connected: imageConnected
      },
      overall: groqConnected && imageConnected ? 'All systems operational' : 'Some services unavailable'
    });
  } catch (error) {
    logger.error('Error testing AI connections', { error: error.message });
    res.status(500).json({
      error: 'Failed to test AI connections',
      details: error.message
    });
  }
});

module.exports = router;
