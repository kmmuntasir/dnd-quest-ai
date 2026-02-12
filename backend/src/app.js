require('dotenv').config();

// Validate environment variables before starting
const { validateEnv } = require('./config/validateEnv');
validateEnv();

const express = require('express');
const cors = require('cors');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { logger, httpLogger } = require('./utils/logger');
const healthService = require('./services/healthService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Add request size limit
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(httpLogger);

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
app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV,
    nodeVersion: process.version
  });
});

module.exports = app;
