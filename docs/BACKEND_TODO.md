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
- [x] Initialize SQLite database
- [x] Create database schema:
  - [x] `adventures` table
  - [x] `scenes` table
  - [x] `npcs` table
  - [x] `saved_games` table
  - [x] `settings` table
- [x] Create database initialization script
- [ ] Implement database connection pooling
- [ ] Add database migration system (for future updates)

## Phase 3: Groq API Integration
- [x] Create Groq service (`services/groqService.js`)
- [x] Implement chat completion function
- [x] Create adventure generation prompt templates
- [x] Create scene response prompt templates
- [x] Implement JSON parsing and validation
- [x] Add error handling and retry logic
- [ ] Test with sample adventure generation

## Phase 4: Pollinations.ai Integration
- [x] Create image service (`services/imageService.js`)
- [x] Research Pollinations.ai API documentation
- [x] Implement image generation function
- [x] Create prompt enhancement (add style keywords)
- [x] Implement error handling and fallback to placeholders
- [ ] Test image generation for different scene types

## Phase 5: API Routes - Adventures
- [x] Create adventure routes (`routes/adventures.js`)
- [x] Implement `POST /api/adventures/generate`
  - [x] Validate input (theme, tone, difficulty)
  - [x] Call Groq service
  - [x] Generate images for scenes
  - [x] Save to database
  - [x] Return structured response
- [x] Implement `GET /api/adventures/:id`
- [x] Implement `GET /api/adventures` (list all)
- [ ] Add input validation middleware

## Phase 6: API Routes - Game Play
- [x] Create game routes (`routes/games.js`)
- [x] Implement `POST /api/games/start`
  - [x] Validate adventure ID and character data
  - [x] Generate character stats (3d6 per stat)
  - [x] Load first scene
  - [x] Create saved game entry
- [x] Implement `GET /api/games/:id`
  - [x] Load game state
  - [x] Return current scene and character data
- [x] Implement `POST /api/games/:id/choice`
  - [x] Validate choice ID and dice roll
  - [x] Call Groq for outcome
  - [x] Update character state (HP, inventory, gold)
  - [x] Generate next scene or conclude adventure
  - [x] Update saved game
- [x] Implement `POST /api/games/:id/save` (manual save)
- [x] Add dice roll validation (must be 1-20)

## Phase 7: API Routes - Saved Games
- [x] Create saved game routes (`routes/savedGames.js`)
- [x] Implement `GET /api/saved-games` (list with metadata)
- [x] Implement `DELETE /api/saved-games/:id`
- [x] Add pagination support for saved games list
- [x] Add filtering by date, adventure, etc.

## Phase 8: API Routes - Settings
- [x] Create settings routes (`routes/settings.js`)
- [x] Implement `GET /api/settings`
  - [x] Return current settings from database
- [x] Implement `PUT /api/settings`
  - [x] Validate input
  - [x] Update settings in database
- [x] Implement `GET /api/ai/test`
  - [x] Test Groq API connection
  - [x] Test Pollinations.ai connection
  - [x] Return status report

## Phase 9: Middleware & Utilities
- [x] Create error handling middleware
- [x] Create logging middleware (request/response)
- [x] Create request validation middleware
- [ ] Implement rate limiting (if needed)
- [ ] Add CORS configuration
- [x] Create utility functions:
  - [x] Dice roll simulation
  - [x] Character stat calculation
  - [x] Response formatting

## Phase 10: Testing
- [x] Write unit tests for Groq service
- [x] Write unit tests for image service
- [x] Write integration tests for API endpoints
- [x] Test with real Groq API (dev environment)
- [x] Test with real Pollinations.ai API (dev environment)
- [ ] Load testing for adventure generation
- [ ] Error scenario testing (API failures, timeouts)

## Phase 11: Documentation
- [x] Write API documentation (OpenAPI/Swagger)
- [x] Create setup guide for local development
- [x] Document environment variables
- [x] Create troubleshooting guide
- [x] Add code comments for complex logic

## Phase 12: Production Readiness
- [x] Add environment-specific configs (dev/staging/prod)
- [x] Implement proper logging (winston or similar)
- [x] Add health check endpoint (`/health`)
- [ ] Set up database backups
- [ ] Add performance monitoring
- [ ] Security audit (input validation, SQL injection prevention)
- [ ] Create Docker configuration (optional)

---

**Total Tasks:** ~65

**Estimated Timeline:** 4-5 weeks (parallel with frontend development)

---

*Created: February 12, 2026*
