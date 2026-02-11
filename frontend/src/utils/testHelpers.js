import { useState } from 'react';

export function TestWrapper({ children, testName = 'Test' }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);

  const runTest = async (testFn) => {
    setStatus('running');
    setError(null);
    setDuration(0);

    const startTime = performance.now();
    const interval = setInterval(() => {
      setDuration(Math.floor((performance.now() - startTime) / 1000));
    }, 100);

    try {
      await testFn();
      setStatus('passed');
      setDuration((performance.now() - startTime) / 1000);
    } catch (err) {
      setStatus('failed');
      setError(err.message);
    } finally {
      clearInterval(interval);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'idle':
        return 'text-gray-400';
      case 'running':
        return 'text-primary-default animate-pulse';
      case 'passed':
        return 'text-accent-green';
      case 'failed':
        return 'text-accent-red';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-background-card p-4 rounded-lg border border-background-input">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg font-bold text-white">
          {testName}
        </h3>
        {status !== 'idle' && (
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {duration > 0 && `${duration.toFixed(2)}s • `}
            {status.toUpperCase()}
          </span>
        )}
      </div>
      {error && (
        <div className="bg-accent-red/10 p-3 rounded mb-3">
          <p className="text-sm text-accent-red font-medium">
            {error}
          </p>
        </div>
      )}
      <div className="min-h-[50px] flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// Mock API for testing
export const mockAPI = {
  getAdventures: () => Promise.resolve({ data: [] }),
  generateAdventure: (data) => Promise.resolve({ data: mockAdventure }),
  startGame: (data) => Promise.resolve({ data: mockGame }),
  getGameState: (id) => Promise.resolve({ data: mockGame }),
  submitChoice: (id, data) => Promise.resolve({ data: mockResponse }),
  saveGame: (id) => Promise.resolve({ success: true }),
  getSavedGames: (params) => Promise.resolve({ data: [], pagination: {} }),
  deleteSavedGame: (id) => Promise.resolve({ success: true }),
  getSettings: () => Promise.resolve({ data: {} }),
  updateSettings: (data) => Promise.resolve({ success: true }),
  testAI: () => Promise.resolve({ data: { groq: true, pollinations: true } })
};

const mockAdventure = {
  id: 1,
  title: 'Test Adventure',
  description: 'A test adventure',
  setting: 'Test Setting',
  quest: 'Test Quest',
  difficulty: 'medium',
  scenes: []
};

const mockGame = {
  id: 'test-game-1',
  character: {
    name: 'Test Character',
    class: 'Fighter',
    stats: { STR: 14, DEX: 12, INT: 10, WIS: 11, CON: 13, CHA: 9 },
    hp: 13,
    maxHp: 13,
    inventory: [],
    gold: 25
  },
  scene: {
    id: 1,
    description: 'Test scene description',
    image_url: 'https://via.placeholder.com/1024x576/4a1c6b/ffffff?text=Test',
    choices: ['Choice 1', 'Choice 2', 'Choice 3']
  }
};

const mockResponse = {
  narrative: 'Test outcome',
  outcome: 'success',
  character: {
    stats: { STR: 14, DEX: 12, INT: 10, WIS: 11, CON: 13, CHA: 9 },
    hp: 13,
    inventory: ['Test Item'],
    gold: 30
  }
};

export default TestWrapper;
