/**
 * Mock data factories for frontend tests
 */

/**
 * Create mock adventure data
 */
export function createMockAdventure(overrides = {}) {
  return {
    id: 1,
    title: 'Test Adventure',
    description: 'A test adventure',
    setting: 'Fantasy world',
    theme: 'fantasy',
    tone: 'serious',
    difficulty: 'medium',
    ...overrides
  };
}

/**
 * Create mock game data
 */
export function createMockGame(overrides = {}) {
  return {
    id: 1,
    adventure_id: 1,
    character: {
      name: 'Test Hero',
      class: 'Fighter',
      hp: 100,
      maxHp: 100,
      gold: 50,
      inventory: ['Sword', 'Shield'],
      stats: {
        Strength: 16,
        Dexterity: 14,
        Constitution: 15,
        Intelligence: 10,
        Wisdom: 12,
        Charisma: 14
      }
    },
    scene: {
      id: 1,
      description: 'You stand at the entrance.',
      choices: ['Go left', 'Go right', 'Turn back'],
      image_url: '/api/images/test-hash'
    },
    ...overrides
  };
}

/**
 * Create mock scene data
 */
export function createMockScene(overrides = {}) {
  return {
    id: 1,
    description: 'A dark forest path.',
    choices: ['Continue forward', 'Turn back'],
    image_url: '/api/images/test-hash',
    is_key_scene: false,
    ...overrides
  };
}

/**
 * Create mock axios response
 */
export function createMockResponse(data, status = 200) {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config: {}
  };
}

/**
 * Mock API responses
 */
export const mockApiResponses = {
  adventures: {
    getAll: () => createMockResponse({
      adventures: [createMockAdventure()]
    }),
    getById: (id) => createMockResponse(createMockAdventure({ id })),
    generate: () => createMockResponse(createMockAdventure())
  },
  games: {
    getById: (id) => createMockResponse(createMockGame({ id })),
    start: () => createMockResponse(createMockGame()),
    submitChoice: () => createMockResponse({
      narrative: 'Your action succeeds!',
      outcome: 'success',
      nextScene: createMockScene({ id: 2 })
    })
  }
};
