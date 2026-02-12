# Dungeons & Dragons AI

An immersive D&D-style RPG where AI dynamically generates adventures, stories, and atmospheric images.

## Overview

Play through AI-generated fantasy adventures with:
- **Dynamic Storytelling** - Groq-powered Llama 3.3 70B creates unique adventures
- **Atmospheric Visuals** - AI-generated images via Pollinations.ai
- **Replayability** - Branching paths and saved games
- **Simple D&D Mechanics** - Character stats, dice rolls, choices matter
- **Configurable Length** - Choose from Quick (3), Standard (5), Extended (8) scenes, or let AI decide

## Tech Stack

- **Frontend:** React.js + Vite + Tailwind CSS
- **Backend:** Express.js + SQLite
- **AI Services:** Groq API (Llama 3.3 70B) + Pollinations.ai API

## Quick Start

See [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions.

```bash
# Clone the repo
git clone <repo-url>
cd dungeons-and-dragons

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Create .env in backend/ with your API keys
# GROQ_API_KEY=your_key
# POLLINATIONS_API_KEY=your_key

# Start backend (terminal 1)
cd backend && npm run dev

# Start frontend (terminal 2)
cd frontend && npm run dev
```

## Features

### Story Generation
- Automatic adventure creation with configurable length
- Custom themes (fantasy, horror, sci-fi, mystery, adventure, pirate)
- Difficulty levels (easy, medium, hard)
- Tone options (serious, humorous, dark, light-hearted)
- AI-generated story context suggestions
- NPCs and branching choices

### Dynamic Images
- Scene illustrations with AI-generated visuals
- Hash-based image caching for performance
- Regenerate images if rate-limited

### Gameplay
- Turn-based choices with dice rolls
- d20 rolls with modifiers
- Character stats that affect outcomes
- Go back to previous scenes
- Restart games

### Save System
- Auto-save after each scene
- Resume any saved adventure
- Delete old saves

## Documentation

- [docs/SETUP.md](docs/SETUP.md) - Installation and configuration guide
- [docs/PRD.md](docs/PRD.md) - Product requirements document
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Production deployment guide
- [docs/ANALYSIS.md](docs/ANALYSIS.md) - Technical analysis and architecture

## MVP Status

The MVP is complete with all core features implemented:
- [x] Adventure generation with configurable length
- [x] Character creation with stats
- [x] Dynamic scene progression with choices
- [x] Dice rolling mechanics
- [x] AI-generated images with caching
- [x] Save/load system
- [x] Library of saved games
- [x] Regenerate rate-limited images

## Roadmap

### Phase 2
- Combat system
- Inventory management
- Skill checks
- NPC interactions

### Phase 3
- Multiplayer support
- Campaign mode
- Character leveling
- Export adventures

## License

MIT License

---

*Made with AI assistance*
