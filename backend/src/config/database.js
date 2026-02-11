require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../', process.env.DATABASE_PATH || '../database/dnd-game.db');

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  // Adventures table
  db.exec(`
    CREATE TABLE IF NOT EXISTS adventures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      setting TEXT,
      quest TEXT,
      difficulty TEXT,
      generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Scenes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adventure_id INTEGER,
      scene_order INTEGER,
      description TEXT,
      image_url TEXT,
      choices TEXT,
      is_key_scene BOOLEAN DEFAULT 0,
      FOREIGN KEY (adventure_id) REFERENCES adventures(id)
    )
  `);

  // NPCs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS npcs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adventure_id INTEGER,
      name TEXT,
      description TEXT,
      role TEXT,
      image_url TEXT,
      FOREIGN KEY (adventure_id) REFERENCES adventures(id)
    )
  `);

  // Saved games table
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adventure_id INTEGER,
      character_name TEXT,
      character_class TEXT,
      stats TEXT,
      hp INTEGER,
      inventory TEXT,
      gold INTEGER DEFAULT 0,
      current_scene_id INTEGER,
      game_history TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (adventure_id) REFERENCES adventures(id),
      FOREIGN KEY (current_scene_id) REFERENCES scenes(id)
    )
  `);

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      image_style TEXT DEFAULT 'fantasy art',
      difficulty TEXT DEFAULT 'medium',
      dice_animations BOOLEAN DEFAULT 1
    )
  `);

  // Insert default settings if not exists
  const settings = db.prepare('SELECT COUNT(*) as count FROM settings WHERE id = 1');
  const result = settings.get();
  if (result.count === 0) {
    db.prepare(`
      INSERT INTO settings (id, image_style, difficulty, dice_animations)
      VALUES (1, 'fantasy art', 'medium', 1)
    `).run();
  }

  console.log('Database initialized successfully');
}

// Initialize on module load
initializeDatabase();

module.exports = db;
