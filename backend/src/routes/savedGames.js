const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { logger } = require('../utils/logger');
const { requireAuth } = require('../middleware/auth');
const { checkOwnership, requireAuthAndFilter, buildUserFilterClause } = require('../middleware/ownership');

/**
 * GET /api/saved-games/adventures
 * List unique adventures that have been played, with game count
 * Only shows adventures with games owned by the authenticated user
 */
router.get('/adventures', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get unique adventures with their game count and most recent play (user's games only)
    const adventures = await db.all(`
      SELECT
        a.id as adventure_id,
        a.title,
        a.description,
        a.difficulty,
        a.setting,
        COUNT(sg.id) as play_count,
        MAX(sg.last_played) as last_played,
        (SELECT s.image_url FROM scenes s WHERE s.adventure_id = a.id ORDER BY s.scene_order LIMIT 1) as cover_image_url,
        (SELECT COUNT(*) FROM scenes s WHERE s.adventure_id = a.id) as total_scenes
      FROM adventures a
      JOIN saved_games sg ON sg.adventure_id = a.id
      WHERE sg.user_id = ?
      GROUP BY a.id
      ORDER BY last_played DESC
    `, [userId]);

    res.json({ data: adventures });
  } catch (error) {
    logger.error('Error fetching adventures', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch adventures',
      details: error.message
    });
  }
});

/**
 * GET /api/saved-games/adventures/:adventureId/games
 * Get all game instances for a specific adventure (user's games only)
 */
router.get('/adventures/:adventureId/games', requireAuth, async (req, res) => {
  try {
    const { adventureId } = req.params;
    const userId = req.user.id;

    const games = await db.all(`
      SELECT
        sg.id,
        sg.character_name,
        sg.character_class,
        sg.hp,
        sg.stats,
        sg.gold,
        sg.inventory,
        sg.created_at,
        sg.last_played,
        sg.current_scene_id,
        current_scene.scene_order as current_scene_order,
        current_scene.image_url as scene_image_url,
        scene_counts.total_scenes
      FROM saved_games sg
      LEFT JOIN scenes current_scene ON current_scene.id = sg.current_scene_id
      LEFT JOIN (
        SELECT adventure_id, COUNT(*) as total_scenes
        FROM scenes
        GROUP BY adventure_id
      ) scene_counts ON scene_counts.adventure_id = sg.adventure_id
      WHERE sg.adventure_id = ? AND sg.user_id = ?
      ORDER BY sg.last_played DESC
    `, [adventureId, userId]);

    // Parse JSON fields and add computed fields
    const gamesWithDetails = games.map(game => {
      const stats = JSON.parse(game.stats || '{}');
      const maxHp = stats.maxHp || game.hp;
      const inventory = JSON.parse(game.inventory || '[]');

      return {
        ...game,
        maxHp,
        stats,
        inventory,
        progress: game.total_scenes > 0
          ? `${game.current_scene_order || 1}/${game.total_scenes}`
          : '1/1'
      };
    });

    res.json({ data: gamesWithDetails });
  } catch (error) {
    logger.error('Error fetching adventure games', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch adventure games',
      details: error.message
    });
  }
});

/**
 * GET /api/saved-games
 * List all saved games with metadata (paginated)
 * Only shows games owned by the authenticated user
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - sortBy: Field to sort by (default: last_played)
 * - sortOrder: ASC or DESC (default: DESC)
 * - adventureId: Filter by adventure ID (optional)
 * - difficulty: Filter by difficulty (optional)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { sortBy = 'last_played', sortOrder = 'DESC', adventureId, difficulty } = req.query;
    const userId = req.user.id;

    // Validate sort order
    const validSortOrders = ['ASC', 'DESC'];
    const validSortBy = ['last_played', 'created_at', 'character_name', 'gold'];
    const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    const field = validSortBy.includes(sortBy) ? sortBy : 'last_played';

    // Build query conditions - always filter by user
    let conditions = ['sg.user_id = ?'];
    let params = [userId];

    if (adventureId) {
      conditions.push('a.id = ?');
      params.push(adventureId);
    }

    if (difficulty) {
      conditions.push('a.difficulty = ?');
      params.push(difficulty);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM saved_games sg
      JOIN adventures a ON sg.adventure_id = a.id
      ${whereClause}
    `;
    const countResult = await db.get(countQuery, params);
    const total = countResult.total;

    // Get paginated results with scene image using JOINs (avoids N+1 queries)
    const savedGames = await db.all(`
      SELECT
        sg.id,
        sg.character_name,
        sg.character_class,
        sg.hp,
        sg.gold,
        sg.stats,
        sg.created_at,
        sg.last_played,
        a.id as adventure_id,
        a.title as adventure_title,
        a.difficulty,
        a.description as adventure_description,
        scene_counts.total_scenes,
        current_scene.image_url as scene_image_url,
        current_scene.description as scene_description
      FROM saved_games sg
      JOIN adventures a ON sg.adventure_id = a.id
      LEFT JOIN scenes current_scene ON current_scene.id = sg.current_scene_id
      LEFT JOIN (
        SELECT adventure_id, COUNT(*) as total_scenes
        FROM scenes
        GROUP BY adventure_id
      ) scene_counts ON scene_counts.adventure_id = a.id
      ${whereClause}
      ORDER BY ${field} ${order}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Build pagination metadata
    const pagination = buildPaginationMeta(page, limit, total);

    res.json({
      data: savedGames,
      pagination
    });
  } catch (error) {
    logger.error('Error fetching saved games', { error: error.message });
    res.status(500).json({
      error: 'Failed to fetch saved games',
      details: error.message
    });
  }
});

/**
 * DELETE /api/saved-games/:id
 * Delete a saved game (only if owned by user)
 */
router.delete('/:id', requireAuth, checkOwnership('savedGame'), async (req, res) => {
  try {
    const { id } = req.params;

    // Delete game (ownership already verified by middleware)
    await db.run('DELETE FROM saved_games WHERE id = ?', [id]);

    logger.info('Saved game deleted', { gameId: id, userId: req.user.id });

    res.json({ success: true, message: 'Saved game deleted successfully' });
  } catch (error) {
    logger.error('Error deleting saved game', { error: error.message });
    res.status(500).json({
      error: 'Failed to delete saved game',
      details: error.message
    });
  }
});

module.exports = router;
