const db = require('../config/database');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

// Configuration
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds for health checks
const STORAGE_PATH = path.resolve(__dirname, '../../storage');

/**
 * Check database connectivity
 * @returns {Promise<{status: string, responseTime: number, error?: string}>}
 */
async function checkDatabase() {
  const start = Date.now();
  try {
    await db.get('SELECT 1 as test');
    return {
      status: 'healthy',
      responseTime: Date.now() - start
    };
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error.message
    };
  }
}

/**
 * Check Groq API connectivity
 * @returns {Promise<{status: string, responseTime: number, error?: string}>}
 */
async function checkGroqAPI() {
  const start = Date.now();
  try {
    const groqService = require('./groqService');
    const connected = await groqService.testConnection();

    return {
      status: connected ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - start,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    };
  } catch (error) {
    logger.error('Groq API health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error.message
    };
  }
}

/**
 * Check Pollinations.ai API connectivity
 * @returns {Promise<{status: string, responseTime: number, error?: string}>}
 */
async function checkPollinationsAPI() {
  const start = Date.now();
  try {
    const imageService = require('./imageService');
    const connected = await imageService.testConnection();

    return {
      status: connected ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - start
    };
  } catch (error) {
    logger.error('Pollinations API health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error.message
    };
  }
}

/**
 * Check file system (storage directory writable)
 * @returns {Promise<{status: string, responseTime: number, error?: string}>}
 */
async function checkFileSystem() {
  const start = Date.now();
  try {
    // Check if storage directory exists and is writable
    if (!fs.existsSync(STORAGE_PATH)) {
      fs.mkdirSync(STORAGE_PATH, { recursive: true });
    }

    // Try to write a test file
    const testFile = path.join(STORAGE_PATH, '.healthcheck');
    fs.writeFileSync(testFile, Date.now().toString());
    fs.unlinkSync(testFile);

    return {
      status: 'healthy',
      responseTime: Date.now() - start
    };
  } catch (error) {
    logger.error('File system health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error.message
    };
  }
}

/**
 * Run all health checks
 * @param {Object} options - Options for which checks to run
 * @param {boolean} options.includeExternal - Include external API checks
 * @returns {Promise<Object>} Health check results
 */
async function runHealthChecks(options = { includeExternal: true }) {
  const startTime = Date.now();

  // Always check internal dependencies
  const [database, fileSystem] = await Promise.all([
    checkDatabase(),
    checkFileSystem()
  ]);

  const result = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    responseTime: 0,
    checks: {
      database,
      fileSystem
    }
  };

  // Optionally check external dependencies
  if (options.includeExternal) {
    const [groq, pollinations] = await Promise.all([
      checkGroqAPI(),
      checkPollinationsAPI()
    ]);

    result.checks.groq = groq;
    result.checks.pollinations = pollinations;
  }

  // Calculate total response time
  result.responseTime = Date.now() - startTime;

  // Determine overall status
  const allChecks = Object.values(result.checks);
  const hasUnhealthy = allChecks.some(check => check.status === 'unhealthy');

  if (hasUnhealthy) {
    // Critical internal services failed
    if (database.status === 'unhealthy' || fileSystem.status === 'unhealthy') {
      result.status = 'unhealthy';
    } else {
      // Only external services failed
      result.status = 'degraded';
    }
  }

  return result;
}

/**
 * Simple liveness check (is the process running?)
 * @returns {Object} Liveness status
 */
function checkLiveness() {
  return {
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
}

/**
 * Readiness check (is the service ready to accept requests?)
 * Only checks critical internal dependencies
 * @returns {Promise<Object>} Readiness status
 */
async function checkReadiness() {
  const startTime = Date.now();

  // Only check critical internal dependencies
  const [database, fileSystem] = await Promise.all([
    checkDatabase(),
    checkFileSystem()
  ]);

  const isReady = database.status === 'healthy' && fileSystem.status === 'healthy';

  return {
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    checks: {
      database,
      fileSystem
    }
  };
}

module.exports = {
  checkDatabase,
  checkGroqAPI,
  checkPollinationsAPI,
  checkFileSystem,
  runHealthChecks,
  checkLiveness,
  checkReadiness
};
