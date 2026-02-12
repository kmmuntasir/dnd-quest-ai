# D&D AI Codebase - Implementation Plan

**Created:** February 13, 2026
**Status:** Ready for Execution
**Estimated Effort:** 5 Weeks (can be parallelized)

---

## Overview

This plan addresses all 50 issues identified in the codebase analysis, organized into 5 phases with clear priorities, dependencies, and actionable steps.

### Quick Reference

| Phase | Focus | Priority | Duration | Issues |
|-------|-------|----------|----------|--------|
| 1 | Security Fixes | Critical | Week 1 | 11 |
| 2 | Code Quality | High | Week 1-2 | 12 |
| 3 | Frontend Refactoring | Medium | Week 2-3 | 15 |
| 4 | Testing Infrastructure | Medium | Week 3-4 | Coverage gaps |
| 5 | Performance & Polish | Low | Week 4-5 | 12 |

---

## Phase 1: Critical Security Fixes

**Priority:** CRITICAL
**Duration:** 3-5 days
**Dependencies:** None

### 1.1 Implement Authorization Ownership Checks

**Problem:** Users can access/modify/delete other users' resources.

**Files to Modify:**
- `backend/src/middleware/auth.js`
- `backend/src/routes/savedGames.js`
- `backend/src/routes/games.js`
- `backend/src/routes/adventures.js`
- `backend/src/routes/settings.js`

**Tasks:**

- [ ] **Create ownership middleware** (`backend/src/middleware/ownership.js`)
  ```javascript
  // Create new file with checkResourceOwnership middleware
  // - Accept resourceType ('game', 'adventure', 'settings')
  // - Query database to verify user_id matches req.user.id
  // - Return 403 if mismatch, 404 if not found
  ```

- [ ] **Update savedGames.js routes**
  - Line 189-211: Add ownership check to DELETE `/:id`
  - Line 45-76: Add ownership check to GET `/:id`

- [ ] **Update games.js routes**
  - Line 186-342: Add ownership check to POST `/:id/choice`
  - Line 69-102: Add ownership check to POST `/:id/go-back`
  - Line 347-375: Add ownership check to POST `/:id/restart`

