# Backend Todo List

## Phase 1: Project Setup
- [x] Initialize Express project with npm init
- [x] Install core dependencies:
  - [x] `express`
  - [x] `cors`
  - [x] `dotenv`
  - [x] `better-sqlite3` (or `sqlite3`)
  - [x] `axios` (for Groq API calls)
- [x] Set up project structure:
  ```
  backend/
  ├── src/
  │   ├── config/
  │   │   └── database.js
  │   ├── controllers/
  │   ├── routes/
  │   ├── services/
  │   ├── middleware/
  │   └── app.js
  ├── .env
  └── package.json
  ```
- [x] Configure nodemon for development
- [x] Set up ESLint for code quality

## Phase 2: Database Setup
- [ ] Initialize SQLite database
- [ ] Create database schema:
  - [ ] `adventures` table
  - [ ] `scenes` table
  - [ ] `npcs` table
  - [ ] `saved_games` table
  - [ ] `settings` table
- [ ] Create database initialization script
- [ ] Implement database connection pooling
- [ ] Add database migration system (for future updates)

## Phase 3: Groq API Integration
- [ ] Create Groq service (`services/groqService.js`)
- [ ] Implement chat completion function
- [ ] Create adventure generation prompt templates
- [ ] Create scene response prompt templates
- [ ] Implement JSON parsing and validation
- [ ] Add error handling and retry logic
- [ ] Test with sample adventure generation

## Phase 4: Pollinations.ai Integration
- [ ] Create image service (`services/imageService.js`)
- [ ] Research Pollinations.ai API documentation
- [ ] Implement image generation function
- [ ] Create prompt enhancement (add style keywords)
- [ ] Implement error handling and fallback to placeholders
- [ ] Test image generation for different scene types

## Phase 5: API Routes - Adventures
- [ ] Create adventure routes (`routes/adventures.js`)
- [ ] Implement `POST /api/adventures/generate`
  - [ ] Validate input (theme, tone, difficulty)
  - [ ] Call Groq service
  - [ ] Generate images for scenes
  - [ ] Save to database
  - [ ] Return structured response
- [ ] Implement `GET /api/adventures/:id`
- [ ] Implement `GET /api/adventures` (list all)
- [ ] Add input validation middleware

## Phase 6: API Routes - Game Play
- [ ] Create game routes (`routes/games.js`)
- [ ] Implement `POST /api/games/start`
  - [ ] Validate adventure ID and character data
  - [ ] Generate character stats (3d6 per stat)
  - [ ] Load first scene
  - [ ] Create saved game entry
- [ ] Implement `GET /api/games/:id`
  - [ ] Load game state
  - [ ] Return current scene and character data
- [ ] Implement `POST /api/games/:id/choice`
  - [ ] Validate choice ID and dice roll
  - [ ] Call Groq for outcome
  - [ ] Update character state (HP, inventory, gold)
  - [ ] Generate next scene or conclude adventure
  - [ ] Update saved game
- [ ] Implement `POST /api/games/:id/save` (manual save)
- [ ] Add dice roll validation (must be 1-20)

## Phase 7: API Routes - Saved Games
- [ ] Create saved game routes (`routes/savedGames.js`)
- [ ] Implement `GET /api/saved-games` (list with metadata)
- [ ] Implement `DELETE /api/saved-games/:id`
- [ ] Add pagination support for saved games list
- [ ] Add filtering by date, adventure, etc.

## Phase 8: API Routes - Settings
- [ ] Create settings routes (`routes/settings.js`)
- [ ] Implement `GET /api/settings`
  - [ ] Return current settings from database
- [ ] Implement `PUT /api/settings`
  - [ ] Validate input
  - [ ] Update settings in database
- [ ] Implement `GET /api/ai/test`
  - [ ] Test Groq API connection
  - [ ] Test Pollinations.ai connection
  - [ ] Return status report

## Phase 9: Middleware & Utilities
- [ ] Create error handling middleware
- [ ] Create logging middleware (request/response)
- [ ] Create request validation middleware
- [ ] Implement rate limiting (if needed)
- [ ] Add CORS configuration
- [ ] Create utility functions:
  - [ ] Dice roll simulation
  - [ ] Character stat calculation
  - [ ] Response formatting

## Phase 10: Testing
- [ ] Write unit tests for Groq service
- [ ] Write unit tests for image service
- [ ] Write integration tests for API endpoints
- [ ] Test with real Groq API (dev environment)
- [ ] Test with real Pollinations.ai API (dev environment)
- [ ] Load testing for adventure generation
- [ ] Error scenario testing (API failures, timeouts)

## Phase 11: Documentation
- [ ] Write API documentation (OpenAPI/Swagger)
- [ ] Create setup guide for local development
- [ ] Document environment variables
- [ ] Create troubleshooting guide
- [ ] Add code comments for complex logic

## Phase 12: Production Readiness
- [ ] Add environment-specific configs (dev/staging/prod)
- [ ] Implement proper logging (winston or similar)
- [ ] Add health check endpoint (`/health`)
- [ ] Set up database backups
- [ ] Add performance monitoring
- [ ] Security audit (input validation, SQL injection prevention)
- [ ] Create Docker configuration (optional)

---

**Total Tasks:** ~65

**Estimated Timeline:** 4-5 weeks (parallel with frontend development)

---

*Created: February 12, 2026*
