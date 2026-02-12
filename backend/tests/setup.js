/**
 * Test setup file
 * Runs before all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.DATABASE_PATH = ':memory:';

// Suppress console logs during tests (optional)
if (process.env.SUPPRESS_LOGS === 'true') {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
}

// Global test utilities
global.testUtils = {
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};
