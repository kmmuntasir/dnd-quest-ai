const { z } = require('zod');

/**
 * Schema for NPC in adventure response
 */
const npcSchema = z.object({
  name: z.string().min(1).default('Unknown NPC'),
  description: z.string().default('A mysterious figure.'),
  role: z.string().default('NPC')
});

/**
 * Schema for scene in adventure response
 */
const sceneSchema = z.object({
  description: z.string().min(1),
  imagePrompt: z.string().min(10).default('A fantasy scene'),
  choices: z.array(z.string().min(1)).min(2).max(4).default(['Investigate', 'Move forward']),
  isKeyScene: z.boolean().default(false)
});

/**
 * Schema for adventure response from AI
 */
const adventureResponseSchema = z.object({
  title: z.string().min(1).default('Untitled Adventure'),
  description: z.string().default('An exciting adventure awaits.'),
  setting: z.string().default('A mysterious land'),
  quest: z.string().default('Complete the quest'),
  npcs: z.array(npcSchema).default([]),
  scenes: z.array(sceneSchema).min(1).default([])
});

/**
 * Schema for scene response from AI
 */
const sceneResponseSchema = z.object({
  narrative: z.string().min(1).default('Something happens...'),
  outcome: z.enum(['success', 'failure', 'partial']).default('partial'),
  statChange: z.object({
    hp: z.number().int().default(0),
    gold: z.number().int().default(0)
  }).default({ hp: 0, gold: 0 }),
  newItem: z.string().nullable().default(null),
  nextScenePrompt: z.string().optional().default('')
});

/**
 * Schema for context response (plain string)
 */
const contextResponseSchema = z.string().min(10).max(500);

/**
 * Schema for character name response (plain string)
 */
const characterNameResponseSchema = z.string().min(2).max(50);

/**
 * Validate and sanitize adventure response
 * @param {any} data - Raw data from AI
 * @returns {Object} Validated and sanitized adventure data
 */
function validateAdventureResponse(data) {
  try {
    // First, try to validate the raw data
    const result = adventureResponseSchema.safeParse(data);

    if (result.success) {
      // Additional validation: ensure at least one scene
      if (result.data.scenes.length === 0) {
        result.data.scenes = [{
          description: 'Your adventure begins...',
          imagePrompt: 'A fantasy adventure scene',
          choices: ['Explore', 'Rest', 'Move on'],
          isKeyScene: true
        }];
      }
      return { success: true, data: result.data };
    }

    // If validation fails, try to salvage what we can
    const salvaged = {
      title: data?.title || 'Untitled Adventure',
      description: data?.description || 'An exciting adventure awaits.',
      setting: data?.setting || 'A mysterious land',
      quest: data?.quest || 'Complete the quest',
      npcs: Array.isArray(data?.npcs) ? data.npcs.filter(npc => npc?.name).map(npc => ({
        name: npc.name || 'Unknown',
        description: npc.description || 'A mysterious figure.',
        role: npc.role || 'NPC'
      })) : [],
      scenes: Array.isArray(data?.scenes) ? data.scenes.filter(scene => scene?.description).map(scene => ({
        description: scene.description || 'Something interesting happens.',
        imagePrompt: scene.imagePrompt || 'A fantasy scene',
        choices: Array.isArray(scene.choices) && scene.choices.length >= 2
          ? scene.choices.slice(0, 4)
          : ['Investigate', 'Move forward'],
        isKeyScene: Boolean(scene.isKeyScene)
      })) : []
    };

    // Re-validate salvaged data
    const salvageResult = adventureResponseSchema.safeParse(salvaged);
    if (salvageResult.success) {
      return { success: true, data: salvageResult.data, salvaged: true };
    }

    // Return default if all else fails
    return {
      success: false,
      data: getDefaultAdventure(),
      error: result.error.message
    };
  } catch (error) {
    return {
      success: false,
      data: getDefaultAdventure(),
      error: error.message
    };
  }
}

/**
 * Validate and sanitize scene response
 * @param {any} data - Raw data from AI
 * @returns {Object} Validated and sanitized scene response
 */
function validateSceneResponse(data) {
  try {
    const result = sceneResponseSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    // Salvage what we can
    const salvaged = {
      narrative: data?.narrative || 'Your action has consequences...',
      outcome: ['success', 'failure', 'partial'].includes(data?.outcome)
        ? data.outcome
        : 'partial',
      statChange: {
        hp: typeof data?.statChange?.hp === 'number' ? data.statChange.hp : 0,
        gold: typeof data?.statChange?.gold === 'number' ? data.statChange.gold : 0
      },
      newItem: data?.newItem || null,
      nextScenePrompt: data?.nextScenePrompt || ''
    };

    const salvageResult = sceneResponseSchema.safeParse(salvaged);
    if (salvageResult.success) {
      return { success: true, data: salvageResult.data, salvaged: true };
    }

    return {
      success: false,
      data: getDefaultSceneResponse(),
      error: result.error.message
    };
  } catch (error) {
    return {
      success: false,
      data: getDefaultSceneResponse(),
      error: error.message
    };
  }
}

/**
 * Validate context response
 * @param {string} text - Raw text from AI
 * @returns {Object} Validated context
 */
function validateContextResponse(text) {
  const result = contextResponseSchema.safeParse(text?.trim());

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    data: 'A mysterious adventure awaits those brave enough to seek it.',
    error: result.error.message
  };
}

/**
 * Validate character name response
 * @param {string} text - Raw text from AI
 * @returns {Object} Validated name
 */
function validateCharacterNameResponse(text) {
  // Clean up the text
  const cleaned = text?.trim().replace(/['"]/g, '').substring(0, 50);

  const result = characterNameResponseSchema.safeParse(cleaned);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Return a random default name
  const defaultNames = ['Adventurer', 'Traveler', 'Wanderer', 'Seeker'];
  return {
    success: false,
    data: defaultNames[Math.floor(Math.random() * defaultNames.length)],
    error: result.error.message
  };
}

/**
 * Get default adventure structure
 */
function getDefaultAdventure() {
  return {
    title: 'A Mysterious Quest',
    description: 'An unexpected adventure begins...',
    setting: 'A land of mystery and wonder',
    quest: 'Discover the truth behind the mystery',
    npcs: [],
    scenes: [{
      description: 'Your journey begins at the crossroads of fate.',
      imagePrompt: 'A fantasy crossroads at twilight, mystical atmosphere',
      choices: ['Take the northern path', 'Head east toward the forest', 'Travel south to the village'],
      isKeyScene: true
    }]
  };
}

/**
 * Get default scene response
 */
function getDefaultSceneResponse() {
  return {
    narrative: 'Something unexpected happens, but you press on.',
    outcome: 'partial',
    statChange: { hp: 0, gold: 0 },
    newItem: null,
    nextScenePrompt: ''
  };
}

module.exports = {
  adventureResponseSchema,
  sceneResponseSchema,
  contextResponseSchema,
  characterNameResponseSchema,
  validateAdventureResponse,
  validateSceneResponse,
  validateContextResponse,
  validateCharacterNameResponse,
  getDefaultAdventure,
  getDefaultSceneResponse
};
