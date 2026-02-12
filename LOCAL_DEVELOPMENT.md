# D&D AI - Quick Start Guide

## 🚀 Start the Application

### Option 1: Use the Start Script (Recommended)

The `start.sh` script automatically:
- Checks if ports 3000 (backend) and 5173 (frontend) are available
- Starts both backend and frontend
- Opens in separate terminal windows
- Displays all URLs and health status

**To start:**
```bash
cd ~/projects/dungeons-and-dragons
./start.sh
```

**To stop:** Press `Ctrl+C` in the start script terminal

---

### Option 2: Start Manually

#### Terminal 1 - Backend
```bash
cd ~/projects/dungeons-and-dragons/backend
npm start
```
**Backend URL:** `http://localhost:3000`
**Health Check:** `curl http://localhost:3000/health`

#### Terminal 2 - Frontend
```bash
cd ~/projects/dungeons-and-dragons/frontend
npm run dev
```
**Frontend URL:** `http://localhost:5173`

---

## 🎮 Play the Game

1. **Open browser:** Go to `http://localhost:5173`
2. **Generate Adventure:** Click "Generate New Adventure"
3. **Create Character:** Fill in name, choose class, roll stats
4. **Play:** Make choices, roll d20, watch your adventure unfold!

---

## 📁 Project Structure

```
dungeons-and-dragons/
├── backend/
│   ├── src/
│   │   ├── config/database.js
│   │   ├── routes/ (adventures, games, savedGames, settings)
│   │   ├── services/ (groqService, imageService)
│   │   ├── middleware/ (errorHandler, logger, validator)
│   │   └── app.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/ (Layout, NotFound)
│   │   │   ├── game/ (CharacterCreation, Game components)
│   │   │   └── ui/ (Button, Card, Modal, Toast, etc.)
│   │   ├── pages/ (Home, Library, Game, Settings)
│   │   ├── services/api.js
│   │   ├── store/gameStore.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── database/
│   └── dnd-game.db
├── docs/
│   ├── PRD.md
│   ├── FRONTEND_TODO.md
│   ├── BACKEND_TODO.md
│   ├── API.md
│   └── DEPLOYMENT.md
├── start.sh (quick start script)
└── README.md
```

---

## 🔧 Troubleshooting

### Backend Issues

**"Connection refused" or "EADDRINUSE"**
```bash
# Check if backend is already running
ps aux | grep "node.*backend"
# If running, kill it:
pkill -f "node.*backend"
# Then start again
```

**"Database locked"**
```bash
# Delete and recreate database
cd ~/projects/dungeons-and-dragons/database
rm dnd-game.db
# Backend will recreate on next start
```

### Frontend Issues

**"Port 5173 already in use"**
```bash
# Kill existing process
lsof -ti:5173 | xargs kill -9
# Then restart frontend
```

**"Module not found" errors**
```bash
# Clear cache and reinstall
cd ~/projects/dungeons-and-dragons/frontend
rm -rf node_modules
npm install
```

**"API connection errors"**
```bash
# Check if backend is running
curl http://localhost:3000/health

# Check frontend logs for CORS errors
# Look for errors in browser console (F12)
```

---

## 📊 Monitor Logs

### Backend Logs
```bash
tail -f ~/projects/dungeons-and-dragons/logs/combined.log
```

### Frontend Logs
```bash
# If running with background script
tail -f ~/projects/dungeons-and-dragons/logs/frontend.log

# Or check npm start output
cd ~/projects/dungeons-and-dragons/frontend
npm run dev 2>&1 | tee logs/frontend.log
```

---

## 🎯 Development Workflow

### Backend Development
```bash
cd backend
npm start          # Start backend (monitors for changes)
npm run dev        # Alternative (nodemon)
npm test          # Run tests
```

### Frontend Development
```bash
cd frontend
npm run dev        # Start Vite dev server
npm run build       # Create production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

---

## 🚢 Production Deployment

When ready to deploy to production:

1. **Backend:** Follow `docs/DEPLOYMENT.md`
   - Deploy to Railway, Render, or your VPS
   - Set environment variables
   - Update `frontend/src/services/api.js` with production URL

2. **Frontend:** Deploy to Vercel
   ```bash
   cd frontend
   npm install -g vercel
   vercel
   ```

3. **Database:** Consider migrating to PostgreSQL for production

---

## 📝 API Documentation

Full API documentation available at `docs/API.md`

### Quick API Reference

#### Adventures
- `POST /api/adventures/generate` - Generate new adventure
- `GET /api/adventures/:id` - Get adventure by ID
- `GET /api/adventures` - List all adventures

#### Games
- `POST /api/games/start` - Start new game
- `GET /api/games/:id` - Get game state
- `POST /api/games/:id/choice` - Submit player choice
- `POST /api/games/:id/save` - Manual save

#### Saved Games
- `GET /api/saved-games` - List saved games (with pagination)
- `DELETE /api/saved-games/:id` - Delete saved game

#### Settings
- `GET /api/settings` - Get current settings
- `PUT /api/settings` - Update settings
- `GET /api/settings/ai/test` - Test AI connections

---

## 🎨 Customization

### Change Game Difficulty
Go to `Settings` page and adjust:
- Easy (more favorable dice rolls)
- Medium (balanced gameplay)
- Hard (challenging)

### Adjust AI Settings
- **Image Style:** Fantasy Art, Realistic, Cartoon, Watercolor
- **Dice Animations:** Enable/Disable 3D dice effects
- **Sound Effects:** Enable/Disable (future feature)

---

## 🔒 Environment Variables

All API keys and configuration are in `.env` files:

**Backend (.env):**
- `GROQ_API_KEY` - Your Groq API key
- `GROQ_MODEL` - AI model (llama-3.3-70b-versatile)
- `POLLINATIONS_API_KEY` - Pollinations.ai API key
- `PORT` - Backend port (default: 3000)
- `DATABASE_PATH` - Database file path

**Frontend (.env):**
- `VITE_API_URL` - Backend API URL
- `VITE_NODE_ENV` - Environment mode

---

## 🐛 Known Issues & Workarounds

### Issue: SQLite database file gets corrupted
**Solution:** The database file is stored in `database/dnd-game.db`. If corrupted, delete it and restart backend.

### Issue: Frontend builds slowly on first start
**Solution:** This is normal for the first build. Subsequent builds will be faster.

### Issue: Images don't load
**Solution:** Check Pollinations.ai API key and backend logs for errors. Use placeholder images in development if needed.

---

## 📞 Support

For issues or questions:
1. Check this README
2. Read `docs/API.md`
3. Review `docs/FRONTEND_TODO.md` and `docs/BACKEND_TODO.md`
4. Check logs for error messages

---

*Last Updated: February 12, 2026*
