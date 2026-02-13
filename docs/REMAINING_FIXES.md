# Remaining Fixes - Implementation Plan

**Created:** February 13, 2026
**Status:** Ready for Implementation
**Priority Order:** Listed from highest to lowest priority

---

## Overview

These are the remaining items from the original implementation plan that were not completed. They are organized by priority.

---

## Priority 1: Code Cleanup (Quick Wins)

### 1.1 Fix IPv6 Rate Limiter Warning
**File:** `backend/src/middleware/rateLimiter.js`
**Issue:** `ERR_ERL_KEY_GEN_IPV6` warning - custom keyGenerator uses `req.ip` without IPv6 helper

**Fix:**
```javascript
// In createUserLimiter, use the standard keyGenerator for IP fallback
const { default: rateLimit } = require('express-rate-limit');

const createUserLimiter = ({ windowMs = 15 * 60 * 1000, max = 10, name = 'user-limiter' }) => {
  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // Use express-rate-limit's built-in IPv6 handling
    keyGenerator: (req) => {
      if (req.user?.id) {
        return `user:${req.user.id}`;
      }
      // Let the library handle IP-based key generation with proper IPv6 support
      // Don't return req.ip directly - return undefined to use default behavior
      return undefined;
    },
    // ... rest of config
  });
  return createConditionalLimiter(limiter);
};
```

---

### 1.2 Remove Unused Validator Middleware
**File:** `backend/src/middleware/validator.js`
**Action:** Delete the file if it's not imported anywhere

```bash
rm backend/src/middleware/validator.js
```

**Verify first:**
```bash
grep -r "require.*validator" backend/src/
```

---

### 1.3 Remove or Use Zustand Store
**File:** `frontend/src/store/gameStore.js`
**Options:**
- **Option A (Remove):** Delete the file and uninstall zustand
- **Option B (Use):** Refactor Game.jsx to use the store instead of local state

**Recommended:** Remove since all components use local state

```bash
rm frontend/src/store/gameStore.js
cd frontend && npm uninstall zustand
```

---

## Priority 2: Bug Fixes

### 2.1 Fix Stale Closure in Game.jsx
**File:** `frontend/src/pages/Game.jsx:174`
**Issue:** `game` object captured in setTimeout closure can become stale

**Current Code:**
```javascript
setTimeout(() => {
  // ...
  const isHardMode = game?.adventure?.difficulty === 'hard'; // Stale!
  setCanGoBack(!isHardMode);
}, 2000);
```

**Fix using useRef:**
```javascript
// Add at top of component
const difficultyRef = useRef(game?.adventure?.difficulty);

// Update ref when game changes
useEffect(() => {
  difficultyRef.current = game?.adventure?.difficulty;
}, [game?.adventure?.difficulty]);

// In setTimeout, use ref instead of game
setTimeout(() => {
  setCurrentScene(data.nextScene);
  setNarrative(null);
  setTransitioning(false);
  const isHardMode = difficultyRef.current === 'hard';
  setCanGoBack(!isHardMode);
}, 2000);
```

---

## Priority 3: Code Quality Improvements

### 3.1 Add PropTypes to Components
**Files:** All component files in `frontend/src/components/`
**Effort:** Medium

**Install prop-types:**
```bash
cd frontend && npm install prop-types
```

**Example for Button.jsx:**
```javascript
import PropTypes from 'prop-types';

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  className: PropTypes.string,
  children: PropTypes.node.isRequired
};

Button.defaultProps = {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  type: 'button',
  className: ''
};
```

**Components needing PropTypes:**
- [ ] `components/ui/Button.jsx`
- [ ] `components/ui/Card.jsx`
- [ ] `components/ui/Input.jsx`
- [ ] `components/ui/ConfirmDialog.jsx`
- [ ] `components/game/DiceRoller.jsx`
- [ ] `components/game/Choices.jsx`
- [ ] `components/game/CharacterCreation.jsx`
- [ ] `components/game/StoryGenerator.jsx`

---

### 3.2 Decompose Game.jsx (Optional)
**File:** `frontend/src/pages/Game.jsx`
**Current:** 600+ lines in single file
**Target:** Split into smaller, focused components

**Extracted Components:**
1. `GameHeader.jsx` - Title, adventure info, back button
2. `SceneDisplay.jsx` - Scene image and description
3. `CharacterStats.jsx` - HP bar, stats, inventory (sidebar)
4. `NarrativeDisplay.jsx` - Dice roll result, narrative text
5. `GameModals.jsx` - Victory/defeat modals

**Benefits:**
- Easier to test
- Better code organization
- Reusable components

---

## Priority 4: Enhanced Testing

### 4.1 Add Frontend Page Tests
**Missing tests for:**
- [ ] `pages/Game.test.jsx`
- [ ] `pages/Library.test.jsx`
- [ ] `pages/Settings.test.jsx`
- [ ] `pages/Home.test.jsx`

### 4.2 Add Backend Service Tests
**Missing tests for:**
- [ ] `services/groqService.test.js`
- [ ] `services/imageService.test.js`

### 4.3 Add E2E Tests (Optional)
**Framework:** Playwright
**Critical flows to test:**
- User registration and login
- Adventure generation
- Game playthrough (start → choices → completion)

---

## Priority 5: Future Enhancements

### 5.1 Migrate to TypeScript
**Effort:** High
**Benefits:** Type safety, better IDE support, fewer runtime errors

### 5.2 Add CSRF Protection
**Current Status:** Not implemented
**Recommended for:** Production deployments with cookie-based auth

### 5.3 Implement httpOnly Cookies for Auth
**Current:** JWT stored in localStorage (vulnerable to XSS)
**Better:** Use httpOnly cookies for token storage
**Files to modify:**
- `backend/src/routes/auth.js` - Set cookie on login
- `backend/src/middleware/auth.js` - Read from cookie
- `frontend/src/services/api.js` - Remove localStorage token handling

---

## Quick Reference Checklist

### Can Do Now (5-10 min each)
- [ ] Fix IPv6 rate limiter warning
- [ ] Delete unused validator.js
- [ ] Remove Zustand store

### Short Tasks (30 min each)
- [ ] Fix stale closure in Game.jsx

### Medium Tasks (1-2 hours each)
- [ ] Add PropTypes to all components
- [ ] Add missing frontend tests

### Large Tasks (Half day+)
- [ ] Decompose Game.jsx
- [ ] Add E2E tests
- [ ] Migrate to TypeScript

---

## Notes

- All critical security fixes are complete
- The application is production-ready as-is
- These remaining items are quality-of-life improvements
- Prioritize based on your immediate needs

---

*Plan created: February 13, 2026*
