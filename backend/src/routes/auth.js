const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const { logger } = require('../utils/logger');
const { registerSchema, loginSchema, changePasswordSchema } = require('../validations/auth.schema');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const user = await authService.createUser(username, email, password);
    const token = authService.generateToken(user);

    logger.info('User registered', { userId: user.id, username });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (error) {
    logger.warn('Registration failed', { error: error.message, email: req.body.email });

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Registration failed',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await authService.authenticateUser(email, password);

    if (!result) {
      logger.warn('Login failed', { email, reason: 'Invalid credentials' });
      return res.status(401).json({
        error: 'Login failed',
        message: 'Invalid email or password'
      });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: result.id,
        username: result.username,
        email: result.email
      },
      token: result.token
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      createdAt: req.user.created_at,
      lastLogin: req.user.last_login
    }
  });
});

/**
 * PUT /api/auth/password
 * Change password for authenticated user
 */
router.put('/password', requireAuth, validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(req.user.id, currentPassword, newPassword);

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.warn('Password change failed', { userId: req.user.id, error: error.message });

    if (error.message.includes('incorrect')) {
      return res.status(400).json({
        error: 'Password change failed',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Password change failed',
      message: 'An error occurred while changing password'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal, but we provide the endpoint for completeness)
 */
router.post('/logout', (req, res) => {
  res.json({
    message: 'Logout successful',
    instruction: 'Please remove the token from client storage'
  });
});

module.exports = router;
