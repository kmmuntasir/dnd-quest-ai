# Dungeons & Dragons AI 🐉

An immersive D&D-style RPG where AI dynamically generates adventures, stories, and atmospheric images.

## Overview

Play through AI-generated fantasy adventures with:
- **Dynamic Storytelling** - Groq-powered Llama 3.3 70B creates unique adventures
- **Atmospheric Visuals** - AI-generated images via Pollinations.ai
- **Replayability** - Branching paths and saved games
- **Simple D&D Mechanics** - Character stats, dice rolls, choices matter

## Tech Stack

- **Frontend:** React.js + Vite + Tailwind CSS
- **Backend:** Express.js + SQLite
- **AI Services:** Groq API (Llama 3.3 70B) + Pollinations.ai API

## Getting Started

### Prerequisites

1. **Node.js** (v18+)
2. **Groq API key** (free tier) - Get from https://console.groq.com/
3. **Pollinations.ai API key** (free tier) - Get from https://enter.pollinations.ai/

### Installation

```bash
# Clone the repo (coming soon)
git clone <repo-url>
cd dungeons-and-dragons

# Install dependencies
npm install

# Start development
npm run dev
```

### Environment Variables

Create `.env`:
```
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
POLLINATIONS_API_KEY=your_pollinations_api_key_here
PORT=3000
```

## Features

### 🎲 Story Generation
- Automatic adventure creation
- Custom themes (fantasy, horror, sci-fi)
- Difficulty levels (easy, medium, hard)
- AI-generated NPCs and key scenes

### 🖼️ Dynamic Images
- Scene illustrations
- Character portraits
- Item/treasure visuals
- Powered by Pollinations.ai (free)

### 🎮 Gameplay
- Turn-based choices
- d20 dice rolls with modifiers
- Simple D&D-style mechanics
- Character progression (planned)

### 💾 Save System
- Auto-save after each scene
- Multiple save slots
- Resume any adventure
- Replay with different choices

## Development Status

- [x] Project planning (PRD)
- [ ] Frontend setup (React + Vite)
- [ ] Backend setup (Express + SQLite)
- [ ] Groq API integration
- [ ] Pollinations.ai integration
- [ ] Story generation flow
- [ ] Gameplay engine
- [ ] Save/load system
- [ ] UI polish

See `PRD.md` for complete specifications.

## Roadmap

### Phase 1 (MVP)
- ✅ Planning
- ⏳ Core game loop
- ⏳ Save system
- ⏳ Basic styling

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

## Contributing

Coming soon! For now, it's a personal project.

## License

MIT License - see LICENSE file for details.

---

*Made with 💻 by Muntasir*
