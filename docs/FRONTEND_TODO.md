# Frontend Todo List

## Phase 1: Project Setup
- [x] Create React + Vite project
- [x] Install dependencies:
  - [x] `react-router-dom`
  - [x] `axios`
  - [x] `zustand` (or Context API for state)
  - [x] `lucide-react` (icons)
  - [x] `clsx` and `tailwind-merge` (utility classes)
- [x] Configure Tailwind CSS:
  - [x] Install `tailwindcss`
  - [x] Create `tailwind.config.js`
  - [x] Add custom colors (dark theme palette)
  - [x] Configure Google Fonts (Cinzel, MedievalSharp)
- [x] Set up project structure:
  ```
  frontend/
  ├── src/
  │   ├── components/
  │   │   ├── common/
  │   │   ├── game/
  │   │   └── ui/
  │   ├── pages/
  │   ├── hooks/
  │   ├── services/
  │   ├── store/
  │   ├── styles/
  │   ├── App.jsx
  │   └── main.jsx
  └── package.json
  ```
- [x] Configure ESLint and Prettier

## Phase 2: Routing & Layout
- [x] Set up React Router
- [x] Create main layout component with navigation
- [x] Define routes:
  - [x] `/` - Home/Landing
  - [x] `/library` - Story Library
  - [x] `/game/:gameId` - Game Play
  - [x] `/settings` - Settings
- [x] Create navigation component
- [x] Add 404 page

## Phase 3: UI Components - Common
- [x] Button component (variants: primary, secondary, danger)
- [x] Card component
- [x] Modal/Dialog component
- [x] Loading spinner component
- [x] Skeleton loader component
- [x] Toast/Notification component
- [x] Input components (text, select, textarea)
- [x] Image component with fallback

## Phase 4: Home/Landing Page
- [x] Create hero section with fantasy theme
- [x] Add "Generate New Adventure" CTA button
- [x] Add "Story Library" CTA button
- [x] Create recent adventures preview
- [x] Add atmospheric background/dark theme
- [x] Responsive design (mobile-first)

## Phase 5: Story Generator Page
- [x] Create form for adventure parameters:
  - [x] Theme dropdown (fantasy, horror, sci-fi, etc.)
  - [x] Tone dropdown (serious, humorous, dark)
  - [x] Difficulty selector (easy, medium, hard)
  - [x] Custom context textarea
- [x] Add loading state with animation
- [ ] Create generated adventure preview
- [ ] Add "Start Adventure" button
- [ ] Add "Regenerate" option

## Phase 6: Story Library Page
- [ ] Create saved games grid/list
- [ ] Add sorting options (date, name, progress)
- [ ] Add search functionality
- [ ] Create saved game card component:
  - [ ] Adventure thumbnail
  - [ ] Adventure title
  - [ ] Progress indicator
  - [ ] Last played date
  - [ ] Resume/Delete buttons
- [ ] Implement delete confirmation modal
- [ ] Add empty state when no saves

## Phase 7: Character Creation
- [x] Create character creation modal/page
- [x] Add name input
- [x] Add class selection:
  - [x] Fighter
  - [x] Wizard
  - [x] Rogue
  - [x] Cleric
  - [x] Ranger
- [x] Display class descriptions and bonuses
- [x] Show randomized stats (3d6) with option to reroll
- [x] Display calculated HP based on class + CON
- [ ] Add "Create Character & Start" button

## Phase 8: Game Play Interface
- [x] Create game layout:
  - [x] Left panel: Character stats (desktop)
  - [x] Center: Scene image + narrative
  - [x] Right panel: Choices + dice roll
- [x] Scene presentation:
  - [x] Image with loading state
  - [x] Scene description text
  - [x] Scene title/location indicator
- [x] Character stats display (sidebar or header):
  - [x] Name, class
  - [x] HP bar with percentage
  - [x] Stats (STR, DEX, INT, WIS, CON, CHA)
  - [x] Gold
  - [x] Inventory display (expandable)

## Phase 9: Dice Rolling System
- [x] Create 3D d20 dice component
- [x] Implement dice roll animation:
  - [x] Spinning effect
  - [ ] Sound effect (optional)
  - [x] Roll result display
- [ ] Add automatic roll on choice selection
- [ ] Display roll modifier (stat bonus)
- [x] Show success/failure indication (natural 20/1)
- [ ] Add manual roll button (for skill checks)

## Phase 10: Choice System
- [x] Create choice button component
- [x] Add hover effects and animations
- [x] Implement choice selection
- [ ] Show dice roll result on selection
- [ ] Display AI-generated outcome
- [ ] Navigate to next scene
- [ ] Handle adventure completion

