# Backend Setup Guide

## Prerequisites

- Node.js v18 or higher
- npm or yarn
- Git

## Installation

1. Clone the repository (if not already done):
```bash
git clone <repository-url>
cd dungeons-and-dragons/backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
nano .env  # or use your favorite editor
```

4. Update `.env` with your API keys:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
POLLINATIONS_API_KEY=your_pollinations_api_key_here
PORT=3000
NODE_ENV=development
DATABASE_PATH=../database/dnd-game.db
```

**Getting API Keys:**

- **Groq:** Sign up at https://console.groq.com/ and get your API key from the dashboard
- **Pollinations.ai:** Sign up at https://enter.pollinations.ai/ and get your API key

5. Create database directory:
```bash
mkdir -p ../database
```

## Running the Server

### Development Mode
```bash
npm run dev
```
This will start the server with nodemon for auto-reload on file changes.

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## Verifying Installation

1. Check health endpoint:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-02-12T00:00:00.000Z"
}
```

2. Test AI connections:
```bash
curl http://localhost:3000/api/settings/ai/test
```

Expected response:
```json
{
  "groq": { "connected": true, "model": "llama-3.3-70b-versatile" },
  "pollinations": { "connected": true },
  "overall": "All systems operational"
}
```

3. Run API tests:
```bash
npm test
```

This will test all major API endpoints.

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js       # SQLite database configuration
│   ├── controllers/          # Route controllers (future use)
│   ├── routes/
│   │   ├── adventures.js     # Adventure endpoints
│   │   ├── games.js         # Game play endpoints
│   │   ├── savedGames.js    # Saved games endpoints
│   │   └── settings.js      # Settings endpoints
│   ├── services/
│   │   ├── groqService.js   # Groq API integration
│   │   └── imageService.js # Pollinations.ai integration
│   ├── middleware/
│   │   ├── errorHandler.js  # Error handling
│   │   ├── logger.js       # Request logging
│   │   └── validator.js    # Request validation
│   ├── utils/
│   │   └── helpers.js      # Utility functions
│   └── app.js              # Express app setup
├── tests/
│   └── api-test.js         # API integration tests
├── .env                    # Environment variables (not in git)
├── .env.example            # Environment template
├── .eslintrc.json         # ESLint configuration
├── .gitignore
├── package.json
└── package-lock.json
```

## Troubleshooting

### Database Issues

If you encounter database errors, delete the database file and let it recreate:
```bash
rm ../database/dnd-game.db
```

The database will be automatically created on the next server restart.

### API Key Issues

Make sure your API keys are correct:
- Check that `GROQ_API_KEY` and `POLLINATIONS_API_KEY` are set in `.env`
- Verify your API keys are active and not expired
- Test connections with `GET /api/settings/ai/test`

### Port Already in Use

If port 3000 is already in use, change the port in `.env`:
```env
PORT=3001
```

Or kill the process using port 3000:
```bash
lsof -ti:3000 | xargs kill -9
```

### Dependencies Issues

If you encounter dependency errors, try:
```bash
rm node_modules package-lock.json
npm install
```

## Development Tips

### Auto-reload on Changes
Use `npm run dev` to automatically restart the server when files change.

### Viewing Logs
The server logs all HTTP requests with method, path, status, and duration:
```
POST /api/adventures/generate - 200 (35420ms)
GET /api/games/1 - 200 (15ms)
```

### Testing Individual Endpoints
Use curl or a tool like Postman:
```bash
# Generate adventure
curl -X POST http://localhost:3000/api/adventures/generate \
  -H "Content-Type: application/json" \
  -d '{"theme":"fantasy","tone":"serious","difficulty":"medium"}'
```

## Next Steps

After setting up the backend:
1. Read the [API Documentation](./API.md)
2. Set up the [Frontend](../frontend/README.md)
3. Test the complete game flow

---

*Last Updated: February 12, 2026*
