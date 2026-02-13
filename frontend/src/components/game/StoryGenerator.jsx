import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Zap, Dices, Wand2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardBody } from '../ui/Card';
import { Input, Textarea, Select } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { adventuresAPI } from '../../services/api';

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
  { value: 'lighthearted', label: 'Light-hearted' },
  { value: 'dark', label: 'Dark' },
  { value: 'heroic', label: 'Heroic' },
  { value: 'mysterious', label: 'Mysterious' }
];

const difficulties = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

const lengths = [
  { value: 'quick', label: 'Quick (3 scenes)', description: 'A short adventure for quick sessions' },
  { value: 'standard', label: 'Standard (5 scenes)', description: 'A well-paced adventure' },
  { value: 'extended', label: 'Extended (8 scenes)', description: 'An epic journey' },
  { value: 'ai', label: 'AI Decides', description: 'Let AI choose the optimal length' }
];

export function StoryGenerator() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    theme: 'fantasy',
    tone: 'serious',
    difficulty: 'medium',
    length: 'standard',
    context: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatingContext, setGeneratingContext] = useState(false);

  // Randomize theme, tone, difficulty, and length
  const handleRandomize = () => {
    const randomTheme = themes[Math.floor(Math.random() * themes.length)].value;
    const randomTone = tones[Math.floor(Math.random() * tones.length)].value;
    const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)].value;
    const randomLength = lengths[Math.floor(Math.random() * lengths.length)].value;

    setFormData(prev => ({
      ...prev,
      theme: randomTheme,
      tone: randomTone,
      difficulty: randomDifficulty,
      length: randomLength
    }));
  };

  // Generate AI context suggestion
  const handleGenerateContext = async () => {
    setGeneratingContext(true);
    try {
      const response = await adventuresAPI.generateContext({
        theme: formData.theme,
        tone: formData.tone,
        difficulty: formData.difficulty
      });
      setFormData(prev => ({
        ...prev,
        context: response.data?.context || response.context
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
      const response = await adventuresAPI.generate(formData);
      const adventureId = response.data?.adventureId || response.adventureId;

      // Navigate to character creation with the new adventure ID
      navigate(`/create-character/${adventureId}`, { replace: true });
    } catch (error) {
      console.error('Failed to generate adventure:', error);
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

          <div className="grid md:grid-cols-2 gap-6">
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

            {/* Length Selection */}
            <Select
              label="Adventure Length"
              options={lengths}
              value={formData.length}
              onChange={(e) => setFormData({ ...formData, length: e.target.value })}
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
          <p className="text-gray-400 leading-relaxed mb-4">
            Our advanced AI will create a complete adventure with multiple scenes, NPCs,
            and branching choices based on your preferences.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-gold"></span>
              <span className="text-gray-300"><strong>Quick:</strong> 3 scenes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-purple"></span>
              <span className="text-gray-300"><strong>Standard:</strong> 5 scenes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-red"></span>
              <span className="text-gray-300"><strong>Extended:</strong> 8 scenes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              <span className="text-gray-300"><strong>AI Decides:</strong> 3-10 scenes</span>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-4">
            Generation time varies by length: Quick ~15s, Standard ~25s, Extended ~45s
          </p>
        </div>
      </div>
    </div>
  );
}

export default StoryGenerator;
