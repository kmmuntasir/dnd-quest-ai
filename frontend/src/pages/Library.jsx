import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { BookOpen, Trash2, Play, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { StoryGenerator } from '../components/game/StoryGenerator';

export function Library() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savedGames, setSavedGames] = useState([]);
  const [generating, setGenerating] = useState(false);

  // Check if user wants to generate new adventure
  const urlParams = new URLSearchParams(location.search);
  const shouldGenerate = urlParams.get('action') === 'generate';

  useEffect(() => {
    if (!shouldGenerate) {
      loadSavedGames();
    }
  }, [shouldGenerate]);

  const loadSavedGames = async () => {
    try {
      setLoading(true);
      // TODO: Call backend API
      // const response = await axios.get('/api/saved-games');
      // setSavedGames(response.data.data);
      
      // For now, mock data
      setTimeout(() => {
        setSavedGames([
          {
            id: 1,
            character_name: 'Aragorn',
            character_class: 'Fighter',
            hp: 13,
            gold: 25,
            adventure_title: 'The Haunted Forest',
            difficulty: 'medium',
            total_scenes: 8,
            last_played: new Date().toISOString()
          }
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to load saved games:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (gameId) => {
    if (!window.confirm('Are you sure you want to delete this saved game?')) return;
    
    try {
      // TODO: Call backend API
      // await axios.delete(`/api/saved-games/${gameId}`);
      setSavedGames(savedGames.filter(g => g.id !== gameId));
    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  };

  const handleResume = (gameId) => {
    navigate(`/game/${gameId}`);
  };

  // Show story generator if action=generate
  if (shouldGenerate || generating) {
    return <StoryGenerator />;
  }

  if (loading) {
    return <LoadingPage message="Loading your adventures..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl font-bold text-white mb-2">
              Story Library
            </h1>
            <p className="text-gray-400">
              {savedGames.length} {savedGames.length === 1 ? 'adventure' : 'adventures'} saved
            </p>
          </div>
          <Button
            onClick={() => setGenerating(true)}
            variant="secondary"
            className="gap-2"
          >
            <BookOpen className="w-5 h-5" />
            New Adventure
          </Button>
        </div>

        {/* Saved Games Grid */}
        {savedGames.length === 0 ? (
          <div className="bg-background-card p-12 rounded-2xl border border-background-input text-center">
            <BookOpen className="w-24 h-24 mx-auto text-gray-600 mb-6" />
            <h2 className="font-display text-2xl font-bold text-white mb-3">
              No Adventures Yet
            </h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Start your first adventure by generating a new story, or continue from where you left off.
            </p>
            <Button
              onClick={() => setGenerating(true)}
              variant="primary"
              size="lg"
              className="gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Generate Adventure
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedGames.map((game) => (
              <Card key={game.id} hover className="group">
                <CardBody>
                  {/* Character Info */}
                  <div className="mb-4">
                    <h3 className="font-display text-xl font-bold text-white mb-2">
                      {game.character_name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {game.character_class} • {game.difficulty}
                    </p>
                  </div>

                  {/* Adventure Info */}
                  <div className="bg-background-dark/50 p-3 rounded-lg mb-4">
                    <p className="text-white font-medium">{game.adventure_title}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {game.total_scenes} scenes
                      </span>
                      <span>HP: {game.hp}</span>
                      <span>💰 {game.gold}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleResume(game.id)}
                      variant="primary"
                      className="flex-1 gap-2"
                      size="sm"
                    >
                      <Play className="w-4 h-4" />
                      Resume
                    </Button>
                    <Button
                      onClick={() => handleDelete(game.id)}
                      variant="danger"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Library;
