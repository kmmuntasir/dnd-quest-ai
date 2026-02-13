require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

const dbPath = path.resolve(__dirname, '../../', process.env.DATABASE_PATH || '../database/dnd-game.db');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  logger.info('Created database directory', { path: dbDir });
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Failed to connect to database', { error: err.message });
    throw err;
  }
  logger.info('Connected to database', { path: dbPath });
});

// Configure SQLite for better performance and concurrency
db.serialize(() => {
  // Enable WAL mode for better concurrent access
  db.run('PRAGMA journal_mode = WAL', (err) => {
    if (err) {
      logger.warn('Failed to enable WAL mode', { error: err.message });
    } else {
      logger.info('SQLite WAL mode enabled');
    }
  });

  // Set busy timeout to 5 seconds for concurrent access
  db.run('PRAGMA busy_timeout = 5000', (err) => {
    if (err) {
      logger.warn('Failed to set busy timeout', { error: err.message });
    }
  });

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON', (err) => {
    if (err) {
      logger.error('Failed to enable foreign keys', { error: err.message });
    }
  });

  // Set synchronous mode for better performance (NORMAL is safe with WAL)
  db.run('PRAGMA synchronous = NORMAL', (err) => {
    if (err) {
      logger.warn('Failed to set synchronous mode', { error: err.message });
    }
  });
});

/**
 * Promisified database methods
 */
