require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../', process.env.DATABASE_PATH || '../database/dnd-game.db');

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  // Images table - stores image metadata and cache info
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT UNIQUE NOT NULL,
      prompt TEXT NOT NULL,
      pollinations_url TEXT NOT NULL,
      cached_path TEXT,
      width INTEGER DEFAULT 1024,
      height INTEGER DEFAULT 1024,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
      image_hash TEXT,
      choices TEXT,
      is_key_scene BOOLEAN DEFAULT 0,
      FOREIGN KEY (adventure_id) REFERENCES adventures(id),
      FOREIGN KEY (image_hash) REFERENCES images(hash)
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
      portrait_hash TEXT,
      FOREIGN KEY (adventure_id) REFERENCES adventures(id),
      FOREIGN KEY (portrait_hash) REFERENCES images(hash)
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

  // Create image cache directory
  const cacheDir = path.resolve(__dirname, '../../storage/images');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    console.log('Created image cache directory:', cacheDir);
  }

  // Run migrations for existing tables
  runMigrations();

  console.log('Database initialized successfully');
}

// Run database migrations
function runMigrations() {
  try {
    // Check if image_hash column exists in scenes table
    const scenesInfo = db.prepare("PRAGMA table_info(scenes)").all();
    const hasImageHash = scenesInfo.some(col => col.name === 'image_hash');

    if (!hasImageHash) {
      console.log('Adding image_hash column to scenes table...');
      db.exec('ALTER TABLE scenes ADD COLUMN image_hash TEXT');
    }

    // Check if portrait_hash column exists in npcs table
    const npcsInfo = db.prepare("PRAGMA table_info(npcs)").all();
    const hasPortraitHash = npcsInfo.some(col => col.name === 'portrait_hash');

    if (!hasPortraitHash) {
      console.log('Adding portrait_hash column to npcs table...');
      db.exec('ALTER TABLE npcs ADD COLUMN portrait_hash TEXT');
    }
  } catch (error) {
    console.log('Migration check:', error.message);
  }
}

// Initialize on module load
initializeDatabase();

module.exports = db;
