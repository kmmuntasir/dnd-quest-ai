const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Generate adventure using Groq API
 * @param {Object} params - Adventure generation parameters
 * @param {string} params.theme - Setting theme (fantasy, horror, sci-fi)
 * @param {string} params.tone - Story tone (serious, humorous, dark)
 * @param {string} params.difficulty - Game difficulty (easy, medium, hard)
 * @param {string} params.context - Additional context (optional)
 * @returns {Promise<Object>} Generated adventure data
 */
async function generateAdventure({ theme, tone, difficulty, context }) {
  const systemPrompt = `You are a Dungeon Master. Generate a D&D adventure with these parameters:

Theme: ${theme}
Tone: ${tone}
Difficulty: ${difficulty}
Additional context: ${context || 'None'}

IMPORTANT: You MUST generate exactly 5 scenes for a complete adventure. Each scene should advance the story toward the final climax.

Generate JSON with this exact structure:
{
  "title": "Adventure title",
  "description": "Brief description (2-3 sentences)",
  "setting": "Setting description",
  "quest": "Main quest description",
  "npcs": [
    {
      "name": "NPC name",
      "description": "Character description",
      "role": "Role in the adventure"
    }
  ],
  "scenes": [
    {
      "description": "Scene 1: Introduction - Set the scene and introduce the quest",
      "imagePrompt": "Detailed image generation prompt for Pollinations.ai",
      "choices": ["Choice 1", "Choice 2", "Choice 3"],
      "isKeyScene": true
    },
    {
      "description": "Scene 2: Early challenge or encounter",
      "imagePrompt": "Detailed image generation prompt for Pollinations.ai",
      "choices": ["Choice 1", "Choice 2", "Choice 3"],
      "isKeyScene": false
    },
    {
      "description": "Scene 3: Rising action - complications develop",
      "imagePrompt": "Detailed image generation prompt for Pollinations.ai",
      "choices": ["Choice 1", "Choice 2", "Choice 3"],
      "isKeyScene": true
    },
    {
      "description": "Scene 4: Approach to the climax",
      "imagePrompt": "Detailed image generation prompt for Pollinations.ai",
      "choices": ["Choice 1", "Choice 2", "Choice 3"],
      "isKeyScene": false
    },
    {
      "description": "Scene 5: Final confrontation and resolution",
      "imagePrompt": "Detailed image generation prompt for Pollinations.ai",
      "choices": ["Choice 1", "Choice 2", "Choice 3"],
      "isKeyScene": true
    }
  ]
}

Return ONLY valid JSON. No explanations, no markdown formatting. You MUST include all 5 scenes.`;

  const userPrompt = 'Generate a D&D adventure based on the parameters above.';

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('Groq API error:', error.response?.data || error.message);
    throw new Error('Failed to generate adventure: ' + (error.response?.data?.error?.message || error.message));
  }
}

/**
 * Generate scene response based on player choice
 * @param {Object} params - Scene generation parameters
 * @param {string} params.playerChoice - Player's chosen action
 * @param {number} params.diceRoll - d20 roll result
 * @param {Object} params.stats - Character stats
 * @param {string} params.sceneContext - Current scene context
 * @returns {Promise<Object>} Generated scene response
 */
async function generateSceneResponse({ playerChoice, diceRoll, stats, sceneContext }) {
  const systemPrompt = `You are the Dungeon Master. The player chose: "${playerChoice}"
Their d20 roll was: ${diceRoll}
Their stats: ${JSON.stringify(stats)}
Current scene context: ${sceneContext}

Describe what happens next based on:
- Their choice
- The dice roll (higher = better outcome)
- Their character stats

If the roll fails, provide a setback or alternative path.
If successful, reward them with progress or an item.

Return JSON with this exact structure:
{
  "narrative": "Story description of what happens",
  "outcome": "success|failure|partial",
  "statChange": { "hp": 0, "gold": 0 },
  "newItem": "Item name (if awarded, otherwise null)",
  "nextScenePrompt": "Prompt for next scene generation"
}

Return ONLY valid JSON. No explanations, no markdown formatting.`;

  const userPrompt = 'Generate the outcome of the player\'s choice.';

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('Groq API error:', error.response?.data || error.message);
    throw new Error('Failed to generate scene response: ' + (error.response?.data?.error?.message || error.message));
  }
}

