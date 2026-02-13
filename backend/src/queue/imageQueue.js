/**
 * Image Generation Queue
 * Handles background image generation with concurrency control
 */

const { logger } = require('../utils/logger');
const { getImageProvider, imageProviderConfig, getImageFallbackChain, executeImageWithFallback } = require('../providers');
const db = require('../config/database');

/**
 * Job status enum
 */
const JobStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Image Generation Job
 */
class ImageJob {
  constructor({ hash, prompt, type, adventureId, entityId, options = {} }) {
    this.hash = hash;
    this.prompt = prompt;
    this.type = type; // 'scene' | 'npc'
    this.adventureId = adventureId;
    this.entityId = entityId; // scene_id or npc_id
    this.options = options;
    this.status = JobStatus.PENDING;
    this.attempts = 0;
    this.maxAttempts = 3;
    this.error = null;
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
  }
}

/**
 * Image Generation Queue
 * Manages concurrent image generation with proper status tracking
 */
class ImageQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 3; // Max concurrent jobs
    this.activeJobs = new Map(); // Currently processing jobs
    this.pendingQueue = []; // Waiting jobs
    this.completedJobs = new Map(); // Completed job results
    this.isProcessing = false;
    this.processInterval = null;

    // Event handlers
    this.onJobComplete = options.onJobComplete || (() => {});
    this.onJobFail = options.onJobFail || (() => {});
    this.onQueueEmpty = options.onQueueEmpty || (() => {});
  }

  /**
   * Add a job to the queue
   * @param {Object} jobData - Job data
   * @returns {ImageJob} The created job
   */
  addJob(jobData) {
    const job = new ImageJob(jobData);
    this.pendingQueue.push(job);
    logger.debug('Image job queued', {
      hash: job.hash,
      type: job.type,
      adventureId: job.adventureId,
      queueLength: this.pendingQueue.length
    });

    // Start processing if not already
    this.startProcessing();

    return job;
  }

  /**
   * Add multiple jobs at once
   * @param {Array<Object>} jobsData - Array of job data
   */
  addJobs(jobsData) {
    const jobs = jobsData.map(data => new ImageJob(data));
    this.pendingQueue.push(...jobs);

    logger.info('Batch of image jobs queued', {
      count: jobs.length,
      adventureId: jobs[0]?.adventureId,
      queueLength: this.pendingQueue.length
    });

    // Reset circuit breakers to give providers a fresh start for new adventure
    resetProviderCircuitBreakers();

    this.startProcessing();
  }

  /**
   * Start processing the queue
   */
  startProcessing() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processQueue();
  }

  /**
   * Stop processing the queue
   */
  stopProcessing() {
    this.isProcessing = false;
    if (this.processInterval) {
      clearTimeout(this.processInterval);
      this.processInterval = null;
    }
  }

  /**
   * Process the queue
   */
  async processQueue() {
    while (this.isProcessing && this.pendingQueue.length > 0 && this.activeJobs.size < this.concurrency) {
      const job = this.pendingQueue.shift();
      this.processJob(job);
    }

    // If queue is empty and no active jobs, we're done
    if (this.pendingQueue.length === 0 && this.activeJobs.size === 0) {
      this.isProcessing = false;
      this.onQueueEmpty();
    } else if (this.isProcessing && this.activeJobs.size >= this.concurrency) {
      // Wait a bit before checking again
      await new Promise(resolve => {
        this.processInterval = setTimeout(resolve, 100);
      });
      this.processQueue();
    }
  }

  /**
   * Process a single job
   * @param {ImageJob} job - The job to process
   */
  async processJob(job) {
    job.status = JobStatus.PROCESSING;
    job.startedAt = Date.now();
    job.attempts++;
    this.activeJobs.set(job.hash, job);

    logger.info('Processing image job', {
      hash: job.hash,
      type: job.type,
      adventureId: job.adventureId,
      attempt: job.attempts
    });

    // Update image status in database
    await this.updateImageStatus(job.hash, 'processing');

    try {
      // Get fallback chain and try each provider
      const fallbackChain = getImageFallbackChain();
      let lastError = null;
      let result = null;

      for (const providerName of fallbackChain) {
        const provider = getImageProvider(providerName);
        if (!provider) {
          logger.debug(`Provider ${providerName} not available, skipping`);
          continue;
        }

        // Check if provider can accept requests (circuit breaker)
        if (!provider.canRequest()) {
          logger.debug(`Provider ${providerName} circuit breaker open, skipping`);
          continue;
        }

        try {
          logger.info(`Trying provider ${providerName} for image`, { hash: job.hash });

          // Generate the image (this downloads and stores it)
          result = await provider.generateAndFetch(job.prompt, {
            ...job.options,
            existingHash: job.hash
          });

          if (result && result.file_path) {
            // Success! Update database with success
            await db.run(`
              UPDATE images
              SET status = 'ready',
                  cached_path = ?,
                  provider = ?
              WHERE hash = ?
            `, [result.file_path, providerName, job.hash]);

            job.status = JobStatus.COMPLETED;
            job.completedAt = Date.now();
            job.result = result;

            logger.info('Image job completed', {
              hash: job.hash,
              duration: job.completedAt - job.startedAt,
              provider: providerName
            });

            this.onJobComplete(job);
            return; // Success, exit the function
          }
        } catch (providerError) {
          lastError = providerError;
          logger.warn(`Provider ${providerName} failed for job`, {
            hash: job.hash,
            error: providerError.message
          });
          // Continue to next provider
        }
      }

      // All providers failed
      throw lastError || new Error('No image providers available');

    } catch (error) {
      job.error = error.message;
      logger.error('Image job failed', {
        hash: job.hash,
        error: error.message,
        stack: error.stack,
        attempt: job.attempts,
        prompt: job.prompt?.substring(0, 100)
      });

      // Retry if attempts remaining
      if (job.attempts < job.maxAttempts) {
        job.status = JobStatus.PENDING;
        this.pendingQueue.unshift(job); // Add back to front of queue
        logger.info('Requeueing failed job', {
          hash: job.hash,
          attempt: job.attempts,
          maxAttempts: job.maxAttempts
        });
      } else {
        // Max attempts reached, mark as failed
        job.status = JobStatus.FAILED;
        job.completedAt = Date.now();

        await this.updateImageStatus(job.hash, 'failed', error.message);
        this.onJobFail(job);
      }
    } finally {
      this.activeJobs.delete(job.hash);
      this.completedJobs.set(job.hash, job);

      // Continue processing
      if (this.isProcessing) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  /**
   * Update image status in database
   * @param {string} hash - Image hash
   * @param {string} status - New status
   * @param {string} error - Error message (optional)
   */
  async updateImageStatus(hash, status, error = null) {
    try {
      if (error) {
        await db.run(`
          UPDATE images SET status = ?, error_message = ? WHERE hash = ?
        `, [status, error, hash]);
      } else {
        await db.run(`
          UPDATE images SET status = ? WHERE hash = ?
        `, [status, hash]);
      }
    } catch (dbError) {
      logger.error('Failed to update image status', {
        hash,
        status,
        error: dbError.message
      });
    }
  }

  /**
   * Get queue status
   * @returns {Object} Queue status
   */
  getStatus() {
    return {
      pending: this.pendingQueue.length,
      active: this.activeJobs.size,
      completed: this.completedJobs.size,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Get adventure image generation progress
   * @param {number} adventureId - Adventure ID
   * @returns {Object} Progress info
   */
  getAdventureProgress(adventureId) {
    let pending = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;

    // Check pending queue
    for (const job of this.pendingQueue) {
      if (job.adventureId === adventureId) {
        pending++;
      }
    }

    // Check active jobs
    for (const [, job] of this.activeJobs) {
      if (job.adventureId === adventureId) {
        processing++;
      }
    }

    // Check completed jobs
    for (const [, job] of this.completedJobs) {
      if (job.adventureId === adventureId) {
        if (job.status === JobStatus.COMPLETED) completed++;
        else if (job.status === JobStatus.FAILED) failed++;
      }
    }

    const total = pending + processing + completed + failed;

    return {
      adventureId,
      total,
      pending,
      processing,
      completed,
      failed,
      isComplete: pending === 0 && processing === 0,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  /**
   * Clear completed jobs for an adventure
   * @param {number} adventureId - Adventure ID
   */
  clearAdventureJobs(adventureId) {
    for (const [hash, job] of this.completedJobs) {
      if (job.adventureId === adventureId) {
        this.completedJobs.delete(hash);
      }
    }
  }
}

// Create singleton instance
const imageQueue = new ImageQueue({
  concurrency: parseInt(process.env.IMAGE_QUEUE_CONCURRENCY) || 3,

  onJobComplete: async (job) => {
    // Update adventure progress
    await updateAdventureImageProgress(job.adventureId);
  },

  onJobFail: async (job) => {
    // Update adventure progress (failed counts too)
    await updateAdventureImageProgress(job.adventureId);
  },

  onQueueEmpty: () => {
    logger.info('Image queue is empty');
  }
});

/**
 * Reset circuit breakers for all providers
 * Useful when starting a new batch of image generation
 */
function resetProviderCircuitBreakers() {
  const { getImageProvider, getAvailableImageProviders } = require('../providers');
  const providers = getAvailableImageProviders();

  for (const providerName of providers) {
    const provider = getImageProvider(providerName);
    if (provider && provider.circuitBreaker) {
      provider.circuitBreaker.reset();
      logger.info(`Reset circuit breaker for ${providerName}`);
    }
  }
}

/**
 * Update adventure image progress in database
 * @param {number} adventureId - Adventure ID
 */
async function updateAdventureImageProgress(adventureId) {
  try {
    // Get image counts from database
    const stats = await db.get(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM images
      WHERE hash IN (
        SELECT image_hash FROM scenes WHERE adventure_id = ?
        UNION
        SELECT portrait_hash FROM npcs WHERE adventure_id = ?
      )
    `, [adventureId, adventureId]);

    const total = stats?.total || 0;
    const ready = stats?.ready || 0;
    const failed = stats?.failed || 0;

    // Determine adventure status
    let status = 'processing';
    if (total === 0) {
      status = 'ready'; // No images needed
    } else if (ready + failed === total) {
      status = failed === total ? 'failed' : 'ready';
    }

    await db.run(`
      UPDATE adventures
      SET status = ?,
          images_total = ?,
          images_ready = ?,
          images_failed = ?
      WHERE id = ?
    `, [status, total, ready, failed, adventureId]);

    logger.debug('Updated adventure image progress', {
      adventureId,
      status,
      total,
      ready,
      failed
    });
  } catch (error) {
    logger.error('Failed to update adventure image progress', {
      adventureId,
      error: error.message
    });
  }
}

module.exports = {
  imageQueue,
  ImageQueue,
  ImageJob,
  JobStatus,
  updateAdventureImageProgress,
  resetProviderCircuitBreakers
};
