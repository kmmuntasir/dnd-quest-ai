const authService = require('../services/authService');
const { logger } = require('../utils/logger');

/**
 * Middleware to require authentication
 * Attaches user to req.user if authenticated, returns 401 if not
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = authService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Please log in again'
      });
    }

    // Get full user from database
    const user = await authService.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'Please log in again'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error', { error: error.message });
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
}

/**
 * Middleware to optionally attach user if authenticated
 * Does not block if not authenticated, but attaches req.user if valid token
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);

    if (decoded) {
      const user = await authService.getUserById(decoded.id);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    logger.warn('Optional auth error', { error: error.message });
    next();
  }
}

/**
 * Generate a new token for an authenticated user
 */
function refreshToken(req, res, next) {
  if (!req.user) {
    return next();
  }

  const newToken = authService.generateToken(req.user);
  res.locals.newToken = newToken;
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  refreshToken
};
