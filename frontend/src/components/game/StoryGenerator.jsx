import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Zap } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { Input, Textarea, Select } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // TODO: Call backend API to generate adventure
      // const response = await axios.post('/api/adventures/generate', formData);
      // Navigate to the generated adventure
      
      // For now, just simulate and navigate to library
      setTimeout(() => {
        navigate('/library', { replace: true });
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to generate adventure:', error);
      setLoading(false);
      // TODO: Show error toast
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
          <Textarea
            label="Additional Context (Optional)"
            placeholder="Describe any specific elements you want in your adventure... (e.g., 'A haunted tavern where ghosts only appear at midnight')"
            value={formData.context}
            onChange={(e) => setFormData({ ...formData, context: e.target.value })}
            rows={4}
          />

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
