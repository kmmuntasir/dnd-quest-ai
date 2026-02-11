const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/saved-games
 * List all saved games with metadata
 */
router.get('/', (req, res) => {
  try {
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
      ORDER BY sg.last_played DESC
    `).all();

    res.json(savedGames);
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
