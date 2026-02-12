const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { logger } = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const BCRYPT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare a password with its hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 * @param {object} user - User object with id, username, email
 * @returns {string} JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token
 * @returns {object|null} Decoded token payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Create a new user
 * @param {string} username - Username
 * @param {string} email - Email address
 * @param {string} password - Plain text password
 * @returns {Promise<object>} Created user (without password hash)
 */
async function createUser(username, email, password) {
  // Check if username already exists
  const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUsername) {
    throw new Error('Username already exists');
  }

  // Check if email already exists
  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingEmail) {
    throw new Error('Email already exists');
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);
  const result = db.prepare(`
    INSERT INTO users (username, email, password_hash)
    VALUES (?, ?, ?)
  `).run(username, email, passwordHash);

  logger.info('User created', { userId: result.lastInsertRowid, username, email });

  return {
    id: result.lastInsertRowid,
    username,
    email
  };
}

/**
 * Authenticate a user with email and password
 * @param {string} email - Email address
 * @param {string} password - Plain text password
 * @returns {Promise<object|null>} User object with token, or null if authentication fails
 */
async function authenticateUser(email, password) {
  // Find user by email
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return null;
  }

  // Verify password
  const isValid = await comparePassword(password, user.password_hash);
  if (!isValid) {
    return null;
  }

  // Update last login
  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  logger.info('User authenticated', { userId: user.id, username: user.username });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    token: generateToken(user)
  };
}

/**
 * Get user by ID
 * @param {number} id - User ID
 * @returns {object|null} User object (without password hash)
 */
function getUserById(id) {
  const user = db.prepare('SELECT id, username, email, created_at, last_login FROM users WHERE id = ?').get(id);
  return user || null;
}

/**
 * Get user by email
 * @param {string} email - Email address
 * @returns {object|null} User object (without password hash)
 */
function getUserByEmail(email) {
  const user = db.prepare('SELECT id, username, email, created_at, last_login FROM users WHERE email = ?').get(email);
  return user || null;
}

/**
 * Get user by username
 * @param {string} username - Username
 * @returns {object|null} User object (without password hash)
 */
function getUserByUsername(username) {
  const user = db.prepare('SELECT id, username, email, created_at, last_login FROM users WHERE username = ?').get(username);
  return user || null;
}

/**
 * Change user password
 * @param {number} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} True if password changed successfully
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isValid = await comparePassword(currentPassword, user.password_hash);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  // Update password
  const newPasswordHash = await hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, userId);

  logger.info('Password changed', { userId });

  return true;
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  createUser,
  authenticateUser,
  getUserById,
  getUserByEmail,
  getUserByUsername,
  changePassword
};
