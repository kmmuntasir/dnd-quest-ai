const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

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

    // Get paginated results
    const savedGames = db.prepare(`
      SELECT
        sg.id,
        sg.character_name,
        sg.character_class,
        sg.hp,
        sg.gold,
        sg.created_at,
        sg.last_played,
        a.id as adventure_id,
        a.title as adventure_title,
        a.difficulty,
        (SELECT COUNT(*) FROM scenes s WHERE s.adventure_id = a.id) as total_scenes
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
