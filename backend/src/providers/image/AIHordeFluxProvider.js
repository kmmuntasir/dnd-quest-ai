/**
 * AI Horde Flux Image Provider
 * Generates images using AI Horde with Flux.1-Schnell model
 *
 * Flux is fast (~4 steps) and produces high-quality images
 * Prefers natural language prompts over comma-separated tags
 */

const AIHordeProvider = require('./AIHordeProvider');
const { logger } = require('../../utils/logger');

/**
 * AI Horde Flux Image Provider
 * Extends AIHordeProvider with Flux-specific settings
 */
class AIHordeFluxProvider extends AIHordeProvider {
  /**
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    // Flux-optimized defaults (can be overridden by config)
    super({
      ...config,
      // Flux is native to 1024x1024
      defaultWidth: config.width || 1024,
      defaultHeight: config.height || 1024,
      // Flux is fast, but queue times vary
      timeout: config.timeout || 180000, // 3 minutes
      circuitBreaker: config.circuitBreaker || {
        failureThreshold: 3,
        resetTimeout: 120000, // 2 minutes
        successThreshold: 1
      }
    });

    // Override name to distinguish from other AI Horde providers
    this.name = 'aihorde-flux';

    // Flux-specific model and settings
    this.model = config.model || 'Flux.1-Schnell fp8 (Compact)';
    this.steps = config.steps || 4; // Flux-Schnell needs only 4 steps
    this.sampler = config.sampler || 'k_euler'; // MUST be k_euler for Flux
    this.cfgScale = config.cfgScale || 1; // MUST be 1 for Flux
    this.pollInterval = config.pollInterval || 3000; // Flux is fast, check often
    this.maxPollAttempts = config.maxPollAttempts || 180; // 9 min max
  }

  /**
   * Enhance prompt for Flux (prefers natural language)
   * Flux works best with descriptive sentences, not comma-separated tags
   * @param {string} prompt - Original prompt
   * @param {string} style - Style to apply
   * @returns {string} Enhanced prompt
   */
  enhancePrompt(prompt, style = '') {
    // Flux prefers natural language, so we keep the prompt more descriptive
    // and avoid overloading with tags
    if (style && !prompt.toLowerCase().includes(style.toLowerCase())) {
      return `${prompt}. ${style} style.`;
    }
    return prompt;
  }

  /**
   * Submit async image generation request with Flux-specific params
   * @param {string} prompt - Image prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Request ID
   */
  async submitGenerationRequest(prompt, options = {}) {
    const { width = this.defaultWidth, height = this.defaultHeight } = options;

    const payload = {
      prompt,
      params: {
        // --- FLUX SPECIFIC SETTINGS ---
        steps: this.steps,           // Flux-Schnell needs only 4 steps
        n: 1,
        width,                       // Flux is native to 1024x1024
        height,
        sampler_name: this.sampler,  // MUST be k_euler for Flux
        cfg_scale: this.cfgScale,    // MUST be 1 for Flux
        // -----------------------------
      },
      nsfw: false,
      censor_nsfw: true,
      models: [this.model],
      r2: true // Use R2 for faster image delivery
    };

    logger.info('Flux generation request', {
      model: this.model,
      steps: this.steps,
      sampler: this.sampler,
      cfgScale: this.cfgScale,
      width,
      height
    });

    // Use parent's submit logic but with Flux payload
    const axios = require('axios');
    const response = await axios.post(
      `${this.apiUrl}/generate/async`,
      payload,
      {
        headers: this.getHeaders(),
        timeout: 30000
      }
    );

    if (!response.data.id) {
      throw new Error(`Failed to start Flux generation: ${JSON.stringify(response.data)}`);
    }

    logger.info('AI Horde Flux generation request submitted', {
      requestId: response.data.id,
      model: this.model
    });

    return response.data.id;
  }

  /**
   * Wait for generation to complete with Flux-specific logging
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
        logger.info('Flux generation complete', {
          requestId,
          elapsedSeconds: elapsed,
          attempts: attempts + 1
        });

        const result = await this.getGenerationResult(requestId);

        if (result.generations && result.generations.length > 0) {
          return result.generations[0];
        }

        throw new Error('Flux generation complete but no images returned');
      }

      if (status.faulted) {
        throw new Error(`Flux generation failed: ${status.message || 'Unknown error'}`);
      }

      // Log progress - Flux workers are fewer than SD workers
      const queuePosition = status.queue_position || 'unknown';
      const waitTime = status.wait_time || 'unknown';
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      logger.debug('Flux generation in progress', {
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

    throw new Error('Flux generation timed out (max 9 minutes)');
  }
}

module.exports = AIHordeFluxProvider;