/**
 * Generate story context suggestion
 * @param {Object} params - Context generation parameters
 * @param {string} params.theme - Setting theme
 * @param {string} params.tone - Story tone
 * @param {string} params.difficulty - Game difficulty
 * @returns {Promise<string>} Generated context suggestion
 */
async function generateContext({ theme, tone, difficulty }) {
  const themeDescriptions = {
    fantasy: 'magical realms with dragons, wizards, and ancient artifacts',
    horror: 'dark, terrifying settings with undead, curses, and cosmic dread',
    'sci-fi': 'futuristic worlds with advanced technology, aliens, and space exploration',
    mystery: 'suspenseful settings with secrets, puzzles, and hidden truths',
    adventure: 'exciting journeys through exotic lands and dangerous territories',
    pirate: 'swashbuckling tales on the high seas with treasure and naval combat'
  };

  const systemPrompt = `You are a creative Dungeon Master assistant. Generate a brief, evocative story hook for a D&D adventure.

Theme: ${theme} (${themeDescriptions[theme] || theme})
Tone: ${tone}
Difficulty: ${difficulty}

Create a 1-2 sentence story hook that would make for an exciting adventure. Include:
- A compelling hook or inciting incident
- An interesting location or situation
- A hint of danger or mystery

Examples:
- "A cursed artifact has been stolen from the royal vault, and the thief leaves behind clues that lead to an abandoned dwarven mine."
- "The village of Millhaven has been plagued by strange dreams that are slowly driving the residents mad."
- "A merchant caravan has gone missing in the Whisperwood, and the only clue is a single blood-stained map."

Return ONLY the story hook text. No JSON, no formatting, just the text.`;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate a creative story hook.' }
        ],
        temperature: 0.9,
        max_tokens: 150
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Groq API error generating context:', error.response?.data || error.message);
    throw new Error('Failed to generate context: ' + (error.response?.data?.error?.message || error.message));
  }
}

/**
 * Generate character name based on class
 * @param {Object} params - Name generation parameters
 * @param {string} params.characterClass - Character class
 * @returns {Promise<string>} Generated character name
 */
async function generateCharacterName({ characterClass }) {
  const classThemes = {
    Fighter: 'strong, heroic names often with martial or noble connotations',
    Wizard: 'mystical, arcane names with scholarly or magical undertones',
    Rogue: 'cunning, shadowy names that suggest stealth and wit',
    Cleric: 'divine, pious names with religious or spiritual meaning',
    Ranger: 'nature-inspired names evoking wilderness and tracking'
  };

  const systemPrompt = `You are a creative Dungeon Master assistant. Generate a single character name for a D&D character.

Character Class: ${characterClass}
Name Style: ${classThemes[characterClass] || 'fantasy names'}

Generate ONE unique, memorable character name appropriate for this class. The name should be:
- Easy to pronounce and remember
- Fitting for a fantasy setting
- Appropriate for the character class

Examples by class:
- Fighter: Aldric, Theron, Kael, Marcus, Valerius
- Wizard: Elindra, Zephyr, Thaddeus, Morrigan, Aldricus
- Rogue: Shade, Whisper, Corvus, Nyx, Silas
- Cleric: Benedict, Seraphina, Theodric, Grace, Aeliana
- Ranger: Sylas, Briar, Fenris, Lyanna, Thorin

Return ONLY the name. No titles, no descriptions, no JSON, no formatting - just the name.`;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate a character name.' }
        ],
        temperature: 0.9,
        max_tokens: 30
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return response.data.choices[0].message.content.trim().replace(/['"]/g, '');
  } catch (error) {
    console.error('Groq API error generating name:', error.response?.data || error.message);
    throw new Error('Failed to generate name: ' + (error.response?.data?.error?.message || error.message));
  }
}

/**
 * Test Groq API connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    return response.status === 200;
  } catch (error) {
    console.error('Groq API connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  generateAdventure,
  generateSceneResponse,
  generateContext,
  generateCharacterName,
  testConnection
};
