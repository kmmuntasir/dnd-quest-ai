/**
 * Groq Text Provider
 * Generates text content using Groq API
 */

const axios = require('axios');
const TextProvider = require('../base/TextProvider');
const { logger } = require('../../utils/logger');
const {
  validateAdventureResponse,
  validateSceneResponse,
  validateContextResponse,
  validateCharacterNameResponse
} = require('../../validations/ai.schema');

/**
 * Groq Text Provider
 * Implements text generation using the Groq API
 */
class GroqProvider extends TextProvider {
  /**
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    super({
      name: 'groq',
      defaultModel: config.model || 'llama-3.3-70b-versatile',
      defaultTemperature: config.defaultTemperature || 0.8,
      defaultMaxTokens: config.defaultMaxTokens || 4000,
      timeout: config.timeout || 45000,
      circuitBreaker: config.circuitBreaker
    });

    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.groq.com/openai/v1/chat/completions';
  }

  /**
   * Make a Groq API request
   * @param {Object} requestBody - Request body for Groq API
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} API response
   */
  async makeRequest(requestBody, options = {}) {
    return this.executeWithProtection(async () => {
      const response = await axios.post(
        this.apiUrl,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: options.timeout || this.timeout
        }
      );
      return response;
    }, options);
  }

  /**
   * Get scene count based on length parameter
   * @param {string} length - Length parameter
   * @returns {number|'ai'}
   */
  getSceneCount(length) {
    switch (length) {
      case 'quick':
        return 3;
      case 'standard':
        return 5;
      case 'extended':
        return 8;
      case 'ai':
      default:
        return 'ai';
    }
  }

  /**
   * Generate adventure
   * @param {Object} params - Adventure generation parameters
   * @returns {Promise<Object>}
   */
  async generateAdventure({ theme, tone, difficulty, length = 'standard', context }) {
    const sceneCount = this.getSceneCount(length);
    const isAiDecided = sceneCount === 'ai';

    let sceneInstructions;
    if (isAiDecided) {
      sceneInstructions = `IMPORTANT: You decide the optimal number of scenes (between 3-10) based on the story you want to tell. A simple rescue mission might need 3-4 scenes, while an epic quest could need 8-10 scenes. Each scene should advance the story toward the final climax.`;
    } else {
      sceneInstructions = `IMPORTANT: You MUST generate exactly ${sceneCount} scenes for a complete adventure. Each scene should advance the story toward the final climax.`;
    }

    const systemPrompt = `You are a Dungeon Master. Generate a D&D adventure with these parameters:

Theme: ${theme}
Tone: ${tone}
Difficulty: ${difficulty}
Additional context: ${context || 'None'}

${sceneInstructions}

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
      "description": "Scene N: Description of what happens in this scene",
      "imagePrompt": "Detailed image generation prompt for Pollinations.ai",
      "choices": ["Choice 1", "Choice 2", "Choice 3"],
      "isKeyScene": true/false
    }
  ]
}

Scene structure guidelines:
- First scene: Introduction - Set the scene and introduce the quest
- Middle scenes: Build tension, present challenges, develop the story
- Final scene: Climax and resolution

Mark key scenes (major plot points, boss encounters, important revelations) with isKeyScene: true.

Return ONLY valid JSON. No explanations, no markdown formatting. ${isAiDecided ? 'Choose the optimal number of scenes for your story.' : `You MUST include exactly ${sceneCount} scenes.`}`;

    const userPrompt = 'Generate a D&D adventure based on the parameters above.';

    try {
      const response = await this.makeRequest({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.defaultTemperature,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      }, { timeout: 45000 });

      const content = response.data.choices[0].message.content;
      const rawData = this.safeJsonParse(content);

      if (!rawData) {
        logger.error('Failed to parse adventure JSON');
        throw new Error('Failed to parse AI response as JSON');
      }

      const validation = validateAdventureResponse(rawData);

      if (!validation.success) {
        logger.warn('Adventure validation had issues, using salvaged data', {
          error: validation.error,
          salvaged: validation.salvaged
        });
      }

      return validation.data;
    } catch (error) {
      logger.error('Failed to generate adventure', { error: error.message });
      throw new Error('Failed to generate adventure: ' + error.message);
    }
  }

  /**
   * Generate scene response based on player choice
   * @param {Object} params - Scene generation parameters
   * @returns {Promise<Object>}
   */
  async generateSceneResponse({ playerChoice, diceRoll, stats, sceneContext }) {
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
      const response = await this.makeRequest({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.defaultTemperature,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      }, { timeout: 30000 });

      const content = response.data.choices[0].message.content;
      const rawData = this.safeJsonParse(content);

      if (!rawData) {
        logger.error('Failed to parse scene response JSON');
        throw new Error('Failed to parse AI response as JSON');
      }

      const validation = validateSceneResponse(rawData);

      if (!validation.success) {
        logger.warn('Scene response validation had issues, using salvaged data', {
          error: validation.error
        });
      }

      return validation.data;
    } catch (error) {
      logger.error('Failed to generate scene response', { error: error.message });
      throw new Error('Failed to generate scene response: ' + error.message);
    }
  }

  /**
   * Generate story context suggestion
   * @param {Object} params - Context generation parameters
   * @returns {Promise<string>}
   */
  async generateContext({ theme, tone, difficulty }) {
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
      const response = await this.makeRequest({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate a creative story hook.' }
        ],
        temperature: 0.9,
        max_tokens: 150
      }, { timeout: 15000 });

      const content = response.data.choices[0].message.content.trim();
      const validation = validateContextResponse(content);

      return validation.data;
    } catch (error) {
      logger.error('Failed to generate context', { error: error.message });
      throw new Error('Failed to generate context: ' + error.message);
    }
  }

  /**
   * Generate character name based on class
   * @param {Object} params - Name generation parameters
   * @returns {Promise<string>}
   */
  async generateCharacterName({ characterClass }) {
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
      const response = await this.makeRequest({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate a character name.' }
        ],
        temperature: 0.9,
        max_tokens: 30
      }, { timeout: 10000 });

      const content = response.data.choices[0].message.content.trim();
      const validation = validateCharacterNameResponse(content);

      return validation.data;
    } catch (error) {
      logger.error('Failed to generate character name', { error: error.message });
      throw new Error('Failed to generate name: ' + error.message);
    }
  }

  /**
   * Test Groq API connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.defaultModel,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      return response.status === 200;
    } catch (error) {
      logger.error('Groq API connection test failed', { error: error.message });
      return false;
    }
  }
}

module.exports = GroqProvider;
