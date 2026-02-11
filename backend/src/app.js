require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { logger, httpLogger } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);

// Routes
const adventuresRouter = require('./routes/adventures');
const gamesRouter = require('./routes/games');
const savedGamesRouter = require('./routes/savedGames');
const settingsRouter = require('./routes/settings');
app.use('/api/adventures', adventuresRouter);
app.use('/api/games', gamesRouter);
app.use('/api/saved-games', savedGamesRouter);
app.use('/api/settings', settingsRouter);

app.get('/', (req, res) => {
  res.json({
    message: 'Dungeons & Dragons AI API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
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
