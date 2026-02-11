# Dungeons & Dragons AI 🐉

An immersive D&D-style RPG where AI dynamically generates adventures, stories, and atmospheric images.

## Overview

Play through AI-generated fantasy adventures with:
- **Dynamic Storytelling** - Ollama-powered LLM creates unique adventures
- **Atmospheric Visuals** - AI-generated images via Pollinations.ai
- **Replayability** - Branching paths and saved games
- **Simple D&D Mechanics** - Character stats, dice rolls, choices matter

## Tech Stack

- **Frontend:** React.js + Vite + Tailwind CSS
- **Backend:** Express.js + SQLite
- **AI Services:** Ollama (local) + Pollinations.ai

## Getting Started

### Prerequisites

1. **Node.js** (v18+)
2. **Ollama** running locally on `http://localhost:11434`
3. **Ollama model installed:**
   ```bash
   ollama pull llama3.2
   # or
   ollama pull mistral
   ```

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
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
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
- [ ] Ollama integration
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