const dbAsync = {
  /**
   * Run a SQL query that doesn't return rows (INSERT, UPDATE, DELETE)
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<{lastID: number, changes: number}>}
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          logger.error('Database run error', { sql, error: err.message });
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  },

  /**
   * Get a single row
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<object|undefined>}
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('Database get error', { sql, error: err.message });
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  /**
   * Get all rows
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>}
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('Database all error', { sql, error: err.message });
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  },

  /**
   * Execute SQL (for schema operations)
   * @param {string} sql - SQL to execute
   * @returns {Promise<void>}
   */
  exec(sql) {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) {
          logger.error('Database exec error', { error: err.message });
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * Run multiple queries in a transaction
   * @param {Function} callback - Function that receives dbAsync and performs operations
   * @returns {Promise<any>} Result of callback
   */
  async transaction(callback) {
    await this.run('BEGIN TRANSACTION');
    try {
      const result = await callback(this);
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  },

  /**
   * Close the database connection
   * @returns {Promise<void>}
   */
  close() {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
};

/**
 * Initialize database schema
 */
async function initializeDatabase() {
  try {
    // Users table
    await dbAsync.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);

    // Images table
    await dbAsync.exec(`
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
    await dbAsync.exec(`
      CREATE TABLE IF NOT EXISTS adventures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        setting TEXT,
        quest TEXT,
        difficulty TEXT,
        user_id INTEGER REFERENCES users(id),
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Scenes table
    await dbAsync.exec(`
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
    await dbAsync.exec(`
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
    await dbAsync.exec(`
      CREATE TABLE IF NOT EXISTS saved_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adventure_id INTEGER,
        user_id INTEGER REFERENCES users(id),
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
    await dbAsync.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        image_style TEXT DEFAULT 'fantasy art',
        difficulty TEXT DEFAULT 'medium',
        dice_animations BOOLEAN DEFAULT 1,
        user_id INTEGER REFERENCES users(id)
      )
    `);

    // Insert default settings if not exists
    const settings = await dbAsync.get('SELECT COUNT(*) as count FROM settings WHERE id = 1');
    if (settings.count === 0) {
      await dbAsync.run(`
        INSERT INTO settings (id, image_style, difficulty, dice_animations)
        VALUES (1, 'fantasy art', 'medium', 1)
      `);
    }

    // Create image cache directory
    const cacheDir = path.resolve(__dirname, '../../storage/images');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      logger.info('Created image cache directory', { path: cacheDir });
    }

    // Run migrations
    await runMigrations();

    // Create indexes
    await createIndexes();

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed', { error: error.message });
    throw error;
  }
}

/**
 * Run database migrations
 * Uses versioned migration system for better tracking and rollback support
 */
async function runMigrations() {
  try {
    // Create migrations tracking table if it doesn't exist
    await dbAsync.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get applied migrations
    const applied = await dbAsync.all('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(applied.map(m => m.version));

    // Define versioned migrations
    const migrations = [
      {
        version: 1,
        name: 'add_image_hash_to_scenes',
        // Check if needed before applying
        check: async () => {
          const info = await dbAsync.all("PRAGMA table_info(scenes)");
          return !info.some(col => col.name === 'image_hash');
        },
        up: 'ALTER TABLE scenes ADD COLUMN image_hash TEXT'
      },
      {
        version: 2,
        name: 'add_portrait_hash_to_npcs',
        check: async () => {
          const info = await dbAsync.all("PRAGMA table_info(npcs)");
          return !info.some(col => col.name === 'portrait_hash');
        },
        up: 'ALTER TABLE npcs ADD COLUMN portrait_hash TEXT'
      },
      {
        version: 3,
        name: 'add_user_id_to_adventures',
        check: async () => {
          const info = await dbAsync.all("PRAGMA table_info(adventures)");
          return !info.some(col => col.name === 'user_id');
        },
        up: 'ALTER TABLE adventures ADD COLUMN user_id INTEGER REFERENCES users(id)'
      },
      {
        version: 4,
        name: 'add_user_id_to_saved_games',
        check: async () => {
          const info = await dbAsync.all("PRAGMA table_info(saved_games)");
          return !info.some(col => col.name === 'user_id');
        },
        up: 'ALTER TABLE saved_games ADD COLUMN user_id INTEGER REFERENCES users(id)'
      },
      {
        version: 5,
        name: 'add_user_id_to_settings',
        check: async () => {
          const info = await dbAsync.all("PRAGMA table_info(settings)");
          return !info.some(col => col.name === 'user_id');
        },
        up: 'ALTER TABLE settings ADD COLUMN user_id INTEGER REFERENCES users(id)'
      },
      {
        version: 6,
        name: 'fix_settings_table_for_per_user_settings',
        check: async () => {
          // Check if settings table has the restrictive CHECK constraint
          const tableSql = await dbAsync.get(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='settings'"
          );
          // If the table has CHECK (id = 1), it needs migration
          return tableSql && tableSql.sql && tableSql.sql.includes('CHECK (id = 1)');
        },
        up: `
          -- Create new settings table without the restrictive CHECK constraint
          CREATE TABLE settings_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_style TEXT DEFAULT 'fantasy art',
            difficulty TEXT DEFAULT 'medium',
            dice_animations BOOLEAN DEFAULT 1,
            user_id INTEGER REFERENCES users(id)
          );

          -- Copy existing data
          INSERT INTO settings_new (id, image_style, difficulty, dice_animations, user_id)
          SELECT id, image_style, difficulty, dice_animations, user_id FROM settings;

          -- Drop old table
          DROP TABLE settings;

          -- Rename new table
          ALTER TABLE settings_new RENAME TO settings;
        `
      }
    ];

    // Run migrations in order
    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) {
        continue; // Already applied
      }

      // Check if migration is needed
      const needsMigration = migration.check ? await migration.check() : true;

      if (needsMigration) {
        logger.info('Running migration', {
          version: migration.version,
          name: migration.name
        });

        await dbAsync.run('BEGIN TRANSACTION');
        try {
          if (migration.up) {
            await dbAsync.exec(migration.up);
          }

          await dbAsync.run(
            'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
            [migration.version, migration.name]
          );

          await dbAsync.run('COMMIT');
          logger.info('Migration completed', { version: migration.version });
        } catch (error) {
          await dbAsync.run('ROLLBACK');
          logger.error('Migration failed', {
            version: migration.version,
            name: migration.name,
            error: error.message
          });
          throw error;
        }
      } else {
        // Column already exists, just record the migration
        await dbAsync.run(
          'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
          [migration.version, migration.name]
        );
        logger.info('Migration skipped (already applied)', {
          version: migration.version,
          name: migration.name
        });
      }
    }

    logger.info('All migrations completed');
  } catch (error) {
    logger.error('Migration error', { error: error.message });
    // Don't throw - allow app to continue with existing schema
  }
}

/**
 * Create database indexes for performance
 */
async function createIndexes() {
  const indexes = [
    // Users table indexes (for authentication lookups)
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',

    // Scenes indexes
    'CREATE INDEX IF NOT EXISTS idx_scenes_adventure_id ON scenes(adventure_id)',
    'CREATE INDEX IF NOT EXISTS idx_scenes_order ON scenes(adventure_id, scene_order)',

    // NPCs index
    'CREATE INDEX IF NOT EXISTS idx_npcs_adventure_id ON npcs(adventure_id)',

    // Saved games indexes
    'CREATE INDEX IF NOT EXISTS idx_saved_games_adventure ON saved_games(adventure_id)',
    'CREATE INDEX IF NOT EXISTS idx_saved_games_user ON saved_games(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_saved_games_last_played ON saved_games(last_played)',

    // Adventures index
    'CREATE INDEX IF NOT EXISTS idx_adventures_user ON adventures(user_id)',

    // Images index
    'CREATE INDEX IF NOT EXISTS idx_images_hash ON images(hash)',

    // Settings index for user-specific settings
    'CREATE INDEX IF NOT EXISTS idx_settings_user ON settings(user_id)'
  ];

  for (const indexSql of indexes) {
    try {
      await dbAsync.exec(indexSql);
    } catch (error) {
      logger.warn('Failed to create index', { sql: indexSql, error: error.message });
    }
  }

  logger.info('Database indexes created');
}

// Initialize database asynchronously
const initPromise = initializeDatabase();

// Export both the async methods and the init promise
module.exports = dbAsync;
module.exports.db = db;
module.exports.ready = initPromise;
