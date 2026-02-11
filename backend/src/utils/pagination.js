/**
 * Parse pagination parameters from request query
 * @param {Object} query - Request query object
 * @param {number} defaultPage - Default page number (default: 1)
 * @param {number} defaultLimit - Default items per page (default: 10)
 * @returns {Object} Pagination info { page, limit, offset }
 */
function parsePagination(query, defaultPage = 1, defaultLimit = 10) {
  const page = Math.max(1, parseInt(query.page) || defaultPage);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaultLimit));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Build pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} Pagination metadata
 */
function buildPaginationMeta(page, limit, total) {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Apply pagination to SQL query
 * @param {Object} stmt - Prepared statement
 * @param {number} offset - Offset value
 * @param {number} limit - Limit value
 * @returns {Object} Query results with pagination
 */
function applyPagination(stmt, offset, limit) {
  return stmt.all(limit, offset);
}

module.exports = {
  parsePagination,
  buildPaginationMeta,
  applyPagination
};
