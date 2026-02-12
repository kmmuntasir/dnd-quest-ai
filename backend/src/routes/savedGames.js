const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * GET /api/saved-games/adventures
 * List unique adventures that have been played, with game count
 */
router.get('/adventures', (req, res) => {
  try {
    // Get unique adventures with their game count and most recent play
    const adventures = db.prepare(`
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
      GROUP BY a.id
      ORDER BY last_played DESC
    `).all();

    res.json({ data: adventures });
  } catch (error) {
    console.error('Error fetching adventures:', error);
    res.status(500).json({
      error: 'Failed to fetch adventures',
      details: error.message
    });
  }
});

/**
 * GET /api/saved-games/adventures/:adventureId/games
 * Get all game instances for a specific adventure
 */
router.get('/adventures/:adventureId/games', (req, res) => {
  try {
    const { adventureId } = req.params;

    const games = db.prepare(`
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
        (SELECT s.scene_order FROM scenes s WHERE s.id = sg.current_scene_id) as current_scene_order,
        (SELECT s.image_url FROM scenes s WHERE s.id = sg.current_scene_id) as scene_image_url,
        (SELECT COUNT(*) FROM scenes s WHERE s.adventure_id = sg.adventure_id) as total_scenes
      FROM saved_games sg
      WHERE sg.adventure_id = ?
      ORDER BY sg.last_played DESC
    `).all(adventureId);

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
    console.error('Error fetching adventure games:', error);
    res.status(500).json({
      error: 'Failed to fetch adventure games',
      details: error.message
    });
  }
});

/**
 * GET /api/saved-games
 * List all saved games with metadata (paginated)
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - sortBy: Field to sort by (default: last_played)
 * - sortOrder: ASC or DESC (default: DESC)
 * - adventureId: Filter by adventure ID (optional)
 * - difficulty: Filter by difficulty (optional)
 */
router.get('/', (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { sortBy = 'last_played', sortOrder = 'DESC', adventureId, difficulty } = req.query;

    // Validate sort order
    const validSortOrders = ['ASC', 'DESC'];
    const validSortBy = ['last_played', 'created_at', 'character_name', 'gold'];
    const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    const field = validSortBy.includes(sortBy) ? sortBy : 'last_played';

    // Build query conditions
    let conditions = [];
    let params = [];

    if (adventureId) {
      conditions.push('a.id = ?');
      params.push(adventureId);
    }

    if (difficulty) {
      conditions.push('a.difficulty = ?');
      params.push(difficulty);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM saved_games sg
      JOIN adventures a ON sg.adventure_id = a.id
      ${whereClause}
    `;
    const { total } = db.prepare(countQuery).get(...params);

    // Get paginated results with scene image
    const savedGames = db.prepare(`
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
        (SELECT COUNT(*) FROM scenes s WHERE s.adventure_id = a.id) as total_scenes,
        (SELECT s.image_url FROM scenes s WHERE s.id = sg.current_scene_id LIMIT 1) as scene_image_url,
        (SELECT s.description FROM scenes s WHERE s.id = sg.current_scene_id LIMIT 1) as scene_description
      FROM saved_games sg
      JOIN adventures a ON sg.adventure_id = a.id
      ${whereClause}
      ORDER BY ${field} ${order}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    // Build pagination metadata
    const pagination = buildPaginationMeta(page, limit, total);

    res.json({
      data: savedGames,
      pagination
    });
  } catch (error) {
    console.error('Error fetching saved games:', error);
    res.status(500).json({
      error: 'Failed to fetch saved games',
      details: error.message
    });
  }
});

/**
 * DELETE /api/saved-games/:id
 * Delete a saved game
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if game exists
    const game = db.prepare('SELECT id FROM saved_games WHERE id = ?').get(id);

    if (!game) {
      return res.status(404).json({ error: 'Saved game not found' });
    }

    // Delete game
    db.prepare('DELETE FROM saved_games WHERE id = ?').run(id);

    res.json({ success: true, message: 'Saved game deleted successfully' });
  } catch (error) {
    console.error('Error deleting saved game:', error);
    res.status(500).json({
      error: 'Failed to delete saved game',
      details: error.message
    });
  }
});

module.exports = router;
