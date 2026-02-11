// Simple test runner for backend API
const axios = require('axios');

const API_URL = 'http://localhost:3000';

// Test results tracking
const results = {
  passed: [],
  failed: []
};

// Test helper
async function test(name, testFn) {
  try {
    await testFn();
    console.log(`✅ ${name}`);
    results.passed.push(name);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
    results.failed.push({ name, error: error.message });
  }
}

// API tests
async function runTests() {
  console.log('\n🧪 Running Backend API Tests\n');
  console.log(`Testing against: ${API_URL}\n`);

  // Test 1: Health check
  await test('GET /health - should return healthy status', async () => {
    const res = await axios.get(`${API_URL}/health`);
    if (res.status !== 200) throw new Error('Expected 200 status');
    if (res.data.status !== 'healthy') throw new Error('Expected healthy status');
  });

  // Test 2: Root endpoint
  await test('GET / - should return API info', async () => {
    const res = await axios.get(`${API_URL}/`);
    if (res.status !== 200) throw new Error('Expected 200 status');
    if (!res.data.message) throw new Error('Expected message field');
  });

  // Test 3: Generate adventure (may take 30+ seconds)
  await test('POST /api/adventures/generate - should create adventure', async () => {
    console.log('   (This test may take 30+ seconds...)');
    const res = await axios.post(`${API_URL}/api/adventures/generate`, {
      theme: 'fantasy',
      tone: 'serious',
      difficulty: 'medium',
      context: 'A haunted forest adventure'
    });
    if (res.status !== 200) throw new Error('Expected 200 status');
    if (!res.data.adventureId) throw new Error('Expected adventureId');
    if (!res.data.scenes || res.data.scenes.length === 0) throw new Error('Expected scenes');
  }, 60000);

  // Test 4: List adventures
  await test('GET /api/adventures - should list adventures', async () => {
    const res = await axios.get(`${API_URL}/api/adventures`);
    if (res.status !== 200) throw new Error('Expected 200 status');
    if (!Array.isArray(res.data)) throw new Error('Expected array');
  });

  // Test 5: Get settings
  await test('GET /api/settings - should return settings', async () => {
    const res = await axios.get(`${API_URL}/api/settings`);
    if (res.status !== 200) throw new Error('Expected 200 status');
    if (!res.data.imageStyle) throw new Error('Expected imageStyle');
  });

  // Test 6: List saved games
  await test('GET /api/saved-games - should list saved games', async () => {
    const res = await axios.get(`${API_URL}/api/saved-games`);
    if (res.status !== 200) throw new Error('Expected 200 status');
    if (!Array.isArray(res.data)) throw new Error('Expected array');
  });

  // Test 7: AI connection test
  await test('GET /api/settings/ai/test - should test AI connections', async () => {
    const res = await axios.get(`${API_URL}/api/settings/ai/test`);
    if (res.status !== 200) throw new Error('Expected 200 status');
    if (!res.data.groq || !res.data.pollinations) throw new Error('Expected service status');
  });

  // Print results
  console.log('\n📊 Test Results:\n');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:\n');
    results.failed.forEach(f => {
      console.log(`   - ${f.name}: ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
