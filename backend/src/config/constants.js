/**
 * Application Configuration Constants
 * Centralizes all magic numbers and configuration values
 */

// API Configuration
const API = {
  TIMEOUT: parseInt(process.env.API_TIMEOUT) || 30000,
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY: 1000,
  RETRY_MAX_DELAY: 10000
};

// Image Generation
const IMAGE = {
  DEFAULT_WIDTH: 1024,
  DEFAULT_HEIGHT: 1024,
  PORTRAIT_WIDTH: 512,
  PORTRAIT_HEIGHT: 512,
  TIMEOUT: parseInt(process.env.IMAGE_TIMEOUT) || 30000,
  MAX_RETRIES: 3,
  CACHE_DIR: 'storage/images'
};

// Circuit Breaker
const CIRCUIT_BREAKER = {
  FAILURE_THRESHOLD: 5,
  RESET_TIMEOUT: 30000, // 30 seconds
  SUCCESS_THRESHOLD: 2
};

// Rate Limiting (requests per 15 minutes)
const RATE_LIMITS = {
  GENERAL_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  GENERAL_MAX: 100,
  AI_WINDOW_MS: 15 * 60 * 1000,
  AI_MAX: 10,
  AUTH_WINDOW_MS: 15 * 60 * 1000,
  AUTH_MAX: 5
};

// Adventure Configuration
const ADVENTURE = {
  SCENE_COUNTS: {
    quick: 3,
    standard: 5,
    extended: 8,
    ai: 'ai' // AI decides
  },
  THEMES: ['fantasy', 'horror', 'sci-fi', 'mystery', 'adventure', 'pirate'],
  TONES: ['serious', 'humorous', 'dark'],
  DIFFICULTIES: ['easy', 'medium', 'hard'],
  LENGTHS: ['quick', 'standard', 'extended', 'ai']
};

// Character Configuration
const CHARACTER = {
  CLASSES: ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger'],

  // Base HP by class
  BASE_HP: {
    'Fighter': 10,
    'Wizard': 6,
    'Rogue': 8,
    'Cleric': 8,
    'Ranger': 10
  },

  // Default HP if class not found
  DEFAULT_HP: 8,

  // Starting gold
  STARTING_GOLD: 50,

  // Stat ranges (3d6)
  MIN_STAT: 3,
  MAX_STAT: 18,

  // Stats list
  STATS: ['STR', 'DEX', 'INT', 'WIS', 'CON', 'CHA'],

  // Stat names for display
  STAT_NAMES: {
    STR: 'Strength',
    DEX: 'Dexterity',
    INT: 'Intelligence',
    WIS: 'Wisdom',
    CON: 'Constitution',
    CHA: 'Charisma'
  }
};

// Dice Configuration
const DICE = {
  D20_SIDES: 20,
  D6_SIDES: 6,
  STAT_ROLL_COUNT: 3, // 3d6 for stats

  // Roll outcomes
  CRITICAL_SUCCESS: 20,
  CRITICAL_FAILURE: 1,

  // DC (Difficulty Class) thresholds
  DC: {
    EASY: 10,
    MEDIUM: 15,
    HARD: 20
  }
};

// Health Configuration
const HEALTH = {
  // Health check endpoints
  LIVENESS_PATH: '/health/live',
  READINESS_PATH: '/health/ready',
  FULL_PATH: '/health',

  // Status values
  STATUS_HEALTHY: 'healthy',
  STATUS_UNHEALTHY: 'unhealthy',
  STATUS_DEGRADED: 'degraded'
};

// Request Size Limits
const REQUEST_LIMITS = {
  JSON_LIMIT: '1mb',
  URL_ENCODED_LIMIT: '1mb'
};

// JWT Configuration
const JWT = {
  EXPIRES_IN: '7d',
  ISSUER: 'dnd-ai-backend'
};

// Logging
const LOGGING = {
  DEFAULT_LEVEL: 'info',
  MAX_FILE_SIZE: 5242880, // 5MB
  MAX_FILES: 5
};

// Database
const DATABASE = {
  DEFAULT_PATH: './database/dnd-game.db',
  POOL_SIZE: 5,
  CONNECTION_TIMEOUT: 5000
};

module.exports = {
  API,
  IMAGE,
  CIRCUIT_BREAKER,
  RATE_LIMITS,
  ADVENTURE,
  CHARACTER,
  DICE,
  HEALTH,
  REQUEST_LIMITS,
  JWT,
  LOGGING,
  DATABASE
};
