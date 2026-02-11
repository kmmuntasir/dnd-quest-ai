// Request validation middleware
function validateRequest(requiredFields) {
  return (req, res, next) => {
    const missing = [];

    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        fields: missing
      });
    }

    next();
  };
}

module.exports = validateRequest;
