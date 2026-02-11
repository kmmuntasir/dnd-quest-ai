# Dungeons & Dragons AI - Backend API Documentation

## Overview

RESTful API for Dungeons & Dragons AI game built with Express.js and SQLite.

**Base URL:** `http://localhost:3000`

## Authentication

Currently, no authentication is required for this MVP.

## Response Format

All API responses follow this format:

**Success Response:**
```json
{
  "data": { ... },
  "success": true
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Additional details",
  "success": false
}
```

## Endpoints

### Health Check

#### GET /health
Check if the API is running.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-02-12T00:00:00.000Z"
}
```

### Adventures

#### POST /api/adventures/generate
Generate a new adventure with AI.

**Request Body:**
```json
{
  "theme": "fantasy",
  "tone": "serious",
  "difficulty": "medium",
  "context": "A haunted forest adventure"
}
```

**Parameters:**
- `theme` (required): "fantasy", "horror", "sci-fi", etc.
- `tone` (required): "serious", "humorous", "dark"
- `difficulty` (required): "easy", "medium", "hard"
- `context` (optional): Additional story context

**Response:**
```json
{
  "adventureId": 1,
  "title": "The Haunted Forest",
  "description": "A dark adventure in mysterious woods",
  "setting": "Ancient forest filled with ancient magic",
  "quest": "Find the lost amulet of light",
  "difficulty": "medium",
  "scenes": [
    {
      "id": 1,
      "description": "You stand at the edge of a dark forest...",
      "image_url": "https://image.pollinations.ai/...",
      "choices": ["Enter the forest", "Look around", "Turn back"],
      "is_key_scene": true
    }
  ],
  "npcs": [
    {
      "name": "Elder Thorn",
      "description": "Ancient forest guardian",
      "role": "Quest Giver",
      "image_url": "https://image.pollinations.ai/..."
    }
  ]
}
```

#### GET /api/adventures/:id
Get a specific adventure by ID.

**Response:**
```json
{
  "id": 1,
  "title": "The Haunted Forest",
  "description": "A dark adventure in mysterious woods",
  "setting": "Ancient forest filled with ancient magic",
  "quest": "Find the lost amulet of light",
  "difficulty": "medium",
  "generated_at": "2024-02-12T00:00:00.000Z",
  "scenes": [...],
  "npcs": [...]
}
```

#### GET /api/adventures
List all adventures.

**Response:**
```json
[
  {
    "id": 1,
    "title": "The Haunted Forest",
    "description": "A dark adventure in mysterious woods",
    "difficulty": "medium",
    "generated_at": "2024-02-12T00:00:00.000Z"
  }
]
```

### Games

#### POST /api/games/start
Start a new game.

**Request Body:**
```json
{
  "adventureId": 1,
  "characterName": "Aragorn",
  "characterClass": "Fighter"
}
```

**Parameters:**
- `adventureId` (required): Adventure ID from /api/adventures
- `characterName` (required): Character name
- `characterClass` (required): "Fighter", "Wizard", "Rogue", "Cleric", "Ranger"

**Response:**
```json
{
  "gameId": 1,
  "character": {
    "name": "Aragorn",
    "class": "Fighter",
    "stats": { "STR": 14, "DEX": 12, "INT": 10, "WIS": 11, "CON": 13, "CHA": 9 },
    "hp": 13,
    "maxHp": 13,
    "inventory": [],
    "gold": 0
  },
  "scene": { ... },
  "adventure": {
    "id": 1,
    "title": "The Haunted Forest",
    "description": "A dark adventure in mysterious woods"
  }
}
```

#### GET /api/games/:id
Get current game state.

**Response:**
```json
{
  "gameId": 1,
  "character": { ... },
  "scene": { ... },
  "gameHistory": [...],
  "adventure": { ... },
  "lastPlayed": "2024-02-12T00:00:00.000Z"
}
```

#### POST /api/games/:id/choice
Submit a player choice.

**Request Body:**
```json
{
  "choiceIndex": 0,
  "diceRoll": 15
}
```

**Parameters:**
- `choiceIndex` (required): Index of chosen choice (0-based)
- `diceRoll` (required): d20 roll result (1-20)

**Response:**
```json
{
  "narrative": "You enter the forest cautiously...",
  "outcome": "success",
  "character": {
    "stats": { ... },
    "hp": 13,
    "gold": 5,
    "inventory": ["Health Potion"],
    "newItem": "Health Potion"
  },
  "nextScenePrompt": "Continue your journey..."
}
```

**Game Over Response:**
```json
{
  "narrative": "You have fallen in battle...",
  "outcome": "failure",
  "gameOver": true,
  "victory": false,
  "finalHP": 0,
  "finalGold": 5
}
```

#### POST /api/games/:id/save
Manually save the game.

**Response:**
```json
{
  "success": true,
  "message": "Game saved successfully"
}
```

### Saved Games

#### GET /api/saved-games
List all saved games.

**Response:**
```json
[
  {
    "id": 1,
    "character_name": "Aragorn",
    "character_class": "Fighter",
    "hp": 13,
    "gold": 5,
    "created_at": "2024-02-12T00:00:00.000Z",
    "last_played": "2024-02-12T01:00:00.000Z",
    "adventure_id": 1,
    "adventure_title": "The Haunted Forest",
    "difficulty": "medium",
    "total_scenes": 5
  }
]
```

#### DELETE /api/saved-games/:id
Delete a saved game.

**Response:**
```json
{
  "success": true,
  "message": "Saved game deleted successfully"
}
```

### Settings

#### GET /api/settings
Get current settings.

**Response:**
```json
{
  "imageStyle": "fantasy art",
  "difficulty": "medium",
  "diceAnimations": true
}
```

#### PUT /api/settings
Update settings.

**Request Body:**
```json
{
  "imageStyle": "realistic",
  "difficulty": "hard",
  "diceAnimations": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

#### GET /api/settings/ai/test
Test AI service connections.

**Response:**
```json
{
  "groq": {
    "connected": true,
    "model": "llama-3.3-70b-versatile"
  },
  "pollinations": {
    "connected": true
  },
  "overall": "All systems operational"
}
```

## Error Codes

- `400` - Bad Request (missing or invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Development

### Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

---

*Last Updated: February 12, 2026*
