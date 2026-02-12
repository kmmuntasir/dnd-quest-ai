import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, ArrowRight, Zap, Dices, Wand2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardBody } from '../ui/Card';
import { Input, Textarea, Select } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const themes = [
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'horror', label: 'Horror' },
  { value: 'sci-fi', label: 'Science Fiction' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'pirate', label: 'Pirate' }
];

const tones = [
  { value: 'serious', label: 'Serious' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light-hearted' }
];

const difficulties = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

export function StoryGenerator() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    theme: 'fantasy',
    tone: 'serious',
    difficulty: 'medium',
    context: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatingContext, setGeneratingContext] = useState(false);

  // Randomize theme, tone, and difficulty
  const handleRandomize = () => {
    const randomTheme = themes[Math.floor(Math.random() * themes.length)].value;
    const randomTone = tones[Math.floor(Math.random() * tones.length)].value;
    const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)].value;

    setFormData(prev => ({
      ...prev,
      theme: randomTheme,
      tone: randomTone,
      difficulty: randomDifficulty
    }));
  };

  // Generate AI context suggestion
  const handleGenerateContext = async () => {
    setGeneratingContext(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/adventures/generate-context`, {
        theme: formData.theme,
        tone: formData.tone,
        difficulty: formData.difficulty
      });
      setFormData(prev => ({
        ...prev,
        context: response.data.context
      }));
    } catch (error) {
      console.error('Failed to generate context:', error);
      alert(error.response?.data?.error || 'Failed to generate context. Please try again.');
    } finally {
      setGeneratingContext(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Generating adventure with params:', formData);
      const response = await axios.post(`${API_BASE_URL}/adventures/generate`, formData);
      console.log('Adventure generated:', response.data);

      // Navigate to character creation with the new adventure ID
      navigate(`/create-character/${response.data.adventureId}`, { replace: true });
    } catch (error) {
      console.error('Failed to generate adventure:', error);
      // TODO: Show error toast to user
      alert(error.response?.data?.error || 'Failed to generate adventure. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Sparkles className="w-16 h-16 mx-auto text-accent-gold mb-4" />
          <h1 className="font-display text-4xl font-bold text-white mb-4">
            Create Your Adventure
          </h1>
          <p className="text-gray-400 text-lg">
            Configure your adventure parameters and let AI weave your tale
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Randomize Button */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleRandomize}
              className="gap-2"
            >
              <Dices className="w-4 h-4" />
              Randomize All
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Theme Selection */}
            <Select
              label="Theme"
              options={themes}
              value={formData.theme}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
            />

            {/* Tone Selection */}
            <Select
              label="Tone"
              options={tones}
              value={formData.tone}
              onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
            />

            {/* Difficulty Selection */}
            <Select
              label="Difficulty"
              options={difficulties}
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            />
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Additional Context (Optional)
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGenerateContext}
                disabled={generatingContext}
                className="gap-2 text-accent-purple hover:text-accent-purple/80"
              >
                {generatingContext ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    AI Generate
                  </>
                )}
              </Button>
            </div>
            <Textarea
              placeholder="Describe any specific elements you want in your adventure... (e.g., 'A haunted tavern where ghosts only appear at midnight')"
              value={formData.context}
              onChange={(e) => setFormData({ ...formData, context: e.target.value })}
              rows={4}
            />
            <p className="text-xs text-gray-500">
              Click "AI Generate" to let the AI create a story hook based on your theme, tone, and difficulty settings.
            </p>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="group w-full md:w-auto"
            >
              {!loading && <Zap className="w-5 h-5 mr-2" />}
              {loading ? 'Weaving Your Adventure...' : 'Generate Adventure'}
              {!loading && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
            </Button>
          </div>
        </form>

        {/* Info Card */}
        <div className="mt-8 bg-background-card/50 p-6 rounded-xl border border-background-input">
          <h3 className="font-display text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent-purple" />
            AI-Powered Generation
          </h3>
          <p className="text-gray-400 leading-relaxed">
            Our advanced AI will create a complete adventure with multiple scenes, NPCs,
            and branching choices based on your preferences. Generation typically takes 20-40 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}

export default StoryGenerator;
