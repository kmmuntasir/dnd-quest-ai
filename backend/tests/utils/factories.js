/**
 * Test data factories
 * Generate test data for tests
 */

/**
 * Create a test user
 */
function createUser(overrides = {}) {
  return {
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    username: 'TestUser',
    ...overrides
  };
}

/**
 * Create test adventure data
 */
function createAdventure(overrides = {}) {
  return {
    title: 'Test Adventure',
    description: 'A test adventure for unit tests',
    setting: 'A mysterious dungeon',
    quest: 'Find the golden chalice',
    theme: 'fantasy',
    tone: 'serious',
    difficulty: 'medium',
    ...overrides
  };
}

/**
 * Create test scene data
 */
function createScene(overrides = {}) {
  return {
    description: 'You enter a dark chamber.',
    imagePrompt: 'A dark fantasy chamber with torches',
    choices: ['Light a torch', 'Feel the walls', 'Call out'],
    scene_order: 0,
    is_key_scene: false,
    ...overrides
  };
}

/**
 * Create test NPC data
 */
function createNPC(overrides = {}) {
  return {
    name: 'Gandalf the Grey',
    description: 'An old wizard with a long beard',
    role: 'Mentor',
    ...overrides
  };
}

/**
 * Create test character data
 */
function createCharacter(overrides = {}) {
  return {
    name: 'Aragorn',
    class: 'Fighter',
    stats: {
      Strength: 16,
      Dexterity: 14,
      Constitution: 15,
      Intelligence: 10,
      Wisdom: 12,
      Charisma: 14
    },
    hp: 100,
    maxHp: 100,
    gold: 50,
    inventory: ['Longsword', 'Shield'],
    ...overrides
  };
}

/**
 * Create test game data
 */
function createGame(overrides = {}) {
  return {
    adventure_id: 1,
    ...createCharacter(),
    ...overrides
  };
}

/**
 * Create AI adventure response mock
 */
function createAIAdventureResponse(overrides = {}) {
  return {
    title: 'The Lost Kingdom',
    description: 'An epic journey to reclaim a lost kingdom',
    setting: 'A medieval fantasy world',
    quest: 'Defeat the dark lord and restore peace',
    npcs: [
      {
        name: 'Eldric the Wise',
        description: 'An ancient wizard who guides the hero',
        role: 'Mentor'
      }
    ],
    scenes: [
      {
        description: 'Scene 1: The adventure begins at the village gate.',
        imagePrompt: 'A fantasy village gate at dawn',
        choices: ['Enter the village', 'Explore the forest', 'Talk to the guard'],
        isKeyScene: true
      },
      {
        description: 'Scene 2: Deep in the forest, you hear strange sounds.',
        imagePrompt: 'A dark forest with mysterious shadows',
        choices: ['Investigate', 'Run away', 'Climb a tree'],
        isKeyScene: false
      }
    ],
    ...overrides
  };
}

/**
 * Create AI scene response mock
 */
function createAISceneResponse(overrides = {}) {
  return {
    narrative: 'Your action succeeds! You find a hidden passage.',
    outcome: 'success',
    statChange: { hp: 0, gold: 10 },
    newItem: 'Magic Key',
    nextScenePrompt: 'The passage leads deeper into the dungeon.',
    ...overrides
  };
}

module.exports = {
  createUser,
  createAdventure,
  createScene,
  createNPC,
  createCharacter,
  createGame,
  createAIAdventureResponse,
  createAISceneResponse
};
