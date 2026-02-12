require('dotenv').config();

// Validate environment variables before starting
const { validateEnv } = require('./config/validateEnv');
validateEnv();

const express = require('express');
const cors = require('cors');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { sanitizeBody, lenientOptions } = require('./middleware/sanitize');
const { performanceMonitor } = require('./middleware/performance');
const { logger, httpLogger, requestIdMiddleware } = require('./utils/logger');
const healthService = require('./services/healthService');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS with proper origin whitelist
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // In production, check against whitelist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' })); // Add request size limit
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeBody(lenientOptions)); // Sanitize input to prevent XSS
app.use(requestIdMiddleware); // Add request ID for correlation
app.use(httpLogger);
app.use(performanceMonitor); // Monitor request performance

// Apply general rate limiting to all API routes
app.use('/api', generalLimiter);

// Routes
const authRouter = require('./routes/auth');
const adventuresRouter = require('./routes/adventures');
const gamesRouter = require('./routes/games');
const savedGamesRouter = require('./routes/savedGames');
const settingsRouter = require('./routes/settings');
const imagesRouter = require('./routes/images');
app.use('/api/auth', authRouter);
app.use('/api/adventures', adventuresRouter);
app.use('/api/games', gamesRouter);
app.use('/api/saved-games', savedGamesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/images', imagesRouter);

app.get('/', (req, res) => {
  res.json({
    message: 'Dungeons & Dragons AI API',
    version: '1.0.0',
    status: 'running'
  });
});

// Liveness probe - always returns 200 if process is running
app.get('/health/live', (req, res) => {
  res.status(200).json(healthService.checkLiveness());
});

// Readiness probe - checks if service is ready to accept requests
app.get('/health/ready', async (req, res) => {
  const readiness = await healthService.checkReadiness();
  const statusCode = readiness.status === 'ready' ? 200 : 503;
  res.status(statusCode).json(readiness);
});

// Full health check - includes external dependencies
app.get('/health', async (req, res) => {
  const health = await healthService.runHealthChecks({ includeExternal: true });

  // Return appropriate status code
  let statusCode = 200;
  if (health.status === 'unhealthy') {
    statusCode = 503;
  } else if (health.status === 'degraded') {
    statusCode = 200; // Still operational but degraded
  }

  res.status(statusCode).json(health);
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV,
    nodeVersion: process.version
  });
});

// Configure server timeouts
server.setTimeout(30000); // 30 second timeout
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Graceful shutdown handling
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    // Close database connection
    try {
      const db = require('./config/database');
      await db.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database', { error: error.message });
    }

    logger.info('Graceful shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
