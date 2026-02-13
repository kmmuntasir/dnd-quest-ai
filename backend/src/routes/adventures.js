const express = require('express');
const router = express.Router();
const db = require('../config/database');
const groqService = require('../services/groqService');
const imageService = require('../services/imageService');
const { imageQueue } = require('../queue/imageQueue');
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
 *
 * Flow:
 * 1. Generate story using Groq (sync, ~10s)
 * 2. Create adventure with status='pending'
 * 3. Queue image generation jobs (background)
 * 4. Return adventure immediately
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

    // Validate that we have enough scenes
    const sceneCount = adventure.scenes?.length || 0;
    if (sceneCount < 2) {
      logger.warn(`Only ${sceneCount} scenes generated`);
    } else {
      logger.info(`Generated ${sceneCount} scenes for adventure`);
    }

    // Calculate total images needed
    const totalImages = sceneCount + (adventure.npcs?.length || 0);

    // Generate image hashes (without fetching images)
    const scenesWithHashes = adventure.scenes.map(scene => {
      const hash = imageService.generateImageHash();
      return {
        ...scene,
        image_hash: hash,
        image_url: `/api/images/${hash}`
      };
    });

    const npcsWithHashes = adventure.npcs.map(npc => {
      const hash = imageService.generateImageHash();
      return {
        ...npc,
        portrait_hash: hash,
        image_url: `/api/images/${hash}`
      };
    });

    // Insert adventure, scenes, and NPCs in a transaction
    const adventureId = await db.transaction(async (txn) => {
      // Insert adventure with status='pending' (or 'ready' if no images)
      const adventureResult = await txn.run(`
        INSERT INTO adventures (title, description, setting, quest, difficulty, user_id, generated_at, status, images_total, images_ready, images_failed)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, 0, 0)
      `, [
        adventure.title,
        adventure.description,
        adventure.setting,
        adventure.quest,
        difficulty,
        userId,
        totalImages > 0 ? 'pending' : 'ready',
        totalImages
      ]);

      const newAdventureId = adventureResult.lastID;

      // Insert scenes with image_hash
      for (let i = 0; i < scenesWithHashes.length; i++) {
        const scene = scenesWithHashes[i];
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

        // Insert image metadata with pending status
        await txn.run(`
          INSERT INTO images (hash, prompt, pollinations_url, width, height, status, provider)
          VALUES (?, ?, '', 1024, 1024, 'pending', 'queued')
        `, [scene.image_hash, scene.imagePrompt]);
      }

      // Insert NPCs with portrait_hash
      for (const npc of npcsWithHashes) {
        await txn.run(`
          INSERT INTO npcs (adventure_id, name, description, role, image_url, portrait_hash)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [newAdventureId, npc.name, npc.description, npc.role, npc.image_url, npc.portrait_hash]);

        // Insert image metadata with pending status
        const portraitPrompt = `Portrait of ${npc.name}, ${npc.description}, ${npc.role}, character design, fantasy art style`;
        await txn.run(`
          INSERT INTO images (hash, prompt, pollinations_url, width, height, status, provider)
          VALUES (?, ?, '', 512, 512, 'pending', 'queued')
        `, [npc.portrait_hash, portraitPrompt]);
      }

      return newAdventureId;
    });

    logger.info('Adventure saved, queueing image generation', { adventureId, totalImages });

    // Queue image generation jobs
    const imageJobs = [];

    for (let i = 0; i < scenesWithHashes.length; i++) {
      const scene = scenesWithHashes[i];
      imageJobs.push({
        hash: scene.image_hash,
        prompt: scene.imagePrompt,
        type: 'scene',
        adventureId,
        entityId: i + 1, // scene order (will be scene_id after insert)
        options: { style: 'fantasy art', width: 1024, height: 1024 }
      });
    }

    for (let i = 0; i < npcsWithHashes.length; i++) {
      const npc = npcsWithHashes[i];
      const portraitPrompt = `Portrait of ${npc.name}, ${npc.description}, ${npc.role}, character design, fantasy art style`;
      imageJobs.push({
        hash: npc.portrait_hash,
        prompt: portraitPrompt,
        type: 'npc',
        adventureId,
        entityId: i + 1,
        options: { style: 'fantasy art', width: 512, height: 512 }
      });
    }

    // Add all jobs to the queue
    if (imageJobs.length > 0) {
      imageQueue.addJobs(imageJobs);
    }

    res.json({
      adventureId,
      title: adventure.title,
      description: adventure.description,
      setting: adventure.setting,
      quest: adventure.quest,
      difficulty,
      status: totalImages > 0 ? 'pending' : 'ready',
      imagesTotal: totalImages,
      imagesReady: 0,
      scenes: scenesWithHashes.map((s, i) => ({
        id: i + 1,
        description: s.description,
        choices: s.choices,
        isKeyScene: s.isKeyScene,
        image_url: s.image_url
      })),
      npcs: npcsWithHashes.map(n => ({
        name: n.name,
        description: n.description,
        role: n.role,
        image_url: n.image_url
      }))
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

    // Get image status for all images
    const imageHashes = [
      ...scenes.map(s => s.image_hash).filter(Boolean),
      ...npcs.map(n => n.portrait_hash).filter(Boolean)
    ];

    let imageStatuses = {};
    if (imageHashes.length > 0) {
      const placeholders = imageHashes.map(() => '?').join(',');
      const images = await db.all(
        `SELECT hash, status FROM images WHERE hash IN (${placeholders})`,
        imageHashes
      );
      imageStatuses = Object.fromEntries(images.map(img => [img.hash, img.status]));
    }

    // Add image status to scenes and NPCs
    const scenesWithImageStatus = scenesWithParsedChoices.map(scene => ({
      ...scene,
      image_status: scene.image_hash ? (imageStatuses[scene.image_hash] || 'unknown') : null
    }));

    const npcsWithImageStatus = npcs.map(npc => ({
      ...npc,
      image_status: npc.portrait_hash ? (imageStatuses[npc.portrait_hash] || 'unknown') : null
    }));

    res.json({
      ...adventure,
      scenes: scenesWithImageStatus,
      npcs: npcsWithImageStatus
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
 * GET /api/adventures/:id/status
 * Get adventure image generation status
 */
router.get('/:id/status', validate(adventureIdSchema, 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get adventure status
    const adventure = await db.get(`
      SELECT id, status, images_total, images_ready, images_failed
      FROM adventures WHERE id = ?
    `, [id]);

    if (!adventure) {
      return res.status(404).json({ error: 'Adventure not found' });
    }

    // Also get queue progress for real-time updates
    const queueProgress = imageQueue.getAdventureProgress(parseInt(id));

    // Get detailed image status
    const images = await db.all(`
      SELECT i.hash, i.status, i.provider, s.scene_order, n.name as npc_name
      FROM images i
      LEFT JOIN scenes s ON s.image_hash = i.hash AND s.adventure_id = ?
      LEFT JOIN npcs n ON n.portrait_hash = i.hash AND n.adventure_id = ?
      WHERE i.hash IN (
        SELECT image_hash FROM scenes WHERE adventure_id = ? AND image_hash IS NOT NULL
        UNION
        SELECT portrait_hash FROM npcs WHERE adventure_id = ? AND portrait_hash IS NOT NULL
      )
    `, [id, id, id, id]);

    res.json({
      adventureId: parseInt(id),
      status: adventure.status,
      total: adventure.images_total,
      ready: adventure.images_ready,
      failed: adventure.images_failed,
      pending: (adventure.images_total || 0) - (adventure.images_ready || 0) - (adventure.images_failed || 0),
      progress: adventure.images_total > 0
        ? Math.round((adventure.images_ready / adventure.images_total) * 100)
        : 100,
      queue: queueProgress,
      images: images.map(img => ({
        hash: img.hash,
        status: img.status,
        provider: img.provider,
        type: img.npc_name ? 'npc' : 'scene',
        name: img.npc_name || `Scene ${img.scene_order + 1}`
      }))
    });
  } catch (error) {
    logger.error('Error fetching adventure status', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch adventure status',
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

/**
 * POST /api/adventures/:id/repair-images
 * Re-queue pending images for legacy adventures
 * This is useful for adventures created before the queue system
 */
router.post('/:id/repair-images', requireAuth, checkOwnership('adventure'), validate(adventureIdSchema, 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get adventure
    const adventure = await db.get('SELECT * FROM adventures WHERE id = ?', [id]);
    if (!adventure) {
      return res.status(404).json({ error: 'Adventure not found' });
    }

    // Get all scenes and NPCs with their image hashes
    const scenes = await db.all('SELECT id, image_hash, description FROM scenes WHERE adventure_id = ?', [id]);
    const npcs = await db.all('SELECT id, portrait_hash, name, description, role FROM npcs WHERE adventure_id = ?', [id]);

    // Get image metadata for all hashes
    const imageHashes = [
      ...scenes.map(s => s.image_hash).filter(Boolean),
      ...npcs.map(n => n.portrait_hash).filter(Boolean)
    ];

    if (imageHashes.length === 0) {
      return res.json({
        success: true,
        message: 'No images to repair',
        queuedCount: 0
      });
    }

    const placeholders = imageHashes.map(() => '?').join(',');
    const images = await db.all(
      `SELECT hash, status, prompt FROM images WHERE hash IN (${placeholders})`,
      imageHashes
    );

    // Find images that are pending or failed (need re-processing)
    const pendingImages = images.filter(img => img.status === 'pending' || img.status === 'failed');

    if (pendingImages.length === 0) {
      return res.json({
        success: true,
        message: 'All images are already processed or processing',
        queuedCount: 0
      });
    }

    // Update adventure status to pending
    await db.run(`
      UPDATE adventures
      SET status = 'pending',
          images_total = ?,
          images_ready = (SELECT COUNT(*) FROM images WHERE hash IN (${placeholders}) AND status = 'ready'),
          images_failed = 0
      WHERE id = ?
    `, [imageHashes.length, ...imageHashes, id]);

    // Queue jobs for pending/failed images
    const imageJobs = [];

    for (const img of pendingImages) {
      // Determine if it's a scene or NPC image
      const scene = scenes.find(s => s.image_hash === img.hash);
      const npc = npcs.find(n => n.portrait_hash === img.hash);

      let prompt = img.prompt;
      let options = { style: 'fantasy art', width: 1024, height: 1024 };

      if (npc && !prompt) {
        prompt = `Portrait of ${npc.name}, ${npc.description}, ${npc.role}, character design, fantasy art style`;
        options = { style: 'fantasy art', width: 512, height: 512 };
      }

      if (prompt) {
        imageJobs.push({
          hash: img.hash,
          prompt,
          type: npc ? 'npc' : 'scene',
          adventureId: parseInt(id),
          entityId: scene?.id || npc?.id,
          options
        });
      }
    }

    if (imageJobs.length > 0) {
      // Reset circuit breakers before queueing
      const { resetProviderCircuitBreakers } = require('../queue/imageQueue');
      resetProviderCircuitBreakers();

      imageQueue.addJobs(imageJobs);
    }

    logger.info('Repair images requested', {
      adventureId: id,
      totalImages: imageHashes.length,
      queuedCount: imageJobs.length
    });

    res.json({
      success: true,
      message: `Queued ${imageJobs.length} images for generation`,
      totalImages: imageHashes.length,
      queuedCount: imageJobs.length,
      adventureStatus: 'pending'
    });
  } catch (error) {
    logger.error('Error repairing images', { adventureId: req.params.id, error: error.message });
    res.status(500).json({
      error: 'Failed to repair images',
      details: error.message
    });
  }
});

module.exports = router;
