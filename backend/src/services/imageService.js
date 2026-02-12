const axios = require('axios');

// API key for Pollinations.ai (removes watermark when provided)
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;

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
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const seed = Math.floor(Math.random() * 1000000);

    // Build URL with parameters
    const params = new URLSearchParams({
      width: width.toString(),
      height: height.toString(),
      seed: seed.toString(),
      enhance: 'true',
      model: 'flux',
      referrer: APP_REFERRER
    });

    // Add nologo if API key is available (removes watermark)
    if (POLLINATIONS_API_KEY) {
      params.append('nologo', 'true');
    }

    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;

    // Note: Pollinations.ai generates images on-demand when the URL is accessed.
    // We return the URL immediately and let the browser fetch it.
    // This is faster and more reliable than waiting for generation.
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
    const params = new URLSearchParams({
      width: '512',
      height: '512',
      referrer: APP_REFERRER
    });

    // Add nologo if API key is available (removes watermark)
    if (POLLINATIONS_API_KEY) {
      params.append('nologo', 'true');
    }

    const testUrl = `https://image.pollinations.ai/prompt/test?${params.toString()}`;

    const headers = {};
    if (POLLINATIONS_API_KEY) {
      headers['Authorization'] = `Bearer ${POLLINATIONS_API_KEY}`;
    }

    // Use GET with longer timeout (60s) since image generation takes time
    const response = await axios.get(testUrl, {
      timeout: 60000,
      headers,
      responseType: 'arraybuffer'
    });

    return response.status === 200 && response.data.byteLength > 0;
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
