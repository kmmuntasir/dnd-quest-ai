const { logger } = require('../utils/logger');

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a Zod schema
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Where to find data ('body', 'params', 'query')
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];

    const result = schema.safeParse(data);

    if (!result.success) {
      // Zod v4 uses .issues, fallback to .errors for older versions
      const issues = result.error.issues || result.error.errors || [];
      const errors = issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      logger.warn('Validation failed', {
        path: req.path,
        method: req.method,
        errors
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace request data with parsed/validated data
    req[source] = result.data;
    next();
  };
}

/**
 * Validate multiple sources (body, params, query)
 * @param {object} schemas - Object with schemas for each source
 */
function validateAll(schemas) {
  return (req, res, next) => {
    const errors = [];

    for (const [source, schema] of Object.entries(schemas)) {
      if (schema) {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
          // Zod v4 uses .issues, fallback to .errors for older versions
          const issues = result.error.issues || result.error.errors || [];
          errors.push(...issues.map(err => ({
            source,
            field: err.path.join('.'),
            message: err.message
          })));
        } else {
          req[source] = result.data;
        }
      }
    }

    if (errors.length > 0) {
      logger.warn('Validation failed', {
        path: req.path,
        method: req.method,
        errors
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

module.exports = {
  validate,
  validateAll
};
