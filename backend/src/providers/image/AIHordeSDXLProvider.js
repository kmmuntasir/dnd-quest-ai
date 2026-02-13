/**
 * AI Horde SDXL Image Provider
 * Generates high-quality images using AI Horde with SDXL models
 *
 * SDXL produces better quality but slower images (~60-90 seconds)
 * This provider is optimized for quality over speed
 */

const AIHordeProvider = require('./AIHordeProvider');
const { logger } = require('../../utils/logger');

/**
 * AI Horde SDXL Image Provider
 * Extends AIHordeProvider with SDXL-specific settings
 */
class AIHordeSDXLProvider extends AIHordeProvider {
  /**
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    // SDXL-optimized defaults (can be overridden by config)
    super({
      ...config,
      // SDXL MUST be 1024x1024 for best quality
      defaultWidth: config.width || 1024,
      defaultHeight: config.height || 1024,
      // Longer timeout for SDXL (90+ seconds is common)
      timeout: config.timeout || 180000, // 3 minutes
      circuitBreaker: config.circuitBreaker || {
        failureThreshold: 3, // Lower threshold since SDXL is less reliable
        resetTimeout: 120000, // 2 minutes
        successThreshold: 1
      }
    });

    // Override name to distinguish from regular AI Horde provider
    this.name = 'aihorde-sdxl';

    // SDXL-specific model and settings
    this.model = config.model || 'AlbedoBase XL (SDXL)';
    this.steps = config.steps || 30; // 30 is sweet spot for SDXL quality
    this.sampler = config.sampler || 'k_dpmpp_2m'; // Best sampler for SDXL
    this.cfgScale = config.cfgScale || 7;
    this.karras = config.karras !== false; // Default true for SDXL
    this.pollInterval = config.pollInterval || 5000; // 5s for SDXL (slower)
    this.maxPollAttempts = config.maxPollAttempts || 180; // 15 min max (5s * 180)
  }

  /**
   * Submit async image generation request with SDXL-specific params
   * @param {string} prompt - Image prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Request ID
   */
  async submitGenerationRequest(prompt, options = {}) {
    const { width = this.defaultWidth, height = this.defaultHeight } = options;

    const payload = {
      prompt,
      params: {
        // --- SDXL REQUIRED SETTINGS ---
        width,              // SDXL MUST be 1024x1024 or it looks bad
        height,
        steps: this.steps,  // 30 is the sweet spot for SDXL quality
        sampler_name: this.sampler, // k_dpmpp_2m is best for SDXL
        cfg_scale: this.cfgScale,
        karras: this.karras, // Improves details
        n: 1
        // ------------------------------
      },
      nsfw: false,
      censor_nsfw: true,
      models: [this.model],
      r2: true // Use R2 for faster image delivery
    };

    logger.info('SDXL generation request', {
      model: this.model,
      steps: this.steps,
      sampler: this.sampler,
      karras: this.karras,
      width,
      height
    });

    // Use parent's submit logic but with SDXL payload
    const axios = require('axios');
    const response = await axios.post(
      `${this.apiUrl}/generate/async`,
      payload,
      {
        headers: this.getHeaders(),
        timeout: 30000
      }
    );

    // Handle Kudos errors specifically
    if (!response.data.id) {
      if (response.data.rc === 'KudosUpfront') {
        logger.error('SDXL requires Kudos', {
          message: response.data.message
        });
        throw new Error(`SDXL requires Kudos: ${response.data.message}. Rate images at https://tinybots.net/artbot/rate`);
      }
      throw new Error(`Failed to start SDXL generation: ${JSON.stringify(response.data)}`);
    }

    logger.info('AI Horde SDXL generation request submitted', {
      requestId: response.data.id,
      model: this.model
    });

    return response.data.id;
  }

  /**
   * Wait for generation to complete with SDXL-specific logging
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Generation result with image URL
   */
  async waitForGeneration(requestId) {
    let attempts = 0;
    const startTime = Date.now();

    while (attempts < this.maxPollAttempts) {
      const status = await this.checkGenerationStatus(requestId);

      if (status.done) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        logger.info('SDXL generation complete', {
          requestId,
          elapsedSeconds: elapsed,
          attempts: attempts + 1
        });

        const result = await this.getGenerationResult(requestId);

        if (result.generations && result.generations.length > 0) {
          return result.generations[0];
        }

        throw new Error('SDXL generation complete but no images returned');
      }

      if (status.faulted) {
        throw new Error(`SDXL generation failed: ${status.message || 'Unknown error'}`);
      }

      // Log progress with queue position
      const queuePosition = status.queue_position || 'unknown';
      const waitTime = status.wait_time || 'unknown';
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      logger.debug('SDXL generation in progress', {
        requestId,
        queuePosition,
        waitTime,
        processing: status.processing,
        waiting: status.waiting,
        attempt: attempts + 1,
        elapsedSeconds: elapsed
      });

      await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      attempts++;
    }

    throw new Error('SDXL generation timed out (max 15 minutes)');
  }
}

module.exports = AIHordeSDXLProvider;
