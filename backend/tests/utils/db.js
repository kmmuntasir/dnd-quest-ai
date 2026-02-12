/**
 * Database test utilities
 * Provides in-memory database for tests
 */

const sqlite3 = require('sqlite3').verbose();

let db = null;

/**
 * Get test database instance
 */
async function getTestDb() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(':memory:', (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

/**
 * Initialize test database with schema
 */
async function initTestDb() {
  const testDb = await getTestDb();

  const schema = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Images table
    CREATE TABLE IF NOT EXISTS images (
      hash TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      pollinations_url TEXT,
      cached_path TEXT,
      width INTEGER DEFAULT 1024,
      height INTEGER DEFAULT 1024,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Adventures table
    CREATE TABLE IF NOT EXISTS adventures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      setting TEXT,
      quest TEXT,
      theme TEXT DEFAULT 'fantasy',
      tone TEXT DEFAULT 'serious',
      difficulty TEXT DEFAULT 'medium',
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Scenes table
    CREATE TABLE IF NOT EXISTS scenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adventure_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      imagePrompt TEXT,
      choices TEXT,
      scene_order INTEGER DEFAULT 0,
      is_key_scene BOOLEAN DEFAULT 0,
      image_url TEXT,
      image_hash TEXT,
      FOREIGN KEY (adventure_id) REFERENCES adventures(id),
      FOREIGN KEY (image_hash) REFERENCES images(hash)
    );

    -- NPCs table
    CREATE TABLE IF NOT EXISTS npcs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adventure_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      role TEXT,
      portrait_url TEXT,
      portrait_hash TEXT,
      FOREIGN KEY (adventure_id) REFERENCES adventures(id),
      FOREIGN KEY (portrait_hash) REFERENCES images(hash)
    );

    -- Games table
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adventure_id INTEGER NOT NULL,
      character_name TEXT NOT NULL,
      character_class TEXT NOT NULL,
      character_stats TEXT,
      hp INTEGER DEFAULT 100,
      gold INTEGER DEFAULT 50,
      inventory TEXT,
      current_scene_id INTEGER,
      game_history TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (adventure_id) REFERENCES adventures(id),
      FOREIGN KEY (current_scene_id) REFERENCES scenes(id)
    );

    -- Saved games table
    CREATE TABLE IF NOT EXISTS saved_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      user_id INTEGER,
      adventure_id INTEGER,
      snapshot TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (adventure_id) REFERENCES adventures(id)
    );

    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `;

  return new Promise((resolve, reject) => {
    testDb.exec(schema, (err) => {
      if (err) reject(err);
      else resolve(testDb);
    });
  });
}

/**
 * Clear all tables
 */
async function clearTestDb() {
  const testDb = await getTestDb();

  const tables = ['saved_games', 'games', 'scenes', 'npcs', 'adventures', 'images', 'users', 'settings'];

  for (const table of tables) {
    await new Promise((resolve, reject) => {
      testDb.run(`DELETE FROM ${table}`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

/**
 * Close test database
 */
async function closeTestDb() {
  if (db) {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else {
          db = null;
          resolve();
        }
      });
    });
  }
}

/**
 * Run a query and return results
 */
async function query(sql, params = []) {
  const testDb = await getTestDb();
  return new Promise((resolve, reject) => {
    testDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Run a single insert/update
 */
async function run(sql, params = []) {
  const testDb = await getTestDb();
  return new Promise((resolve, reject) => {
    testDb.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Get a single row
 */
async function get(sql, params = []) {
  const testDb = await getTestDb();
  return new Promise((resolve, reject) => {
    testDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

module.exports = {
  getTestDb,
  initTestDb,
  clearTestDb,
  closeTestDb,
  query,
  run,
  get
};
