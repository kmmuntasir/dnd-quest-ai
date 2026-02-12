const express = require('express');
const router = express.Router();
const db = require('../config/database');
const groqService = require('../services/groqService');
const { aiLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const { logger } = require('../utils/logger');
const {
  startGameSchema,
  gameIdSchema,
  choiceSchema,
  validClasses
} = require('../validations/game.schema');

/**
 * Roll 3d6 for character stats
 * @returns {number} Sum of 3 dice rolls
 */
function rollStat() {
  return Math.floor(Math.random() * 6) + 1 +
         Math.floor(Math.random() * 6) + 1 +
         Math.floor(Math.random() * 6) + 1;
}

/**
 * Calculate starting HP based on class
 * @param {string} characterClass - Character class
 * @param {number} constitution - CON stat modifier
 * @returns {number} Starting HP
 */
function calculateStartingHP(characterClass, constitution) {
  const conMod = Math.floor((constitution - 10) / 2);
  const baseHP = {
    'Fighter': 10,
    'Wizard': 6,
    'Rogue': 8,
    'Cleric': 8,
    'Ranger': 10
  };

  return (baseHP[characterClass] || 8) + conMod;
}

/**
 * POST /api/games/start
 * Start a new game
 */
router.post('/start', validate(startGameSchema), async (req, res) => {
  try {
    const { adventureId, characterName, characterClass } = req.body;
    const userId = req.user?.id || null;

    // Check if adventure exists
    const adventure = await db.get('SELECT * FROM adventures WHERE id = ?', [adventureId]);
    if (!adventure) {
      return res.status(404).json({ error: 'Adventure not found' });
    }

    // Generate character stats
    const stats = {
      STR: rollStat(),
      DEX: rollStat(),
      INT: rollStat(),
      WIS: rollStat(),
      CON: rollStat(),
      CHA: rollStat()
    };

    // Calculate starting HP
    const hp = calculateStartingHP(characterClass, stats.CON);

    // Get first scene
    const firstScene = await db.get('SELECT * FROM scenes WHERE adventure_id = ? ORDER BY scene_order LIMIT 1', [adventureId]);

    if (!firstScene) {
      return res.status(400).json({ error: 'Adventure has no scenes' });
    }

    // Parse choices
    const sceneWithChoices = {
      ...firstScene,
      choices: JSON.parse(firstScene.choices),
      is_key_scene: Boolean(firstScene.is_key_scene)
    };

    // Create saved game
    const result = await db.run(`
      INSERT INTO saved_games (
        adventure_id, user_id, character_name, character_class, stats, hp,
        inventory, gold, current_scene_id, game_history
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      adventureId,
      userId,
      characterName,
      characterClass,
      JSON.stringify(stats),
      hp,
      JSON.stringify([]),
      0,
      firstScene.id,
      JSON.stringify([])
    ]);

    const gameId = result.lastID;

    logger.info('Game started', { gameId, adventureId, characterName, characterClass });

    res.json({
      gameId,
      character: {
        name: characterName,
        class: characterClass,
        stats,
        hp,
        maxHp: hp,
        inventory: [],
        gold: 0
      },
      scene: sceneWithChoices,
      adventure: {
        id: adventureId,
        title: adventure.title,
        description: adventure.description
      }
    });
  } catch (error) {
    logger.error('Error starting game', { error: error.message });
    res.status(500).json({
      error: 'Failed to start game',
      details: error.message
    });
  }
});

/**
 * GET /api/games/:id
 * Get current game state
 */
router.get('/:id', validate(gameIdSchema, 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get saved game
    const savedGame = await db.get('SELECT * FROM saved_games WHERE id = ?', [id]);

    if (!savedGame) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get current scene
    const scene = await db.get('SELECT * FROM scenes WHERE id = ?', [savedGame.current_scene_id]);

    if (!scene) {
      return res.status(404).json({ error: 'Current scene not found' });
    }

    // Get adventure info
    const adventure = await db.get('SELECT id, title, description FROM adventures WHERE id = ?', [savedGame.adventure_id]);

    // Parse data
    const sceneWithChoices = {
      ...scene,
      choices: JSON.parse(scene.choices),
      is_key_scene: Boolean(scene.is_key_scene)
    };

    res.json({
      gameId: savedGame.id,
      character: {
        name: savedGame.character_name,
        class: savedGame.character_class,
        stats: JSON.parse(savedGame.stats),
        hp: savedGame.hp,
        inventory: JSON.parse(savedGame.inventory),
        gold: savedGame.gold
      },
      scene: sceneWithChoices,
      gameHistory: JSON.parse(savedGame.game_history),
      adventure,
      lastPlayed: savedGame.last_played
    });
  } catch (error) {
    logger.error('Error fetching game', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch game',
      details: error.message
    });
  }
});

/**
 * POST /api/games/:id/choice
 * Submit player choice
 */
router.post('/:id/choice', validate(gameIdSchema, 'params'), validate(choiceSchema), aiLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { choiceIndex, diceRoll } = req.body;

    // Get saved game
    const savedGame = await db.get('SELECT * FROM saved_games WHERE id = ?', [id]);

    if (!savedGame) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get current scene
    const scene = await db.get('SELECT * FROM scenes WHERE id = ?', [savedGame.current_scene_id]);

    if (!scene) {
      return res.status(404).json({ error: 'Current scene not found' });
    }

    // Validate choice index
    const choices = JSON.parse(scene.choices);
    if (choiceIndex < 0 || choiceIndex >= choices.length) {
      return res.status(400).json({ error: 'Invalid choice index' });
    }

    const playerChoice = choices[choiceIndex];
    const stats = JSON.parse(savedGame.stats);

    // Generate scene response using Groq
    logger.info('Generating scene response', { gameId: id });
    const response = await groqService.generateSceneResponse({
      playerChoice,
      diceRoll,
      stats,
      sceneContext: scene.description
    });

    // Update character state
    let updatedStats = { ...stats };
    let updatedHP = savedGame.hp;
    let updatedGold = savedGame.gold;
    let updatedInventory = JSON.parse(savedGame.inventory);

    if (response.statChange) {
      updatedHP += response.statChange.hp || 0;
      updatedGold += response.statChange.gold || 0;

      // Character is dead
      if (updatedHP <= 0) {
        // Update game as complete (death)
        await db.run(`
          UPDATE saved_games
          SET game_history = ?, last_played = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          JSON.stringify([
            ...JSON.parse(savedGame.game_history),
            { choice: playerChoice, roll: diceRoll, outcome: response.outcome, died: true }
          ]),
          id
        ]);

        return res.json({
          narrative: response.narrative,
          outcome: response.outcome,
          gameOver: true,
          victory: false,
          finalHP: updatedHP,
          finalGold: updatedGold
        });
      }
    }

    // Add new item if awarded
    if (response.newItem) {
      updatedInventory.push(response.newItem);
    }

    // Store previous state for "go back" feature (save current state before progressing)
    const previousState = {
      scene_id: savedGame.current_scene_id,
      hp: savedGame.hp,
      gold: savedGame.gold,
      inventory: JSON.parse(savedGame.inventory),
      stats: JSON.parse(savedGame.stats)
    };

    // Update game history with previous state
    const gameHistory = JSON.parse(savedGame.game_history);
    gameHistory.push({
      choice: playerChoice,
      roll: diceRoll,
      outcome: response.outcome,
      stats: updatedStats,
      previousState: previousState
    });

    // Get next scene (by scene_order)
    const nextScene = await db.get(`
      SELECT * FROM scenes
      WHERE adventure_id = ? AND scene_order > ?
      ORDER BY scene_order ASC
      LIMIT 1
    `, [savedGame.adventure_id, scene.scene_order]);

    let nextSceneData = null;
    let isGameOver = false;
    let isVictory = false;

    if (nextScene) {
      // Progress to next scene
      await db.run(`
        UPDATE saved_games
        SET stats = ?, hp = ?, gold = ?, inventory = ?, current_scene_id = ?, game_history = ?, last_played = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        JSON.stringify(updatedStats),
        updatedHP,
        updatedGold,
        JSON.stringify(updatedInventory),
        nextScene.id,
        JSON.stringify(gameHistory),
        id
      ]);

      nextSceneData = {
        ...nextScene,
        choices: JSON.parse(nextScene.choices),
        is_key_scene: Boolean(nextScene.is_key_scene)
      };
    } else {
      // No more scenes - victory!
      isVictory = true;
      isGameOver = true;

      await db.run(`
        UPDATE saved_games
        SET stats = ?, hp = ?, gold = ?, inventory = ?, game_history = ?, last_played = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        JSON.stringify(updatedStats),
        updatedHP,
        updatedGold,
        JSON.stringify(updatedInventory),
        JSON.stringify(gameHistory),
        id
      ]);
    }

    res.json({
      narrative: response.narrative,
      outcome: response.outcome,
      character: {
        stats: updatedStats,
        hp: updatedHP,
        gold: updatedGold,
        inventory: updatedInventory,
        newItem: response.newItem
      },
      nextScene: nextSceneData,
      gameOver: isGameOver,
      victory: isVictory
    });
  } catch (error) {
    logger.error('Error submitting choice', { error: error.message });
    res.status(500).json({
      error: 'Failed to submit choice',
      details: error.message
    });
  }
});

