const express = require('express');
const router = express.Router();
const db = require('../config/database');
const groqService = require('../services/groqService');
const imageService = require('../services/imageService');
const { aiLimiter } = require('../middleware/rateLimiter');
const { validate, validateAll } = require('../middleware/validate');
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
router.post('/generate', aiLimiter, validate(generateAdventureSchema), async (req, res) => {
  try {
    const { theme, tone, difficulty, length, context } = req.body;

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

    // Insert adventure into database
    const adventureResult = db.prepare(`
      INSERT INTO adventures (title, description, setting, quest, difficulty, generated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      adventure.title,
      adventure.description,
      adventure.setting,
      adventure.quest,
      difficulty
    );

    const adventureId = adventureResult.lastInsertRowid;

    // Insert scenes with image_hash
    const sceneStmt = db.prepare(`
      INSERT INTO scenes (adventure_id, scene_order, description, image_url, image_hash, choices, is_key_scene)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const scene of scenesWithImages) {
      sceneStmt.run(
        adventureId,
        scenesWithImages.indexOf(scene),
        scene.description,
        scene.image_url,
        scene.image_hash,
        JSON.stringify(scene.choices),
        scene.isKeyScene ? 1 : 0
      );
    }

    // Insert NPCs with portrait_hash
    const npcStmt = db.prepare(`
      INSERT INTO npcs (adventure_id, name, description, role, image_url, portrait_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const npc of npcsWithImages) {
      npcStmt.run(
        adventureId,
        npc.name,
        npc.description,
        npc.role,
        npc.image_url,
        npc.portrait_hash
      );
    }

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
router.get('/:id', validate(adventureIdSchema, 'params'), (req, res) => {
  try {
    const { id } = req.params;

    // Get adventure
    const adventure = db.prepare('SELECT * FROM adventures WHERE id = ?').get(id);

    if (!adventure) {
      return res.status(404).json({ error: 'Adventure not found' });
    }

    // Get scenes
    const scenes = db.prepare('SELECT * FROM scenes WHERE adventure_id = ? ORDER BY scene_order').all(id);

    // Parse choices from JSON
    const scenesWithParsedChoices = scenes.map(scene => ({
      ...scene,
      choices: JSON.parse(scene.choices),
      is_key_scene: Boolean(scene.is_key_scene)
    }));

    // Get NPCs
    const npcs = db.prepare('SELECT * FROM npcs WHERE adventure_id = ?').all(id);

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
 * List all adventures
 */
router.get('/', (req, res) => {
  try {
    const adventures = db.prepare('SELECT id, title, description, difficulty, generated_at FROM adventures ORDER BY generated_at DESC').all();

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
router.delete('/:id', validate(adventureIdSchema, 'params'), (req, res) => {
  try {
    const { id } = req.params;

    // Check if adventure exists
    const adventure = db.prepare('SELECT id FROM adventures WHERE id = ?').get(id);

    if (!adventure) {
      return res.status(404).json({ error: 'Adventure not found' });
    }

    logger.info('Deleting adventure', { adventureId: id });

    // Delete cached images first (before deleting database records)
    imageService.deleteAdventureImages(id);

    // Delete saved games
    db.prepare('DELETE FROM saved_games WHERE adventure_id = ?').run(id);

    // Delete scenes
    db.prepare('DELETE FROM scenes WHERE adventure_id = ?').run(id);

    // Delete NPCs
    db.prepare('DELETE FROM npcs WHERE adventure_id = ?').run(id);

    // Delete adventure
    db.prepare('DELETE FROM adventures WHERE id = ?').run(id);

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
