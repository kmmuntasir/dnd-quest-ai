const express = require('express');
const router = express.Router();
const db = require('../config/database');
const groqService = require('../services/groqService');
const imageService = require('../services/imageService');

/**
 * POST /api/adventures/generate
 * Generate a new adventure
 */
router.post('/generate', async (req, res) => {
  try {
    const { theme, tone, difficulty, context } = req.body;

    // Validate input
    if (!theme || !tone || !difficulty) {
      return res.status(400).json({
        error: 'Missing required fields: theme, tone, difficulty'
      });
    }

    // Validate difficulty
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        error: 'Invalid difficulty. Must be: easy, medium, or hard'
      });
    }

    // Generate adventure using Groq
    console.log('Generating adventure with Groq...');
    const adventure = await groqService.generateAdventure({
      theme,
      tone,
      difficulty,
      context
    });

    console.log('Adventure generated. Generating images...');

    // Generate images for scenes
    const scenesWithImages = await imageService.generateSceneImages(
      adventure.scenes,
      'fantasy art'
    );

    // Generate NPC portraits
    const npcsWithImages = await Promise.all(
      adventure.npcs.map(async (npc) => ({
        ...npc,
        image_url: await imageService.generateNPCPortrait(npc, 'fantasy art')
      }))
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

    // Insert scenes
    const sceneStmt = db.prepare(`
      INSERT INTO scenes (adventure_id, scene_order, description, image_url, choices, is_key_scene)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const scene of scenesWithImages) {
      sceneStmt.run(
        adventureId,
        scenesWithImages.indexOf(scene),
        scene.description,
        scene.image_url,
        JSON.stringify(scene.choices),
        scene.isKeyScene ? 1 : 0
      );
    }

    // Insert NPCs
    const npcStmt = db.prepare(`
      INSERT INTO npcs (adventure_id, name, description, role, image_url)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const npc of npcsWithImages) {
      npcStmt.run(
        adventureId,
        npc.name,
        npc.description,
        npc.role,
        npc.image_url
      );
    }

    console.log('Adventure saved with ID:', adventureId);

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
    console.error('Error generating adventure:', error);
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
router.get('/:id', (req, res) => {
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
    console.error('Error fetching adventure:', error);
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
    console.error('Error fetching adventures:', error);
    res.status(500).json({
      error: 'Failed to fetch adventures',
      details: error.message
    });
  }
});

module.exports = router;