/**
 * POST /api/games/:id/go-back
 * Go back to previous scene (not available in hard mode)
 */
router.post('/:id/go-back', validate(gameIdSchema, 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get saved game
    const savedGame = await db.get('SELECT * FROM saved_games WHERE id = ?', [id]);

    if (!savedGame) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get adventure to check difficulty
    const adventure = await db.get('SELECT difficulty FROM adventures WHERE id = ?', [savedGame.adventure_id]);

    if (!adventure) {
      return res.status(404).json({ error: 'Adventure not found' });
    }

    // Check if hard mode - no going back!
    if (adventure.difficulty === 'hard') {
      return res.status(400).json({ error: 'Cannot go back in Hard mode. Your choices are permanent!' });
    }

    // Get game history
    const gameHistory = JSON.parse(savedGame.game_history);

    // Need at least one choice to go back
    if (gameHistory.length === 0) {
      return res.status(400).json({ error: 'No previous scene to go back to' });
    }

    // Get the last history entry which contains the previous state
    const lastEntry = gameHistory[gameHistory.length - 1];

    if (!lastEntry.previousState) {
      return res.status(400).json({ error: 'No previous state saved' });
    }

    const previousState = lastEntry.previousState;

    // Remove the last entry from history
    gameHistory.pop();

    // Restore previous state
    await db.run(`
      UPDATE saved_games
      SET stats = ?, hp = ?, gold = ?, inventory = ?, current_scene_id = ?, game_history = ?, last_played = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      JSON.stringify(previousState.stats),
      previousState.hp,
      previousState.gold,
      JSON.stringify(previousState.inventory),
      previousState.scene_id,
      JSON.stringify(gameHistory),
      id
    ]);

    // Get the previous scene
    const previousScene = await db.get('SELECT * FROM scenes WHERE id = ?', [previousState.scene_id]);

    const sceneData = {
      ...previousScene,
      choices: JSON.parse(previousScene.choices),
      is_key_scene: Boolean(previousScene.is_key_scene)
    };

    res.json({
      success: true,
      message: 'Went back to previous scene',
      scene: sceneData,
      character: {
        hp: previousState.hp,
        gold: previousState.gold,
        inventory: previousState.inventory,
        stats: previousState.stats
      }
    });
  } catch (error) {
    logger.error('Error going back', { error: error.message });
    res.status(500).json({
      error: 'Failed to go back',
      details: error.message
    });
  }
});

/**
 * POST /api/games/:id/save
 * Manual save
 */
router.post('/:id/save', validate(gameIdSchema, 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    // Update last played timestamp
    await db.run(`
      UPDATE saved_games
      SET last_played = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    res.json({ success: true, message: 'Game saved successfully' });
  } catch (error) {
    logger.error('Error saving game', { error: error.message });
    res.status(500).json({
      error: 'Failed to save game',
      details: error.message
    });
  }
});

