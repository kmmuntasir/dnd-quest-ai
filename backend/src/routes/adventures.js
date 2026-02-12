const express = require('express');
const router = express.Router();
const db = require('../config/database');
const groqService = require('../services/groqService');
const imageService = require('../services/imageService');
const { aiLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { checkOwnership } = require('../middleware/ownership');
const { logger } = require('../utils/logger');
const {
  generateCharacterNameSchema,
  generateContextSchema,
  generateAdventureSchema,
  adventureIdSchema
} = require('../validations/adventure.schema');

/**
 * POST /api/adventures/generate-character-name
 * Generate AI character name
 */
router.post('/generate-character-name', aiLimiter, validate(generateCharacterNameSchema), async (req, res) => {
  try {
    const { characterClass } = req.body;

    logger.info('Generating character name', { characterClass });
    const name = await groqService.generateCharacterName({ characterClass });

    res.json({ name });
  } catch (error) {
    logger.error('Error generating character name', { error: error.message });
    res.status(500).json({
      error: 'Failed to generate character name',
      details: error.message
    });
  }
});

/**
 * POST /api/adventures/generate-context
 * Generate AI context suggestion for story
 */
router.post('/generate-context', aiLimiter, validate(generateContextSchema), async (req, res) => {
  try {
    const { theme, tone, difficulty } = req.body;

    logger.info('Generating story context', { theme, tone, difficulty });
    const context = await groqService.generateContext({ theme, tone, difficulty });

    res.json({ context });
  } catch (error) {
    logger.error('Error generating context', { error: error.message });
    res.status(500).json({
      error: 'Failed to generate context',
      details: error.message
    });
  }
});

/**
 * POST /api/adventures/generate
 * Generate a new adventure
 */
router.post('/generate', requireAuth, aiLimiter, validate(generateAdventureSchema), async (req, res) => {
  try {
    const { theme, tone, difficulty, length, context } = req.body;
    const userId = req.user.id;

    // Generate adventure using Groq
    logger.info('Generating adventure', { theme, tone, difficulty, length });
    const adventure = await groqService.generateAdventure({
      theme,
      tone,
      difficulty,
      length: length || 'standard',
      context
    });

    logger.info('Adventure generated. Generating images...');

    // Validate that we have enough scenes
    const sceneCount = adventure.scenes?.length || 0;
    if (sceneCount < 2) {
      logger.warn(`Only ${sceneCount} scenes generated`);
    } else {
      logger.info(`Generated ${sceneCount} scenes for adventure`);
    }
    const scenesWithImages = await imageService.generateSceneImages(
      adventure.scenes,
      'fantasy art'
    );

    // Generate NPC portraits
    const npcsWithImages = await Promise.all(
      adventure.npcs.map(async (npc) => {
        const { hash, url } = await imageService.generateNPCPortrait(npc, 'fantasy art');
        return {
          ...npc,
          image_url: url,
          portrait_hash: hash
        };
      })
    );

    // Insert adventure, scenes, and NPCs in a transaction for data integrity
    const adventureId = await db.transaction(async (txn) => {
      // Insert adventure into database
      const adventureResult = await txn.run(`
        INSERT INTO adventures (title, description, setting, quest, difficulty, user_id, generated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [adventure.title, adventure.description, adventure.setting, adventure.quest, difficulty, userId]);

      const newAdventureId = adventureResult.lastID;

      // Insert scenes with image_hash
      for (let i = 0; i < scenesWithImages.length; i++) {
        const scene = scenesWithImages[i];
        await txn.run(`
          INSERT INTO scenes (adventure_id, scene_order, description, image_url, image_hash, choices, is_key_scene)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          newAdventureId,
          i,
          scene.description,
          scene.image_url,
          scene.image_hash,
          JSON.stringify(scene.choices),
          scene.isKeyScene ? 1 : 0
        ]);
      }

      // Insert NPCs with portrait_hash
      for (const npc of npcsWithImages) {
        await txn.run(`
          INSERT INTO npcs (adventure_id, name, description, role, image_url, portrait_hash)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [newAdventureId, npc.name, npc.description, npc.role, npc.image_url, npc.portrait_hash]);
      }

      return newAdventureId;
    });

    logger.info('Adventure saved', { adventureId });

    res.json({
      adventureId,
      title: adventure.title,
      description: adventure.description,
      setting: adventure.setting,
      quest: adventure.quest,
      difficulty,
      scenes: scenesWithImages.map((s, i) => ({
        id: i + 1,
        ...s
      })),
      npcs: npcsWithImages
    });
  } catch (error) {
    logger.error('Error generating adventure', { error: error.message });
    res.status(500).json({
      error: 'Failed to generate adventure',
      details: error.message
    });
  }
});

/**
 * GET /api/adventures/:id
 * Get adventure details by ID
 */
router.get('/:id', validate(adventureIdSchema, 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get adventure
    const adventure = await db.get('SELECT * FROM adventures WHERE id = ?', [id]);

    if (!adventure) {
      return res.status(404).json({ error: 'Adventure not found' });
    }

    // Get scenes
    const scenes = await db.all('SELECT * FROM scenes WHERE adventure_id = ? ORDER BY scene_order', [id]);

    // Parse choices from JSON
    const scenesWithParsedChoices = scenes.map(scene => ({
      ...scene,
      choices: JSON.parse(scene.choices),
      is_key_scene: Boolean(scene.is_key_scene)
    }));

    // Get NPCs
    const npcs = await db.all('SELECT * FROM npcs WHERE adventure_id = ?', [id]);

    res.json({
      ...adventure,
      scenes: scenesWithParsedChoices,
      npcs
    });
  } catch (error) {
    logger.error('Error fetching adventure', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch adventure',
      details: error.message
    });
  }
});

/**
 * GET /api/adventures
 * List all adventures (only user's own adventures if authenticated)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    let adventures;

    if (req.user) {
      // Authenticated user - only show their adventures
      adventures = await db.all(
        'SELECT id, title, description, difficulty, generated_at FROM adventures WHERE user_id = ? ORDER BY generated_at DESC',
        [req.user.id]
      );
    } else {
      // No auth - show all adventures (for backward compatibility with public browsing)
      adventures = await db.all('SELECT id, title, description, difficulty, generated_at FROM adventures ORDER BY generated_at DESC');
    }

    res.json(adventures);
  } catch (error) {
    logger.error('Error fetching adventures', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch adventures',
      details: error.message
    });
  }
});

/**
 * DELETE /api/adventures/:id
 * Delete an adventure and all associated data (scenes, NPCs, saved games, cached images)
 */
router.delete('/:id', requireAuth, checkOwnership('adventure'), validate(adventureIdSchema, 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    // Adventure existence and ownership already verified by middleware
    logger.info('Deleting adventure', { adventureId: id, userId: req.user.id });

    // Delete cached images first (before deleting database records)
    await imageService.deleteAdventureImages(id);

    // Delete saved games
    await db.run('DELETE FROM saved_games WHERE adventure_id = ?', [id]);

    // Delete scenes
    await db.run('DELETE FROM scenes WHERE adventure_id = ?', [id]);

    // Delete NPCs
    await db.run('DELETE FROM npcs WHERE adventure_id = ?', [id]);

    // Delete adventure
    await db.run('DELETE FROM adventures WHERE id = ?', [id]);

    logger.info('Adventure deleted successfully', { adventureId: id });

    res.json({ success: true, message: 'Adventure deleted successfully' });
  } catch (error) {
    logger.error('Error deleting adventure', { error: error.message });
    res.status(500).json({
      error: 'Failed to delete adventure',
      details: error.message
    });
  }
});

module.exports = router;
