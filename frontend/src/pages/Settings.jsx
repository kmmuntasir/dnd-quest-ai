import { useState, useEffect } from 'react';
import axios from 'axios';
import { Palette, Sliders, Volume2, Shield, Check } from 'lucide-react';
import { Card, CardBody, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { Toast } from '../components/ui/Toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const imageStyles = [
  { value: 'fantasy art', label: 'Fantasy Art' },
  { value: 'realistic', label: 'Realistic' },
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'watercolor', label: 'Watercolor' }
];

const difficulties = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

export function Settings() {
  const [settings, setSettings] = useState({
    imageStyle: 'fantasy art',
    difficulty: 'medium',
    diceAnimations: true,
    soundEffects: false
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  const [aiStatus, setAiStatus] = useState({ groq: false, pollinations: false });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings`);
      setSettings(prev => ({
        ...prev,
        ...response.data
      }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      await axios.put(`${API_BASE_URL}/settings`, settings);

      setLoading(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setLoading(false);
      alert(error.response?.data?.error || 'Failed to save settings. Please try again.');
    }
  };

  const testAIConnection = async () => {
    try {
      setTestingAI(true);
      const response = await axios.get(`${API_BASE_URL}/settings/ai/test`);
      setAiStatus({
        groq: response.data.groq || false,
        pollinations: response.data.pollinations || false
      });
      setTestingAI(false);
    } catch (error) {
      console.error('Failed to test AI:', error);
      setAiStatus({ groq: false, pollinations: false });
      setTestingAI(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-12">
          <Sliders className="w-16 h-16 mx-auto text-accent-gold mb-4" />
          <h1 className="font-display text-4xl font-bold text-white mb-4">
            Settings
          </h1>
          <p className="text-gray-400 text-lg">
            Customize your adventure experience
          </p>
        </div>

        {/* AI Settings Section */}
        <Card>
          <CardBody>
            <h2 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Palette className="w-6 h-6 text-accent-purple" />
              AI Settings
            </h2>

            <div className="space-y-6">
              {/* Image Style */}
              <Select
                label="Image Style"
                options={imageStyles}
                value={settings.imageStyle}
                onChange={(e) => setSettings({ ...settings, imageStyle: e.target.value })}
              />

              {/* Difficulty */}
              <Select
                label="Default Difficulty"
                options={difficulties}
                value={settings.difficulty}
                onChange={(e) => setSettings({ ...settings, difficulty: e.target.value })}
              />

              {/* Test AI Connection */}
              <div className="bg-background-dark/50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium mb-1">Test AI Connections</p>
                    <p className="text-sm text-gray-400">
                      Verify Groq and Pollinations.ai are working
                    </p>
                  </div>
                  <Button
                    onClick={testAIConnection}
                    loading={testingAI}
                    variant="secondary"
                    size="sm"
                  >
                    Test
                  </Button>
                </div>

                {/* AI Status */}
                {testingAI ? (
                  <div className="mt-4 text-center text-gray-400">
                    Testing connections...
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between p-3 bg-background-dark/50 rounded">
                      <span className="text-white">Groq (Stories)</span>
                      <div className={`flex items-center gap-2 ${
                        aiStatus.groq ? 'text-accent-green' : 'text-accent-red'
                      }`}>
                        {aiStatus.groq ? <Check className="w-5 h-5" /> : <div className="w-5 h-5 bg-current rounded-full animate-pulse" />}
                        <span>{aiStatus.groq ? 'Connected' : 'Disconnected'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background-dark/50 rounded">
                      <span className="text-white">Pollinations.ai (Images)</span>
                      <div className={`flex items-center gap-2 ${
                        aiStatus.pollinations ? 'text-accent-green' : 'text-accent-red'
                      }`}>
                        {aiStatus.pollinations ? <Check className="w-5 h-5" /> : <div className="w-5 h-5 bg-current rounded-full animate-pulse" />}
                        <span>{aiStatus.pollinations ? 'Connected' : 'Disconnected'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Game Settings Section */}
        <Card>
          <CardBody>
            <h2 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Shield className="w-6 h-6 text-accent-gold" />
              Game Settings
            </h2>

            <div className="space-y-6">
              {/* Dice Animations */}
              <div className="flex items-center justify-between p-4 bg-background-dark/50 rounded">
                <div>
                  <p className="text-white font-medium">Dice Animations</p>
                  <p className="text-sm text-gray-400">
                    Animate dice rolls with 3D effects
                  </p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, diceAnimations: !settings.diceAnimations })}
                  className={`w-16 h-8 rounded-full transition-all ${
                    settings.diceAnimations
                      ? 'bg-primary-default hover:bg-primary-hover'
                      : 'bg-background-input hover:bg-background-card'
                  }`}
                >
                  <div className={`w-8 h-4 rounded-full transition-transform ${
                    settings.diceAnimations ? 'translate-x-4' : 'translate-x-0'
                  }`}>
                    <div className="w-4 h-4 bg-white rounded-full" />
                  </div>
                </button>
              </div>

              {/* Sound Effects */}
              <div className="flex items-center justify-between p-4 bg-background-dark/50 rounded">
                <div>
                  <p className="text-white font-medium">Sound Effects</p>
                  <p className="text-sm text-gray-400">
                    Play sounds for dice rolls and interactions
                  </p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, soundEffects: !settings.soundEffects })}
                  className={`w-16 h-8 rounded-full transition-all ${
                    settings.soundEffects
                      ? 'bg-primary-default hover:bg-primary-hover'
                      : 'bg-background-input hover:bg-background-card'
                  }`}
                >
                  <div className={`w-8 h-4 rounded-full transition-transform ${
                    settings.soundEffects ? 'translate-x-4' : 'translate-x-0'
                  }`}>
                    <div className="w-4 h-4 bg-white rounded-full" />
                  </div>
                </button>
              </div>
            </div>
          </CardBody>

          <CardFooter>
            <Button
              onClick={saveSettings}
              loading={loading}
              variant="primary"
              size="lg"
              className="w-full"
            >
              Save Settings
            </Button>
          </CardFooter>
        </Card>

        {/* Info Section */}
        <div className="bg-background-card/50 p-6 rounded-xl border border-background-input text-center">
          <p className="text-gray-400 text-sm">
            Settings are saved locally in your browser. Changes apply immediately.
          </p>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <Toast
          message="Settings saved successfully!"
          type="success"
          onClose={() => setShowSuccess(false)}
        />
      )}
    </div>
  );
}

export default Settings;