/**
 * POST /api/games/:id/restart
 * Restart game with same character (reset to first scene, restore HP)
 */
router.post('/:id/restart', validate(gameIdSchema, 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get current game
    const savedGame = await db.get('SELECT * FROM saved_games WHERE id = ?', [id]);
    if (!savedGame) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get first scene of the adventure
    const firstScene = await db.get(`
      SELECT * FROM scenes
      WHERE adventure_id = ?
      ORDER BY scene_order
      LIMIT 1
    `, [savedGame.adventure_id]);

    if (!firstScene) {
      return res.status(400).json({ error: 'Adventure has no scenes' });
    }

    // Calculate max HP from class and CON
    const stats = JSON.parse(savedGame.stats);
    const maxHp = calculateStartingHP(savedGame.character_class, stats.CON);

    // Reset game to first scene, restore HP, clear history
    await db.run(`
      UPDATE saved_games
      SET current_scene_id = ?,
          hp = ?,
          gold = 0,
          inventory = '[]',
          game_history = '[]',
          last_played = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [firstScene.id, maxHp, id]);

    logger.info('Game restarted', { gameId: id });

    res.json({
      success: true,
      message: 'Game restarted successfully',
      scene: {
        ...firstScene,
        choices: JSON.parse(firstScene.choices),
        is_key_scene: Boolean(firstScene.is_key_scene)
      },
      character: {
        hp: maxHp,
        gold: 0,
        inventory: []
      }
    });
  } catch (error) {
    logger.error('Error restarting game', { error: error.message });
    res.status(500).json({
      error: 'Failed to restart game',
      details: error.message
    });
  }
});

module.exports = router;
