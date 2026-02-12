# Implementation Plan: Production Readiness

**Date:** 2026-02-12
**Status:** Planning
**Based on:** ANALYSIS.md validation

---

## Overview

This plan addresses critical issues identified in the codebase analysis, organized into phases with clear dependencies and priorities. Docker and scheduled cleanup are excluded as they are not current priorities.

---

## Phase 1: Critical Security (P0)

### 1.1 Authentication & Authorization System

**Priority:** P0 - Critical
**Effort:** 3-5 days
**Dependencies:** None

#### Tasks

- [ ] **1.1.1** Install dependencies
  ```bash
  cd backend && npm install jsonwebtoken bcryptjs express-jwt
  ```

- [ ] **1.1.2** Create database schema for users
  - Add `users` table with id, email, password_hash, username, created_at
  - Add migration for foreign keys on saved_games, adventures → users
  - Add `user_id` column to existing tables

- [ ] **1.1.3** Create auth service (`backend/src/services/authService.js`)
  - `hashPassword(password)` - bcrypt hashing
  - `comparePassword(password, hash)` - password verification
  - `generateToken(user)` - JWT generation
  - `verifyToken(token)` - JWT validation

- [ ] **1.1.4** Create auth routes (`backend/src/routes/auth.js`)
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User login
  - `GET /api/auth/me` - Get current user
  - `POST /api/auth/logout` - Logout (optional, client-side token removal)

- [ ] **1.1.5** Create auth middleware (`backend/src/middleware/auth.js`)
  - `requireAuth` - Protect routes requiring authentication
  - `optionalAuth` - Attach user if token present, don't block
  - Token extraction from Authorization header

- [ ] **1.1.6** Update existing routes to use auth middleware
  - Adventures: requireAuth for create/delete, optionalAuth for read
  - Games: requireAuth for all operations
  - Saved Games: requireAuth, filter by user_id
  - Settings: requireAuth, user-specific settings

- [ ] **1.1.7** Update frontend auth integration (`frontend/src/services/api.js`)
  - Login/register forms
  - Token storage and retrieval
  - Auto-attach token to requests (already partially done)
  - Handle 401 responses (redirect to login)

- [ ] **1.1.8** Create login/register UI components
  - Login page
  - Register page
  - Protected route wrapper

