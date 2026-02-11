/**
 * Roll a single die
 * @param {number} sides - Number of sides on the die
 * @returns {number} Roll result
 */
function rollDie(sides = 20) {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice and sum results
 * @param {number} count - Number of dice to roll
 * @param {number} sides - Number of sides on each die
 * @returns {number} Sum of all rolls
 */
function rollDice(count = 1, sides = 20) {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += rollDie(sides);
  }
  return total;
}

/**
 * Roll 3d6 (standard D&D stat roll)
 * @returns {number} Sum of 3d6
 */
function roll3d6() {
  return rollDice(3, 6);
}

/**
 * Calculate ability score modifier
 * @param {number} score - Ability score
 * @returns {number} Modifier
 */
function getModifier(score) {
  return Math.floor((score - 10) / 2);
}

/**
 * Format API response
 * @param {boolean} success - Success status
 * @param {*} data - Response data
 * @param {string} message - Response message
 * @returns {Object} Formatted response
 */
function formatResponse(success, data = null, message = '') {
  return {
    success,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Format error response
 * @param {string} error - Error message
 * @param {*} details - Additional error details
 * @returns {Object} Formatted error response
 */
function formatError(error, details = null) {
  return {
    success: false,
    error,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate dice roll
 * @param {number} roll - Dice roll value
 * @param {number} sides - Number of sides (default 20)
 * @returns {boolean} Valid roll
 */
function isValidRoll(roll, sides = 20) {
  return Number.isInteger(roll) && roll >= 1 && roll <= sides;
}

module.exports = {
  rollDie,
  rollDice,
  roll3d6,
  getModifier,
  formatResponse,
  formatError,
  isValidRoll
};
