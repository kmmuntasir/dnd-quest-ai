const db = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Resource type to table mapping
 */
const RESOURCE_CONFIG = {
  game: {
    table: 'saved_games',
    userIdColumn: 'user_id'
  },
  savedGame: {
    table: 'saved_games',
    userIdColumn: 'user_id'
  },
  adventure: {
    table: 'adventures',
    userIdColumn: 'user_id'
  },
  settings: {
    table: 'settings',
    userIdColumn: 'user_id'
  }
};

/**
 * Middleware factory to check if user owns a resource
 * @param {string} resourceType - Type of resource ('game', 'savedGame', 'adventure', 'settings')
 * @param {string} paramName - Name of the route parameter containing the resource ID (default: 'id')
 * @returns {Function} Express middleware
 */
function checkOwnership(resourceType, paramName = 'id') {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }

      const resourceId = req.params[paramName];
      const userId = req.user.id;

      // Validate resource type
      const config = RESOURCE_CONFIG[resourceType];
      if (!config) {
        logger.error('Invalid resource type in ownership check', { resourceType });
        return res.status(500).json({
          error: 'Server configuration error',
          message: 'Invalid resource type'
        });
      }

      // Query the resource
      const resource = await db.get(
        `SELECT ${config.userIdColumn} FROM ${config.table} WHERE id = ?`,
        [resourceId]
      );

      // Resource not found
      if (!resource) {
        return res.status(404).json({
          error: 'Resource not found',
          message: `The requested ${resourceType} does not exist`
        });
      }

      // Check ownership
      // Allow access if:
      // 1. Resource has no owner (null user_id - legacy data or anonymous)
      // 2. User owns the resource
      const ownerId = resource[config.userIdColumn];
      if (ownerId !== null && ownerId !== userId) {
        logger.warn('Ownership check failed', {
          resourceType,
          resourceId,
          requestingUserId: userId,
          ownerUserId: ownerId
        });
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to access this resource'
        });
      }

      // Attach resource info to request for use in route handlers
      req.resource = {
        type: resourceType,
        id: resourceId,
        ownerId
      };

      next();
    } catch (error) {
      logger.error('Error in ownership middleware', {
        error: error.message,
        resourceType,
        paramName
      });
      res.status(500).json({
        error: 'Authorization error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
}

/**
 * Middleware to require authentication and attach user filter for queries
 * Use this for list endpoints that should only show user's own resources
 */
function requireAuthAndFilter(resourceName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    // Attach filter info for use in route handlers
    req.authFilter = {
      resourceName,
      userId: req.user.id
    };

    next();
  };
}

/**
 * Helper to build WHERE clause for user-owned resources
 * @param {object} req - Express request with authFilter attached
 * @param {string} tableName - Table name or alias
 * @param {Array} params - Parameters array to push to
 * @returns {string} WHERE clause or empty string
 */
function buildUserFilterClause(req, tableName, params) {
  if (!req.authFilter) {
    return '';
  }

  const column = tableName ? `${tableName}.user_id` : 'user_id';
  params.push(req.authFilter.userId);
  return `${column} = ?`;
}

module.exports = {
  checkOwnership,
  requireAuthAndFilter,
  buildUserFilterClause,
  RESOURCE_CONFIG
};
