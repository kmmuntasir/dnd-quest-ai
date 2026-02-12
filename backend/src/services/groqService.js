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
      "description": "Scene narrative description",
      "imagePrompt": "Detailed image generation prompt for Pollinations.ai",
      "choices": ["Choice 1", "Choice 2", "Choice 3"],
      "isKeyScene": true
    }
  ]
}

Return ONLY valid JSON. No explanations, no markdown formatting.`;

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
        max_tokens: 2000,
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
  testConnection
};
