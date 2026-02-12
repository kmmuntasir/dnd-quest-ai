# Setup Guide

Quick start guide for setting up the Dungeons & Dragons AI project locally.

## Prerequisites

- Node.js 18+
- npm or yarn
- Groq API key (https://console.groq.com/)
- Pollinations.ai API key (https://enter.pollinations.ai/)

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repo-url>
cd dungeons-and-dragons

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Required
GROQ_API_KEY=your_groq_api_key_here
POLLINATIONS_API_KEY=your_pollinations_api_key_here

# Optional (defaults shown)
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3000
NODE_ENV=development
DATABASE_PATH=../database/dnd-game.db
LOG_LEVEL=info
```

Create a `.env` file in the `frontend/` directory (optional):

```env
VITE_API_URL=http://localhost:3000/api
```

### 3. Start the Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health check: http://localhost:3000/health

## API Endpoints

### Adventures
- `POST /api/adventures/generate` - Generate new adventure
- `GET /api/adventures` - List all adventures
- `GET /api/adventures/:id` - Get adventure details
- `DELETE /api/adventures/:id` - Delete adventure

### Games
- `POST /api/games/start` - Start new game
- `GET /api/games/:id` - Get game state
- `POST /api/games/:id/choice` - Submit choice
- `POST /api/games/:id/save` - Save game
- `POST /api/games/:id/go-back` - Go back to previous scene
- `POST /api/games/:id/restart` - Restart game

### Saved Games
- `GET /api/saved-games` - List saved games
- `GET /api/saved-games/adventures` - List unique adventures
- `DELETE /api/saved-games/:id` - Delete saved game

### Images
- `GET /api/images/:hash` - Get cached image
- `POST /api/images/:hash/regenerate` - Regenerate image

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings
- `GET /api/settings/ai/test` - Test AI connections

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | Yes | - | Groq API key for text generation |
| `POLLINATIONS_API_KEY` | Yes | - | Pollinations.ai API key for images |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | AI model to use |
| `PORT` | No | `3000` | Backend server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `DATABASE_PATH` | No | `../database/dnd-game.db` | SQLite database path |
| `LOG_LEVEL` | No | `info` | Logging level |

## Testing

```bash
# Run backend API tests
cd backend
npm test
```

## Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Database issues
```bash
# Delete and recreate database
rm backend/database/dnd-game.db
# Restart backend - database will be recreated
```

### Image generation timeout
Images can take up to 90 seconds to generate. If timing out, check your Pollinations.ai API key and quota.

---

*Last Updated: February 12, 2026*