## Phase 11: Scene Transitions
- [x] Create fade-in/fade-out transitions
- [ ] Add atmospheric effects (mist, particle overlay)
- [ ] Scene loading animation
- [x] Smooth slide-up for narrative text
- [ ] Progress indicator (scene X of Y)

## Phase 12: Save/Load System
- [x] Implement auto-save (after each scene)
- [x] Create manual save button
- [x] Add save notification (toast)
- [x] Create save slots display (in settings or separate page)
- [x] Load saved game functionality
- [ ] Handle save conflicts (if game already exists)

## Phase 13: Settings Page
- [x] Create settings page with sections:
  - [x] AI Settings
  - [x] Game Settings
  - [x] Display Settings
- [x] AI Settings:
  - [x] Image style selector (realistic, fantasy art, cartoon)
  - [x] Difficulty toggle
  - [x] API connection test buttons
- [x] Game Settings:
  - [x] Dice animations toggle
  - [x] Sound effects toggle
  - [ ] Auto-save toggle
- [x] Display Settings:
  - [ ] Text size slider
  - [ ] High contrast toggle
- [x] Save settings with API call

## Phase 14: State Management
- [x] Set up Zustand store (or Context API)
- [x] Create game state structure:
  - [x] Current adventure
  - [x] Current scene
  - [x] Character data
  - [x] Game history (choices, rolls)
  - [x] Settings
- [x] Implement actions:
  - [x] setAdventure
  - [x] updateCharacter
  - [x] addToHistory
  - [x] updateSettings
- [x] Create selectors for derived state

## Phase 15: API Integration
- [x] Create API service (`services/api.js`)
- [x] Implement Axios instance with base URL
- [x] Add request interceptors (auth, headers)
- [x] Add response interceptors (error handling)
- [x] Create API functions:
  - [x] generateAdventure()
  - [x] startGame()
  - [x] getGameState()
  - [x] submitChoice()
  - [x] saveGame()
  - [x] getSavedGames()
  - [x] deleteSavedGame()
  - [x] getSettings()
  - [x] updateSettings()
- [ ] Implement retry logic for failed requests

## Phase 16: Polish & Animations
- [ ] Add hover effects on all interactive elements
- [ ] Create entrance animations for pages
- [ ] Add micro-interactions (button clicks, form inputs)
- [ ] Image loading skeleton and fade-in
- [ ] Scroll animations for narrative text
- [ ] Add ambient sound (optional)
- [ ] Create "Game Over" and "Victory" screens

## Phase 17: Responsive Design
- [ ] Optimize for mobile (<640px):
  - [ ] Stack panels vertically
  - [ ] Smaller text
  - [ ] Touch-friendly buttons
- [ ] Tablet optimization (640px - 1024px)
- [ ] Desktop optimization (>1024px)
- [ ] Test on various screen sizes

## Phase 18: Accessibility
- [ ] Add ARIA labels to all interactive elements
- [ ] Implement keyboard navigation
  - [ ] Tab order
  - [ ] Arrow key navigation for choices
  - [ ] Space/Enter to select
- [ ] Screen reader support
  - [ ] Descriptive alt text for images
  - [ ] Live regions for dynamic content
- [ ] Color contrast compliance (WCAG AA)
- [ ] Focus indicators

## Phase 19: Performance Optimization
- [ ] Code splitting with React.lazy
- [ ] Optimize images (lazy loading, placeholders)
- [ ] Memoize expensive calculations
- [ ] Debounce search inputs
- [ ] Optimize bundle size
- [ ] Implement service worker (optional)
- [ ] Add meta tags for SEO

## Phase 20: Testing
- [ ] Set up testing framework (Vitest + React Testing Library)
- [ ] Write unit tests for components
- [ ] Write integration tests for pages
- [ ] Test API service mocks
- [ ] Manual testing:
  - [ ] Full gameplay flow
  - [ ] Save/load scenarios
  - [ ] Error handling (API failures)
  - [ ] Edge cases
- [ ] Browser compatibility testing

## Phase 21: Deployment
- [ ] Create production build
- [ ] Set up deployment pipeline (Vercel/Netlify or similar)
- [ ] Configure environment variables
- [ ] Test in production environment
- [ ] Set up analytics (optional)

---

**Total Tasks:** ~100

**Estimated Timeline:** 5-6 weeks (parallel with backend development)

---

*Created: February 12, 2026*