**Files to Create:**
- `backend/src/services/authService.js`
- `backend/src/routes/auth.js`
- `backend/src/middleware/auth.js`
- `backend/src/migrations/001_add_users.js`
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Register.jsx`
- `frontend/src/components/auth/ProtectedRoute.jsx`

**Files to Modify:**
- `backend/src/config/database.js`
- `backend/src/app.js`
- `backend/src/routes/adventures.js`
- `backend/src/routes/games.js`
- `backend/src/routes/savedGames.js`
- `backend/src/routes/settings.js`
- `frontend/src/services/api.js`
- `frontend/src/App.jsx`

---

### 1.2 Rate Limiting

**Priority:** P0 - Critical
**Effort:** 0.5 days
**Dependencies:** None

#### Tasks

- [ ] **1.2.1** Install dependencies
  ```bash
  cd backend && npm install express-rate-limit
  ```

- [ ] **1.2.2** Create rate limiter configuration (`backend/src/middleware/rateLimiter.js`)
  - General API limiter (100 requests/15min)
  - AI generation limiter (10 requests/15min) - stricter for expensive ops
  - Auth limiter (5 login attempts/15min) - prevent brute force

- [ ] **1.2.3** Apply rate limiters to routes
  - AI routes: `/api/adventures/generate`, `/api/adventures/generate-*`
  - Auth routes: `/api/auth/login`, `/api/auth/register`
  - General: All `/api/*` routes

- [ ] **1.2.4** Add rate limit headers to responses
  - X-RateLimit-Limit
  - X-RateLimit-Remaining
  - X-RateLimit-Reset

**Files to Create:**
- `backend/src/middleware/rateLimiter.js`

**Files to Modify:**
- `backend/src/app.js`
- `backend/src/routes/auth.js`
- `backend/src/routes/adventures.js`

---

### 1.3 Input Sanitization & Validation

**Priority:** P0 - Critical
**Effort:** 1-2 days
**Dependencies:** None

#### Tasks

- [ ] **1.3.1** Install dependencies
  ```bash
  cd backend && npm install zod
  cd frontend && npm install zod
  ```

- [ ] **1.3.2** Create validation schemas (`backend/src/validations/`)
  - `auth.schema.js` - Login/register validation
  - `adventure.schema.js` - Adventure generation params
  - `game.schema.js` - Game actions validation
  - `settings.schema.js` - Settings validation

- [ ] **1.3.3** Create validation middleware (`backend/src/middleware/validate.js`)
  - Schema-based validation wrapper
  - Return proper 400 errors with details

- [ ] **1.3.4** Apply validation to all routes

- [ ] **1.3.5** Install DOMPurify for frontend
  ```bash
  cd frontend && npm install dompurify
  ```

- [ ] **1.3.6** Sanitize AI-generated content before display
  - Create `frontend/src/utils/sanitize.js`
  - Apply to narrative text, descriptions

**Files to Create:**
- `backend/src/validations/auth.schema.js`
- `backend/src/validations/adventure.schema.js`
- `backend/src/validations/game.schema.js`
- `backend/src/validations/settings.schema.js`
- `backend/src/middleware/validate.js`
- `frontend/src/utils/sanitize.js`

**Files to Modify:**
- All route files in `backend/src/routes/`
- `frontend/src/components/game/StoryGenerator.jsx`

---

### 1.4 API Key Management Improvements

**Priority:** P0 - Critical
**Effort:** 0.5 days
**Dependencies:** None

#### Tasks

- [ ] **1.4.1** Add pre-commit hook for .env protection
  - Install husky and lint-staged
  - Configure to block .env commits

- [ ] **1.4.2** Add startup validation for required env vars
  - Create `backend/src/config/validateEnv.js`
  - Fail fast if GROQ_API_KEY missing
  - Warn if optional keys missing

- [ ] **1.4.3** Mask sensitive values in logs
  - Update logger to redact API keys
  - Never log full API keys

- [ ] **1.4.4** Document key rotation process
  - Add section to README
  - Include in .env.example comments

**Files to Create:**
- `backend/src/config/validateEnv.js`

**Files to Modify:**
- `backend/package.json` (add husky)
- `backend/src/app.js` (add env validation)
- `backend/src/utils/logger.js` (redact sensitive values)
- `backend/.env.example`

---

## Phase 2: Database Performance (P0)

### 2.1 Migrate to Async SQLite

**Priority:** P0 - Critical
**Effort:** 2-3 days
**Dependencies:** None (can run parallel with Phase 1)

#### Tasks

- [ ] **2.1.1** Install async sqlite3
  ```bash
  cd backend && npm uninstall better-sqlite3
  cd backend && npm install sqlite3
  ```

- [ ] **2.1.2** Create async database wrapper (`backend/src/config/database.js`)
  - Promisify all database operations
  - Connection management
  - Error handling

- [ ] **2.1.3** Update all database calls to async/await
  - Routes: adventures, games, savedGames, settings, images
  - Services: groqService, imageService
  - Use transactions where appropriate

- [ ] **2.1.4** Add connection pooling configuration
  - Max connections
  - Connection timeout
  - Queue management

**Files to Modify:**
- `backend/package.json`
- `backend/src/config/database.js`
- All route files in `backend/src/routes/`
- All service files in `backend/src/services/`

---

### 2.2 Database Indexing

**Priority:** P1 - High
**Effort:** 0.5 days
**Dependencies:** 2.1 (async DB)

#### Tasks

- [ ] **2.2.1** Add indexes to schema
  ```sql
  CREATE INDEX idx_scenes_adventure_id ON scenes(adventure_id);
  CREATE INDEX idx_scenes_order ON scenes(adventure_id, scene_order);
  CREATE INDEX idx_npcs_adventure_id ON npcs(adventure_id);
  CREATE INDEX idx_saved_games_adventure ON saved_games(adventure_id);
  CREATE INDEX idx_saved_games_user ON saved_games(user_id);
  CREATE INDEX idx_images_hash ON images(hash);
  ```

- [ ] **2.2.2** Create migration script for existing databases
  - Check if indexes exist before creating
  - Run on startup

**Files to Modify:**
- `backend/src/config/database.js`

---

## Phase 3: Reliability Improvements (P1)

### 3.1 Enhanced Health Checks

**Priority:** P1 - High
**Effort:** 0.5 days
**Dependencies:** 2.1 (async DB)

#### Tasks

- [ ] **3.1.1** Create health check service (`backend/src/services/healthService.js`)
  - `checkDatabase()` - Run simple query
  - `checkGroqAPI()` - Test Groq connectivity
  - `checkPollinationsAPI()` - Test image service
  - `checkFileSystem()` - Verify data directory writable

- [ ] **3.1.2** Update `/health` endpoint
  - Return status of all dependencies
  - Include response times
  - Return 503 if any critical dependency down

- [ ] **3.1.3** Add `/health/live` and `/health/ready` endpoints
  - `/health/live` - Basic liveness (always 200)
  - `/health/ready` - Readiness (checks dependencies)

**Files to Create:**
- `backend/src/services/healthService.js`

**Files to Modify:**
- `backend/src/app.js`

---

### 3.2 Configuration Validation

**Priority:** P1 - High
**Effort:** 0.5 days
**Dependencies:** 1.4 (partial)

#### Tasks

- [ ] **3.2.1** Create config validation on startup
  - Required: GROQ_API_KEY, DATABASE_PATH
  - Optional: POLLINATIONS_API_KEY, PORT, LOG_LEVEL
  - Validate types and ranges

- [ ] **3.2.2** Add config documentation
  - Document all environment variables
  - Add to README.md

**Files to Modify:**
- `backend/src/config/validateEnv.js`
- `backend/src/app.js`
- `README.md`

---

### 3.3 AI Output Validation

**Priority:** P1 - High
**Effort:** 1 day
**Dependencies:** 1.3 (zod installed)

#### Tasks

- [ ] **3.3.1** Create AI response schemas (`backend/src/validations/ai.schema.js`)
  - Adventure response schema
  - Scene response schema
  - Context response schema
  - Character name schema

- [ ] **3.3.2** Add schema validation to groqService
  - Validate all AI responses before use
  - Provide fallback values for missing fields
  - Log validation failures for debugging

- [ ] **3.3.3** Add retry logic for malformed responses
  - Retry up to 2 times with modified prompt
  - Use defaults if all retries fail

**Files to Create:**
- `backend/src/validations/ai.schema.js`

**Files to Modify:**
- `backend/src/services/groqService.js`

---

### 3.4 Image Generation Reliability

**Priority:** P1 - High
**Effort:** 1-2 days
**Dependencies:** None

#### Tasks

- [ ] **3.4.1** Add retry logic with exponential backoff
  - Retry failed image fetches up to 3 times
  - Exponential backoff: 1s, 2s, 4s

- [ ] **3.4.2** Implement circuit breaker pattern
  - Track consecutive failures
  - Open circuit after 5 failures
  - Half-open after 30 seconds
  - Close on success

- [ ] **3.4.3** Add fallback image handling
  - Return placeholder on failure
  - Log failures for monitoring

- [ ] **3.4.4** Add timeout configuration
  - Reduce from 90s to 30s
  - Make configurable via env

**Files to Create:**
- `backend/src/utils/circuitBreaker.js`

**Files to Modify:**
- `backend/src/services/imageService.js`
- `backend/.env.example`

---

### 3.5 Error Handling Improvements

**Priority:** P1 - High
**Effort:** 1-2 days
**Dependencies:** None

#### Tasks

- [ ] **3.5.1** Create custom error classes (`backend/src/utils/errors.js`)
  - `AppError` - Base error class
  - `ValidationError` - Input validation errors
  - `AuthenticationError` - Auth failures
  - `NotFoundError` - Resource not found
  - `ExternalAPIError` - Groq/Pollinations failures
  - `DatabaseError` - Database errors

- [ ] **3.5.2** Update error handler middleware
  - Handle custom error types appropriately
  - Return proper HTTP status codes
  - Hide internal details in production

- [ ] **3.5.3** Create frontend error handling utility
  - Centralized error display
  - Retry mechanisms
  - Offline detection

**Files to Create:**
- `backend/src/utils/errors.js`
- `frontend/src/utils/errors.js`

**Files to Modify:**
- `backend/src/middleware/errorHandler.js`
- All frontend components using try/catch

---

### 3.6 Request Size Limits

**Priority:** P1 - High
**Effort:** 0.25 days
**Dependencies:** None

#### Tasks

- [ ] **3.6.1** Add body size limits to express.json()
  ```javascript
  app.use(express.json({ limit: '1mb' }));
  ```

- [ ] **3.6.2** Add per-route limits for expensive endpoints
  - Adventure generation: 10kb max
  - Image uploads (if added): 5mb max

**Files to Modify:**
- `backend/src/app.js`

---

## Phase 4: Frontend Improvements (P1)

### 4.1 Environment-Based API URL

**Priority:** P1 - High
**Effort:** 0.25 days
**Dependencies:** None

#### Tasks

- [ ] **4.1.1** Create environment configuration
  ```javascript
  // frontend/src/config/api.js
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  ```

- [ ] **4.1.2** Update api.js to use config

- [ ] **4.1.3** Add .env.example for frontend
  ```
  VITE_API_URL=http://localhost:3000
  ```

- [ ] **4.1.4** Document environment setup

**Files to Create:**
- `frontend/src/config/api.js`
- `frontend/.env.example`

**Files to Modify:**
- `frontend/src/services/api.js`

---

### 4.2 React Error Boundaries

**Priority:** P1 - High
**Effort:** 0.5 days
**Dependencies:** None

#### Tasks

- [ ] **4.2.1** Create ErrorBoundary component (`frontend/src/components/common/ErrorBoundary.jsx`)
  - Catch React errors
  - Display fallback UI
  - Provide reset/retry button
  - Log errors to console/service

- [ ] **4.2.2** Wrap app sections with error boundaries
  - Route-level boundaries
  - Component-level for game area

- [ ] **4.2.3** Create error fallback UI
  - User-friendly message
  - Retry button
  - Link to home

**Files to Create:**
- `frontend/src/components/common/ErrorBoundary.jsx`
- `frontend/src/components/common/ErrorFallback.jsx`

**Files to Modify:**
- `frontend/src/App.jsx`
- `frontend/src/pages/Game.jsx`

---

### 4.3 Loading & Error States

**Priority:** P1 - High
**Effort:** 1 day
**Dependencies:** 3.5 (error handling)

#### Tasks

- [ ] **4.3.1** Create loading state components
  - Skeleton loaders for content
  - Progress indicators for long operations
  - Button loading states

- [ ] **4.3.2** Replace all `alert()` calls with proper UI
  - Toast notifications for errors
  - Inline error messages for forms
  - Confirmation dialogs for destructive actions

- [ ] **4.3.3** Add offline detection and UI
  - Detect network status
  - Show offline banner
  - Queue actions for retry

**Files to Create:**
- `frontend/src/components/ui/Skeleton.jsx`
- `frontend/src/components/ui/ConfirmDialog.jsx`
- `frontend/src/components/common/OfflineBanner.jsx`

**Files to Modify:**
- All pages and components using alert()
- `frontend/src/store/gameStore.js`

---

## Phase 5: Testing Infrastructure (P1)

### 5.1 Backend Testing Setup

**Priority:** P1 - High
**Effort:** 2-3 days
**Dependencies:** 2.1 (async DB)

#### Tasks

- [ ] **5.1.1** Install testing dependencies
  ```bash
  cd backend && npm install -D vitest supertest
  ```

- [ ] **5.1.2** Configure Vitest (`backend/vitest.config.js`)
  - Test directory setup
  - Coverage reporting
  - In-memory database for tests

- [ ] **5.1.3** Create test utilities (`backend/tests/utils/`)
  - Database setup/teardown
  - Mock factories
  - Test data generators

- [ ] **5.1.4** Write unit tests for services
  - `tests/unit/services/groqService.test.js`
  - `tests/unit/services/imageService.test.js`
  - `tests/unit/services/authService.test.js`

- [ ] **5.1.5** Write unit tests for utilities
  - `tests/unit/utils/helpers.test.js`
  - `tests/unit/utils/circuitBreaker.test.js`

- [ ] **5.1.6** Write integration tests for routes
  - `tests/integration/routes/auth.test.js`
  - `tests/integration/routes/adventures.test.js`
  - `tests/integration/routes/games.test.js`

- [ ] **5.1.7** Add npm scripts
  ```json
  "test": "vitest",
  "test:coverage": "vitest --coverage",
  "test:watch": "vitest --watch"
  ```

**Files to Create:**
- `backend/vitest.config.js`
- `backend/tests/setup.js`
- `backend/tests/utils/db.js`
- `backend/tests/utils/factories.js`
- `backend/tests/unit/services/*.test.js`
- `backend/tests/unit/utils/*.test.js`
- `backend/tests/integration/routes/*.test.js`

**Files to Modify:**
- `backend/package.json`

---

### 5.2 Frontend Testing Setup

**Priority:** P1 - High
**Effort:** 2 days
**Dependencies:** None

#### Tasks

- [ ] **5.2.1** Install testing dependencies
  ```bash
  cd frontend && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
  ```

- [ ] **5.2.2** Configure Vitest for React (`frontend/vitest.config.js`)
  - jsdom environment
  - Setup files
  - Coverage config

- [ ] **5.2.3** Create test utilities
  - Custom render with providers
  - Mock API responses
  - User event helpers

- [ ] **5.2.4** Write component tests
  - `tests/components/ui/Button.test.jsx`
  - `tests/components/game/DiceRoller.test.jsx`
  - `tests/components/common/ErrorBoundary.test.jsx`

- [ ] **5.2.5** Write store tests
  - `tests/store/gameStore.test.js`

- [ ] **5.2.6** Write utility tests
  - `tests/utils/sanitize.test.js`

**Files to Create:**
- `frontend/vitest.config.js`
- `frontend/tests/setup.js`
- `frontend/tests/utils/render.jsx`
- `frontend/tests/utils/mocks.js`
- `frontend/tests/components/**/*.test.jsx`
- `frontend/tests/store/*.test.js`

**Files to Modify:**
- `frontend/package.json`

---

## Phase 6: Code Quality (P2)

### 6.1 Structured Logging

**Priority:** P2 - Medium
**Effort:** 1 day
**Dependencies:** None

#### Tasks

- [ ] **6.1.1** Enhance Winston logger configuration
  - Add correlation IDs
  - JSON format in production
  - Pretty format in development
  - Proper log levels

- [ ] **6.1.2** Replace all console.log with logger
  - Search and replace throughout codebase
  - Use appropriate log levels

- [ ] **6.1.3** Add request ID middleware
  - Generate unique ID for each request
  - Include in all logs

**Files to Modify:**
- `backend/src/utils/logger.js`
- All backend files using console.log
- `backend/src/middleware/logger.js`

---

### 6.2 Extract Duplicate Code

**Priority:** P2 - Medium
**Effort:** 1 day
**Dependencies:** None

#### Tasks

- [ ] **6.2.1** Create shared utilities (`backend/src/utils/dice.js`)
  - `rollStat()` - Character stat rolling
  - `rollDice(sides, count)` - Generic dice rolling
  - `calculateHP()` - HP calculation

- [ ] **6.2.2** Create shared validation utilities
  - Common validation patterns
  - Reusable middleware

- [ ] **6.2.3** Refactor duplicated code to use utilities
  - Routes that duplicate logic
  - Services with similar patterns

**Files to Create:**
- `backend/src/utils/dice.js`

**Files to Modify:**
- Routes and services with duplicated code

---

### 6.3 Configuration Constants

**Priority:** P2 - Medium
**Effort:** 0.5 days
**Dependencies:** None

#### Tasks

- [ ] **6.3.1** Create constants file (`backend/src/config/constants.js`)
  - Timeouts
  - Scene counts by adventure length
  - Stat ranges
  - Default values

- [ ] **6.3.2** Replace magic numbers with constants
  - Search for hardcoded values
  - Replace with named constants

**Files to Create:**
- `backend/src/config/constants.js`

**Files to Modify:**
- Files with magic numbers

---

### 6.4 Pre-commit Hooks

**Priority:** P2 - Medium
**Effort:** 0.5 days
**Dependencies:** None

#### Tasks

- [ ] **6.4.1** Configure Husky
  - Pre-commit: lint staged files
  - Pre-commit: block .env files
  - Pre-push: run tests

- [ ] **6.4.2** Configure lint-staged
  - ESLint for .js files
  - Prettier for formatting

**Files to Modify:**
- `package.json` (root or backend)
- `.husky/pre-commit`

---

## Phase 7: Optional Enhancements (P3)

These are lower priority and can be done after core issues are resolved.

### 7.1 CSRF Protection
- Install csurf middleware
- Add CSRF tokens to forms
- Validate on state-changing requests

### 7.2 Offline Support
- Add service worker with Workbox
- Cache static assets
- Cache API responses with validation
- Queue offline actions

### 7.3 Analytics
- Add Google Analytics or Plausible
- Track key events (adventures created, games played)
- Monitor AI API usage

### 7.4 Character System Enhancement
- Add more character classes
- Implement level progression
- Add skills and abilities
- Equipment and inventory

---

## Execution Order

### Week 1: Critical Security
1. Rate Limiting (1.2) - 0.5 days
2. Input Validation (1.3) - 1-2 days
3. API Key Management (1.4) - 0.5 days
4. Request Size Limits (3.6) - 0.25 days
5. Start Auth System (1.1) - 2 days

### Week 2: Database & Reliability
1. Complete Auth System (1.1) - 1-2 days
2. Async Database Migration (2.1) - 2-3 days
3. Database Indexing (2.2) - 0.5 days
4. Health Checks (3.1) - 0.5 days
5. Config Validation (3.2) - 0.5 days

### Week 3: Reliability & Frontend
1. AI Output Validation (3.3) - 1 day
2. Image Generation Reliability (3.4) - 1-2 days
3. Error Handling (3.5) - 1-2 days
4. Environment API URL (4.1) - 0.25 days
5. Error Boundaries (4.2) - 0.5 days

### Week 4: Testing & Quality
1. Loading/Error States (4.3) - 1 day
2. Backend Testing (5.1) - 2-3 days
3. Frontend Testing (5.2) - 2 days
4. Structured Logging (6.1) - 1 day
5. Extract Duplicate Code (6.2) - 1 day

### Week 5+: Polish
1. Configuration Constants (6.3) - 0.5 days
2. Pre-commit Hooks (6.4) - 0.5 days
3. Optional enhancements as needed

---

## Success Criteria

After completing this plan:

- [ ] User authentication with JWT tokens
- [ ] Rate limiting on all API endpoints
- [ ] Input validation with Zod schemas
- [ ] Async database operations with connection pooling
- [ ] Database indexes for performance
- [ ] Comprehensive health checks
- [ ] Validated AI responses with fallbacks
- [ ] Retry logic for external APIs
- [ ] Custom error classes and proper handling
- [ ] Environment-based configuration
- [ ] React Error Boundaries
- [ ] Proper loading/error UI states
- [ ] 80%+ test coverage on backend
- [ ] 60%+ test coverage on frontend
- [ ] Structured logging with request IDs
- [ ] No duplicate code patterns
- [ ] No magic numbers

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Auth system breaks existing games | Medium | High | Add migration for user_id, test thoroughly |
| Async DB migration breaks queries | Medium | High | Comprehensive testing, gradual rollout |
| Rate limiting too aggressive | Low | Medium | Monitor, adjust limits as needed |
| Test setup takes longer than expected | Medium | Low | Start with critical paths, expand later |

---

## Notes

- Each phase should be tested before moving to the next
- Keep a development branch for each major feature
- Update this plan as issues are discovered
- Document any deviations from the plan

---

**Document Version:** 1.0
**Last Updated:** 2026-02-12
