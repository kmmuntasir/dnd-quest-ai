const axios = require('axios');

// App referrer for Pollinations.ai API identification
const APP_REFERRER = 'dungeons-and-dragons-rpg';

/**
 * Generate image using Pollinations.ai API
 * @param {string} prompt - Image generation prompt
 * @param {Object} options - Additional options
 * @param {string} options.style - Image style (fantasy art, realistic, cartoon)
 * @param {number} options.width - Image width (default: 1024)
 * @param {number} options.height - Image height (default: 1024)
 * @returns {Promise<string>} Image URL
 */
async function generateImage(prompt, options = {}) {
  const { style = 'fantasy art', width = 1024, height = 1024 } = options;

  // Enhance prompt with style keywords
  const enhancedPrompt = `${prompt}, ${style} style, high quality, detailed, atmospheric`;

  try {
    // Pollinations.ai generates images via GET request with prompt in URL
    // Using referrer for app identification (no auth required)
    // Using enhance=true for better prompt processing
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&enhance=true&referrer=${APP_REFERRER}&model=flux`;

    // Test if the image is accessible (with timeout)
    const response = await axios.head(imageUrl, {
      timeout: 15000,
      validateStatus: (status) => status === 200
    });

    return imageUrl;
  } catch (error) {
    console.error('Pollinations.ai error:', error.message);
    // Return placeholder image on error
    return 'https://via.placeholder.com/1024x1024/4a1c6b/ffffff?text=AI+Image+Generation+Failed';
  }
}

/**
 * Generate images for scenes
 * @param {Array} scenes - Array of scene objects with imagePrompt
 * @param {string} style - Image style
 * @returns {Promise<Array>} Array of scene objects with image URLs
 */
async function generateSceneImages(scenes, style = 'fantasy art') {
  const sceneImages = await Promise.all(
    scenes.map(async (scene) => {
      const imageUrl = await generateImage(scene.imagePrompt, { style });
      return {
        ...scene,
        image_url: imageUrl
      };
    })
  );

  return sceneImages;
}

/**
 * Generate NPC portrait
 * @param {Object} npc - NPC object with name and description
 * @param {string} style - Image style
 * @returns {Promise<string>} Image URL
 */
async function generateNPCPortrait(npc, style = 'fantasy art') {
  const prompt = `Portrait of ${npc.name}, ${npc.description}, ${npc.role}, character design`;
  return generateImage(prompt, { style, width: 512, height: 512 });
}

/**
 * Test Pollinations.ai API connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    const testUrl = `https://image.pollinations.ai/prompt/test?width=512&height=512&referrer=${APP_REFERRER}`;
    await axios.head(testUrl, {
      timeout: 15000,
      validateStatus: (status) => status === 200
    });
    return true;
  } catch (error) {
    console.error('Pollinations.ai connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  generateImage,
  generateSceneImages,
  generateNPCPortrait,
  testConnection
};