- [ ] **Update adventures.js routes**
  - Line 223-261: Add ownership check to DELETE `/:id`
  - Line 162-218: Add ownership filter to GET `/` (only show user's adventures)

- [ ] **Update settings.js routes**
  - Line 12-32: Add auth middleware to GET `/`
  - Line 38-81: Add auth middleware and user filter to PUT `/`
  - Update to use per-user settings instead of global settings

- [ ] **Test authorization**
  - Verify user cannot access other users' resources
  - Verify proper 403/404 responses

---

### 1.2 Fix CORS Configuration

**Problem:** CORS allows all origins by default.

**File:** `backend/src/app.js`

**Tasks:**

- [ ] **Update CORS configuration** (Line 19)
  ```javascript
  // Replace: app.use(cors());
  // With proper configuration:
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  ```

- [ ] **Add ALLOWED_ORIGINS to .env.example**
  ```
  ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
  ```

- [ ] **Update validateEnv.js**
  - Add warning if ALLOWED_ORIGINS not set in production

---

### 1.3 Enforce Secure JWT Secret

**Problem:** Default JWT secret is predictable.

**File:** `backend/src/config/validateEnv.js`

**Tasks:**

- [ ] **Add production validation** (after line 55)
  ```javascript
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET ||
        process.env.JWT_SECRET.includes('dev-') ||
        process.env.JWT_SECRET.includes('change') ||
        process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be set to a secure random value (min 32 chars) in production');
    }
  }
  ```

- [ ] **Update .env.example**
  ```
  # Required in production - generate with: openssl rand -hex 32
  JWT_SECRET=your-secure-random-string-min-32-characters
  ```

---

### 1.4 Add Input Sanitization

**Problem:** User input not sanitized for XSS.

**Tasks:**

- [ ] **Install sanitize-html**
  ```bash
  cd backend && npm install sanitize-html
  ```

- [ ] **Create sanitization middleware** (`backend/src/middleware/sanitize.js`)
  ```javascript
  const sanitizeHtml = require('sanitize-html');

  const sanitizeDefaults = {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  };

  function sanitizeString(value) {
    if (typeof value !== 'string') return value;
    return sanitizeHtml(value, sanitizeDefaults);
  }

  function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeObject);

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  function sanitizeBody(req, res, next) {
    req.body = sanitizeObject(req.body);
    next();
  }

  module.exports = { sanitizeBody, sanitizeString, sanitizeObject };
  ```

- [ ] **Apply to routes** (`backend/src/app.js`)
  ```javascript
  const { sanitizeBody } = require('./middleware/sanitize');
  app.use(sanitizeBody); // Add after express.json()
  ```

---

### 1.5 Fix Race Conditions with Transactions

**Problem:** Concurrent requests can corrupt game state.

**File:** `backend/src/routes/adventures.js`

**Tasks:**

- [ ] **Wrap adventure generation in transaction** (Lines 86-133)
  ```javascript
  // Wrap the entire adventure, scenes, and NPCs creation
  const result = await db.transaction(async (txn) => {
    const adventureResult = await txn.run(`INSERT INTO adventures...`);
    const adventureId = adventureResult.lastID;

    for (const scene of scenesWithImages) {
      await txn.run(`INSERT INTO scenes...`, [...]);
    }

    for (const npc of npcsWithImages) {
      await txn.run(`INSERT INTO npcs...`, [...]);
    }

    return { adventureId, adventure, scenesWithImages, npcsWithImages };
  });
  ```

- [ ] **Wrap game choice handling in transaction** (`backend/src/routes/games.js` Lines 291-303)

---

### 1.6 Fix Settings SQL Injection

**Problem:** Direct column name interpolation vulnerable to SQL injection.

**File:** `backend/src/routes/settings.js`

**Tasks:**

- [ ] **Use whitelist for column names** (Lines 67-71)
  ```javascript
  const allowedFields = ['image_style', 'difficulty', 'dice_animations'];
  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  values.push(settingsId);
  await db.run(`
    UPDATE settings
    SET ${updates.join(', ')}
    WHERE id = ?
  `, values);
  ```

---

## Phase 2: Code Quality Improvements

**Priority:** HIGH
**Duration:** 3-5 days
**Dependencies:** Phase 1 complete

### 2.1 Add Missing Database Indexes

**File:** `backend/src/config/database.js`

**Tasks:**

- [ ] **Add indexes in runMigrations()** (after line 354)
  ```javascript
  // Add indexes for frequently queried columns
  await this.run(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
  `);
  await this.run(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
  `);
  await this.run(`
    CREATE INDEX IF NOT EXISTS idx_saved_games_user_id ON saved_games(user_id)
  `);
  await this.run(`
    CREATE INDEX IF NOT EXISTS idx_adventures_user_id ON adventures(user_id)
  `);
  await this.run(`
    CREATE INDEX IF NOT EXISTS idx_scenes_adventure_id ON scenes(adventure_id)
  `);
  ```

---

### 2.2 Enable SQLite WAL Mode

**File:** `backend/src/config/database.js`

**Tasks:**

- [ ] **Add WAL mode and busy timeout** (after database connection, line 23)
  ```javascript
  // Enable WAL mode for better concurrent access
  await this.run('PRAGMA journal_mode=WAL');
  // Set busy timeout to 5 seconds
  await this.run('PRAGMA busy_timeout=5000');
  // Enable foreign keys
  await this.run('PRAGMA foreign_keys=ON');
  ```

---

### 2.3 Add Request Timeout Configuration

**File:** `backend/src/app.js`

**Tasks:**

- [ ] **Configure server timeouts** (after server creation, line 84)
  ```javascript
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  // Configure timeouts
  server.setTimeout(30000); // 30 second timeout
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  ```

---

### 2.4 Implement Graceful Shutdown

**File:** `backend/src/app.js`

**Tasks:**

- [ ] **Add shutdown handlers** (at end of file)
  ```javascript
  let isShuttingDown = false;

  const gracefulShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      // Close database connection
      try {
        await db.close();
        logger.info('Database connection closed');
      } catch (error) {
        logger.error('Error closing database', { error: error.message });
      }

      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  ```

---

### 2.5 Fix N+1 Query in savedGames

**File:** `backend/src/routes/savedGames.js`

**Tasks:**

- [ ] **Replace subqueries with JOIN** (Lines 145-167)
  ```javascript
  // Replace subqueries with single JOIN
  const savedGames = await db.all(`
    SELECT
      sg.*,
      s.image_url as scene_image_url,
      s.description as scene_description,
      a.title as adventure_title
    FROM saved_games sg
    LEFT JOIN scenes s ON s.id = sg.current_scene_id
    LEFT JOIN adventures a ON a.id = sg.adventure_id
    WHERE sg.user_id = ?
    ORDER BY sg.last_played DESC
    LIMIT ? OFFSET ?
  `, [req.user.id, limit, offset]);
  ```

---

### 2.6 Remove Unused Code

**Tasks:**

- [ ] **Delete unused validator.js**
  ```bash
  rm backend/src/middleware/validator.js
  ```

- [ ] **Remove unused exports from helpers.js**
  - Review `formatResponse()` and `formatError()` usage
  - Remove if not used

- [ ] **Fix or remove requireOwnership middleware** (`backend/src/middleware/auth.js` Lines 85-100)
  - Either implement proper ownership checking
  - Or remove and replace with new ownership middleware

---

### 2.7 Add User-Based Rate Limiting

**File:** `backend/src/middleware/rateLimiter.js`

**Tasks:**

- [ ] **Create user-based limiter**
  ```javascript
  const createUserLimiter = (windowMs, max) => {
    return rateLimit({
      windowMs,
      max,
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return req.user?.id?.toString() || req.ip;
      },
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          userId: req.user?.id,
          ip: req.ip,
          path: req.path
        });
        res.status(429).json({
          error: 'Too many requests, please try again later'
        });
      }
    });
  };

  module.exports = {
    // ... existing exports
    createUserLimiter
  };
  ```

- [ ] **Apply to AI routes** (`backend/src/routes/adventures.js`)
  ```javascript
  const { createUserLimiter } = require('../middleware/rateLimiter');
  const aiUserLimiter = createUserLimiter(15 * 60 * 1000, 10); // 10 per 15 min per user
  router.post('/generate', aiUserLimiter, validate(generateAdventureSchema), ...);
  ```

---

## Phase 3: Frontend Refactoring

**Priority:** MEDIUM
**Duration:** 5-7 days
**Dependencies:** Phase 1 complete (security fixes)

### 3.1 Fix Toast Hook Anti-Pattern

**File:** `frontend/src/components/ui/ToastContext.jsx`

**Tasks:**

- [ ] **Replace useState with useEffect** (Lines 90-95)
  ```javascript
  // WRONG:
  useState(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(onDismiss, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  // CORRECT:
  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(onDismiss, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onDismiss]);
  ```

---

### 3.2 Fix Import Statement Order

**File:** `frontend/src/components/ui/ConfirmDialog.jsx`

**Tasks:**

- [ ] **Move import to top** (Lines 120-121, 161)
  - The `useState` import is defined after the function that uses it
  - Move all imports to top of file

---

### 3.3 Fix DiceRoller Memory Leak

**File:** `frontend/src/components/game/DiceRoller.jsx`

**Tasks:**

- [ ] **Use useEffect with cleanup** (Lines 16-31)
  ```javascript
  const DiceRoller = ({ onRoll, disabled, finalValue, className }) => {
    const [rolling, setRolling] = useState(false);
    const [diceValue, setDiceValue] = useState(20);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
      if (!rolling) return;

      let currentRotation = rotation;
      const interval = setInterval(() => {
        currentRotation += 30;
        setRotation(currentRotation);
        setDiceValue(Math.floor(Math.random() * 20) + 1);
      }, 50);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        setRotation(currentRotation + 360);
        setDiceValue(finalValue);
        setRolling(false);
        onRoll(finalValue);
      }, 2000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }, [rolling]); // Only re-run when rolling changes

    const handleRoll = () => {
      if (!rolling && !disabled) {
        setRolling(true);
      }
    };

    // ... rest of component
  };
  ```

---

### 3.4 Replace window.location with React Router

**File:** `frontend/src/pages/Game.jsx`

**Tasks:**

- [ ] **Add useNavigate hook** (at top of component)
  ```javascript
  import { useNavigate } from 'react-router-dom';

  // In component:
  const navigate = useNavigate();
  ```

- [ ] **Replace all window.location calls**
  - Line 527: `window.location.href = '/create-character/...'` → `navigate('/create-character/...')`
  - Line 538: `window.location.href = '/library'` → `navigate('/library')`
  - Line 544: `window.location.href = '/library'` → `navigate('/library')`
  - Line 580: `window.location.reload()` → `loadGame()` (reload data, not page)
  - Line 593: `window.location.href = '/library'` → `navigate('/library')`
  - Line 600: `window.location.href = '/library'` → `navigate('/library')`

---

### 3.5 Centralize API Configuration

**File:** Multiple frontend files

**Tasks:**

- [ ] **Remove duplicate API_BASE_URL definitions**
  - Delete from: `Game.jsx`, `Library.jsx`, `Gallery.jsx`, `CharacterCreation.jsx`, `StoryGenerator.jsx`

- [ ] **Use centralized API service**
  ```javascript
  // Instead of:
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const response = await axios.get(`${API_BASE_URL}/games/${gameId}`);

  // Use:
  import { gamesAPI } from '../services/api';
  const response = await gamesAPI.getById(gameId);
  ```

- [ ] **Add missing API methods** (`frontend/src/services/api.js`)
  ```javascript
  export const gamesAPI = {
    getById: (id) => api.get(`/games/${id}`),
    start: (data) => api.post('/games/start', data),
    choice: (id, data) => api.post(`/games/${id}/choice`, data),
    goBack: (id) => api.post(`/games/${id}/go-back`),
    restart: (id) => api.post(`/games/${id}/restart`),
    save: (id) => api.post(`/games/${id}/save`)
  };
  ```

---

### 3.6 Fix Stale Closure in Game.jsx

**File:** `frontend/src/pages/Game.jsx`

**Tasks:**

- [ ] **Use functional state updates** (Lines 171-179)
  ```javascript
  // Instead of capturing game in closure:
  setTimeout(() => {
    setCurrentScene(data.nextScene);
    setNarrative(null);
    setTransitioning(false);
    const isHardMode = game?.adventure?.difficulty === 'hard'; // Stale!
    setCanGoBack(!isHardMode);
  }, 2000);

  // Use functional update or ref:
  const isHardModeRef = useRef(game?.adventure?.difficulty === 'hard');
  useEffect(() => {
    isHardModeRef.current = game?.adventure?.difficulty === 'hard';
  }, [game?.adventure?.difficulty]);

  setTimeout(() => {
    setCurrentScene(data.nextScene);
    setNarrative(null);
    setTransitioning(false);
    setCanGoBack(!isHardModeRef.current);
  }, 2000);
  ```

---

### 3.7 Standardize Error Handling

**Files:** Multiple frontend files

**Tasks:**

- [ ] **Remove all alert() calls**
  - `CharacterCreation.jsx` Lines 107, 124, 139
  - Replace with toast notifications

  ```javascript
  // Instead of:
  alert('Character name is required!');

  // Use:
  import { useToast } from '../components/ui/ToastContext';
  const { error: showError } = useToast();
  showError('Character name is required!');
  ```

- [ ] **Ensure all API errors show toast**
  - Audit all catch blocks
  - Add proper error messages

---

### 3.8 Fix Duplicate rollStat Function

**File:** `frontend/src/components/game/CharacterCreation.jsx`

**Tasks:**

- [ ] **Remove duplicate definition**
  - Line 49-54: Top-level definition
  - Line 77-81: Duplicate inside component
  - Keep only one (preferably top-level utility)

---

### 3.9 Add localStorage Error Handling

**File:** `frontend/src/services/api.js`

**Tasks:**

- [ ] **Wrap localStorage calls** (Lines 17, 43)
  ```javascript
  // Create safe storage utilities
  const safeLocalStorage = {
    get: (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    remove: (key) => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    }
  };

  // Replace all localStorage calls with safeLocalStorage
  const token = safeLocalStorage.get('auth_token');
  ```

---

### 3.10 Add Accessibility Improvements

**Files:** Multiple frontend components

**Tasks:**

- [ ] **Add ARIA labels to buttons**
  ```javascript
  // Game.jsx - Add to all icon-only buttons
  <button
    onClick={handleGoBack}
    aria-label="Go back to previous scene"
  >
    <Undo2 className="w-5 h-5" />
  </button>
  ```

- [ ] **Add ARIA live regions** (`frontend/src/pages/Game.jsx`)
  ```javascript
  // Wrap dynamic content
  <div aria-live="polite" aria-atomic="true" className="sr-only">
    {narrative && `Narrator says: ${narrative}`}
  </div>

  <div aria-live="assertive" aria-atomic="true">
    {diceResult && `You rolled ${diceResult}`}
  </div>
  ```

- [ ] **Add keyboard focus management** (`frontend/src/components/game/Choices.jsx`)
  ```javascript
  const Choices = ({ choices, onSelectChoice, disabled }) => {
    const choiceRefs = useRef([]);
    const [selectedIndex, setSelectedIndex] = useState(null);

    // Focus selected choice on keyboard navigation
    useEffect(() => {
      if (selectedIndex !== null && choiceRefs.current[selectedIndex]) {
        choiceRefs.current[selectedIndex].focus();
      }
    }, [selectedIndex]);

    // ... rest of component with ref={el => choiceRefs.current[i] = el}
  };
  ```

- [ ] **Add screen reader only class** (`frontend/src/index.css`)
  ```css
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  ```

---

### 3.11 Add PropTypes or TypeScript

**Files:** All component files

**Tasks:**

- [ ] **Option A: Add PropTypes** (Quick fix)
  ```bash
  cd frontend && npm install prop-types
  ```
  ```javascript
  import PropTypes from 'prop-types';

  Button.propTypes = {
    variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    disabled: PropTypes.bool,
    loading: PropTypes.bool,
    onClick: PropTypes.func,
    children: PropTypes.node.isRequired
  };
  ```

- [ ] **Option B: Migrate to TypeScript** (Recommended long-term)
  - Rename files to `.tsx`
  - Add type definitions
  - Update build configuration

---

### 3.12 Either Use or Remove Zustand Store

**File:** `frontend/src/store/gameStore.js`

**Tasks:**

- [ ] **Option A: Use the store** (Recommended)
  - Replace local state in Game.jsx with store
  - Connect CharacterCreation to store
  - Persist only non-sensitive settings

- [ ] **Option B: Remove the store**
  ```bash
  rm frontend/src/store/gameStore.js
  npm uninstall zustand
  ```

---

### 3.13 Decompose Game.jsx

**File:** `frontend/src/pages/Game.jsx`

**Tasks:**

- [ ] **Extract GameHeader component**
  ```javascript
  // frontend/src/components/game/GameHeader.jsx
  // Move: Title, adventure info, back button
  ```

- [ ] **Extract SceneDisplay component**
  ```javascript
  // frontend/src/components/game/SceneDisplay.jsx
  // Move: Scene image, description
  ```

- [ ] **Extract CharacterStats component**
  ```javascript
  // frontend/src/components/game/CharacterStats.jsx
  // Move: HP bar, stats display, inventory
  ```

- [ ] **Extract NarrativeDisplay component**
  ```javascript
  // frontend/src/components/game/NarrativeDisplay.jsx
  // Move: Dice roll result, narrative text
  ```

- [ ] **Extract GameModals component**
  ```javascript
  // frontend/src/components/game/GameModals.jsx
  // Move: Victory modal, defeat modal, restart dialog
  ```

- [ ] **Update Game.jsx to use extracted components**
  - Should reduce from 600+ lines to ~100-150 lines

---

## Phase 4: Testing Infrastructure

**Priority:** MEDIUM
**Duration:** 5-7 days
**Dependencies:** Phases 1-3 complete

### 4.1 Backend Route Tests

**Tasks:**

- [ ] **Create savedGames route tests** (`backend/tests/integration/routes/savedGames.test.js`)
  ```javascript
  describe('GET /api/saved-games', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/saved-games');
      expect(res.status).toBe(401);
    });

    it('should only return user own games', async () => {
      // Create games for multiple users
      // Verify only own games returned
    });
  });

  describe('DELETE /api/saved-games/:id', () => {
    it('should prevent deleting other users games', async () => {
      // Test ownership check
    });
  });
  ```

- [ ] **Create games route tests** (`backend/tests/integration/routes/games.test.js`)
  - Test game start
  - Test choice submission
  - Test go-back functionality
  - Test restart

- [ ] **Create adventures route tests** (`backend/tests/integration/routes/adventures.test.js`)
  - Test generation (mock AI services)
  - Test listing
  - Test deletion with ownership

- [ ] **Create settings route tests** (`backend/tests/integration/routes/settings.test.js`)
  - Test auth requirement
  - Test update with valid fields only

---

### 4.2 Backend Service Tests

**Tasks:**

- [ ] **Create groqService tests** (`backend/tests/unit/services/groqService.test.js`)
  - Mock axios
  - Test retry logic
  - Test error handling

- [ ] **Create imageService tests** (`backend/tests/unit/services/imageService.test.js`)
  - Test circuit breaker integration
  - Test caching
  - Test hash generation

---

### 4.3 Backend Middleware Tests

**Tasks:**

- [ ] **Create auth middleware tests** (`backend/tests/unit/middleware/auth.test.js`)
  - Test requireAuth
  - Test optionalAuth
  - Test invalid token handling

- [ ] **Create ownership middleware tests** (`backend/tests/unit/middleware/ownership.test.js`)
  - Test various resource types
  - Test permission denied cases

---

### 4.4 Frontend Component Tests

**Tasks:**

- [ ] **Create DiceRoller tests** (`frontend/tests/components/game/DiceRoller.test.jsx`)
  ```javascript
  describe('DiceRoller', () => {
    it('should call onRoll with dice value', async () => {
      const user = userEvent.setup();
      const onRoll = vi.fn();
      render(<DiceRoller onRoll={onRoll} disabled={false} finalValue={15} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(onRoll).toHaveBeenCalledWith(15);
      });
    });

    it('should be disabled when disabled prop is true', () => {
      render(<DiceRoller onRoll={vi.fn()} disabled={true} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });
  ```

- [ ] **Create Choices tests** (`frontend/tests/components/game/Choices.test.jsx`)
- [ ] **Create CharacterCreation tests** (`frontend/tests/components/game/CharacterCreation.test.jsx`)
- [ ] **Create Toast tests** (`frontend/tests/components/ui/Toast.test.jsx`)

---

### 4.5 Frontend Page Tests

**Tasks:**

- [ ] **Create Game page tests** (`frontend/tests/pages/Game.test.jsx`)
  - Mock API calls
  - Test loading states
  - Test error handling
  - Test game flow

- [ ] **Create Library page tests** (`frontend/tests/pages/Library.test.jsx`)
- [ ] **Create Settings page tests** (`frontend/tests/pages/Settings.test.jsx`)

---

### 4.6 Integration Tests

**Tasks:**

- [ ] **Set up Playwright** (optional E2E testing)
  ```bash
  cd frontend && npm install -D @playwright/test
  npx playwright install
  ```

- [ ] **Create E2E test for game flow**
  ```javascript
  // frontend/e2e/game.spec.js
  test('complete game flow', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Start Adventure');
    // ... continue through flow
  });
  ```

---

### 4.7 Coverage Targets

**Tasks:**

- [ ] **Backend coverage goal: 80%**
  - Run: `npm test -- --coverage`
  - Focus on routes and services

- [ ] **Frontend coverage goal: 70%**
  - Run: `npm test -- --coverage`
  - Focus on components and pages

---

## Phase 5: Performance & Polish

**Priority:** LOW
**Duration:** 3-5 days
**Dependencies:** Phases 1-4 complete

### 5.1 Add Code Splitting

**File:** `frontend/src/App.jsx`

**Tasks:**

- [ ] **Lazy load pages**
  ```javascript
  import { lazy, Suspense } from 'react';
  import { LoadingSpinner } from './components/ui/LoadingSpinner';

  const Game = lazy(() => import('./pages/Game'));
  const Library = lazy(() => import('./pages/Library'));
  const Gallery = lazy(() => import('./pages/Gallery'));
  const Settings = lazy(() => import('./pages/Settings'));

  const LoadingPage = () => (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" />
    </div>
  );

  // In routes:
  {
    path: 'game/:gameId',
    element: (
      <Suspense fallback={<LoadingPage />}>
        <Game />
      </Suspense>
    )
  }
  ```

---

### 5.2 Add Performance Monitoring

**File:** `backend/src/middleware/performance.js`

**Tasks:**

- [ ] **Create performance middleware**
  ```javascript
  const logger = require('../utils/logger');

  function performanceMonitor(req, res, next) {
    const startTime = Date.now();
    const route = `${req.method}:${req.route?.path || req.path}`;

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      if (duration > 3000) {
        logger.warn('Slow request detected', {
          route,
          duration: `${duration}ms`,
          statusCode: res.statusCode,
          userId: req.user?.id
        });
      }
    });

    next();
  }

  module.exports = { performanceMonitor };
  ```

- [ ] **Add to app.js**
  ```javascript
  const { performanceMonitor } = require('./middleware/performance');
  app.use(performanceMonitor);
  ```

---

### 5.3 Optimize Images

**Tasks:**

- [ ] **Add image compression to imageService**
  - Use sharp or similar library
  - Compress before caching

- [ ] **Add responsive images in frontend**
  ```javascript
  // Use srcset for different sizes
  <img
    src={imageUrl}
    srcSet={`${imageUrl}?w=400 400w, ${imageUrl}?w=800 800w, ${imageUrl}?w=1200 1200w`}
    sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
    alt={alt}
    loading="lazy"
  />
  ```

---

### 5.4 Add Request Deduplication

**File:** `frontend/src/services/api.js`

**Tasks:**

- [ ] **Implement request deduplication**
  ```javascript
  const pendingRequests = new Map();

  api.interceptors.request.use((config) => {
    const requestKey = `${config.method}:${config.url}`;

    if (pendingRequests.has(requestKey)) {
      // Return existing promise for duplicate request
      return {
        ...config,
        adapter: () => pendingRequests.get(requestKey)
      };
    }

    return config;
  });

  api.interceptors.response.use(
    (response) => {
      const requestKey = `${response.config.method}:${response.config.url}`;
      pendingRequests.delete(requestKey);
      return response;
    },
    (error) => {
      const requestKey = `${error.config?.method}:${error.config?.url}`;
      pendingRequests.delete(requestKey);
      throw error;
    }
  );
  ```

---

### 5.5 Add Migration Versioning

**File:** `backend/src/config/database.js`

**Tasks:**

- [ ] **Create migrations table**
  ```javascript
  await this.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  ```

- [ ] **Create migration files structure**
  ```
  backend/src/migrations/
    001_initial_schema.sql
    002_add_user_settings.sql
    003_add_ownership_columns.sql
  ```

- [ ] **Implement migration runner**
  ```javascript
  async runMigrations() {
    const applied = await this.all('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(applied.map(m => m.version));

    const migrations = [
      { version: 1, name: 'initial', sql: '...' },
      // ... more migrations
    ];

    for (const migration of migrations) {
      if (!appliedVersions.has(migration.version)) {
        await this.run('BEGIN TRANSACTION');
        try {
          await this.exec(migration.sql);
          await this.run(
            'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
            [migration.version, migration.name]
          );
          await this.run('COMMIT');
        } catch (error) {
          await this.run('ROLLBACK');
          throw error;
        }
      }
    }
  }
  ```

---

### 5.6 Update Documentation

**Tasks:**

- [ ] **Update README.md**
  - Document new security requirements
  - Update environment variables
  - Add deployment checklist

- [ ] **Update SETUP.md**
  - Add JWT_SECRET generation instructions
  - Add ALLOWED_ORIGINS configuration

- [ ] **Update DEPLOYMENT.md**
  - Add security checklist
  - Add monitoring setup

---

### 5.7 Final Cleanup

**Tasks:**

- [ ] **Run all tests**
  ```bash
  cd backend && npm test
  cd frontend && npm test
  ```

- [ ] **Fix any remaining ESLint warnings**
  ```bash
  cd backend && npm run lint -- --fix
  cd frontend && npm run lint -- --fix
  ```

- [ ] **Run security audit**
  ```bash
  cd backend && npm audit
  cd frontend && npm audit
  ```

- [ ] **Test production build**
  ```bash
  cd frontend && npm run build
  cd backend && npm run build  # if applicable
  ```

---

## Summary Checklist

### Phase 1: Security (Critical)
- [ ] 1.1 Implement ownership checks
- [ ] 1.2 Fix CORS configuration
- [ ] 1.3 Enforce secure JWT secret
- [ ] 1.4 Add input sanitization
- [ ] 1.5 Fix race conditions
- [ ] 1.6 Fix settings SQL injection

### Phase 2: Code Quality (High)
- [ ] 2.1 Add database indexes
- [ ] 2.2 Enable SQLite WAL mode
- [ ] 2.3 Add request timeouts
- [ ] 2.4 Implement graceful shutdown
- [ ] 2.5 Fix N+1 queries
- [ ] 2.6 Remove unused code
- [ ] 2.7 Add user-based rate limiting

### Phase 3: Frontend (Medium)
- [ ] 3.1 Fix Toast hook anti-pattern
- [ ] 3.2 Fix import statement order
- [ ] 3.3 Fix DiceRoller memory leak
- [ ] 3.4 Replace window.location
- [ ] 3.5 Centralize API configuration
- [ ] 3.6 Fix stale closure
- [ ] 3.7 Standardize error handling
- [ ] 3.8 Fix duplicate function
- [ ] 3.9 Add localStorage error handling
- [ ] 3.10 Add accessibility improvements
- [ ] 3.11 Add PropTypes/TypeScript
- [ ] 3.12 Use or remove Zustand
- [ ] 3.13 Decompose Game.jsx

### Phase 4: Testing (Medium)
- [ ] 4.1 Backend route tests
- [ ] 4.2 Backend service tests
- [ ] 4.3 Backend middleware tests
- [ ] 4.4 Frontend component tests
- [ ] 4.5 Frontend page tests
- [ ] 4.6 Integration tests
- [ ] 4.7 Meet coverage targets

### Phase 5: Performance (Low)
- [ ] 5.1 Add code splitting
- [ ] 5.2 Add performance monitoring
- [ ] 5.3 Optimize images
- [ ] 5.4 Add request deduplication
- [ ] 5.5 Add migration versioning
- [ ] 5.6 Update documentation
- [ ] 5.7 Final cleanup

---

## Notes

- Each task can be worked on independently unless marked with dependencies
- Run tests after each phase to ensure no regressions
- Update this document as tasks are completed
- Create git branches for each phase for easier review

---

*Plan created: February 13, 2026*
