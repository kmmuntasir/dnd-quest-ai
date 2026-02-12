const express = require('express');
const router = express.Router();
const db = require('../config/database');
const groqService = require('../services/groqService');
const imageService = require('../services/imageService');
const { logger } = require('../utils/logger');

/**
 * GET /api/settings
 * Get current user settings
 */
router.get('/', async (req, res) => {
  try {
    const settings = await db.get('SELECT * FROM settings WHERE id = 1');

    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
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
router.put('/', async (req, res) => {
  try {
    const { imageStyle, difficulty, diceAnimations } = req.body;

    // Build update query with only provided fields
    const updates = [];
    const values = [];

    if (imageStyle !== undefined) {
      updates.push('image_style = ?');
      values.push(imageStyle);
    }

    if (difficulty !== undefined) {
      updates.push('difficulty = ?');
      values.push(difficulty);
    }

    if (diceAnimations !== undefined) {
      updates.push('dice_animations = ?');
      values.push(diceAnimations ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No settings to update' });
    }

    values.push(1); // for WHERE id = 1

    await db.run(`
      UPDATE settings
      SET ${updates.join(', ')}
      WHERE id = ?
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
