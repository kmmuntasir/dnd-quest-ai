import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, Trash2, Play, Heart, Coins, MapPin, Shield, Wand2, Sword, Users, Leaf, Plus, Image as ImageIcon, X, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { StoryGenerator } from '../components/game/StoryGenerator';
import { Image } from '../components/ui/Image';
import { FadeIn, SlideUp } from '../components/ui/Transitions';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Class icons mapping
const classIcons = {
  Fighter: Shield,
  Wizard: Wand2,
  Rogue: Sword,
  Cleric: Users,
  Ranger: Leaf
};

// Difficulty colors
const difficultyColors = {
  easy: 'text-green-400 bg-green-400/10 border-green-400/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  hard: 'text-red-400 bg-red-400/10 border-red-400/30'
};

// Play History Modal Component
function PlayHistoryModal({ adventure, onClose, onResume, onNewGame, onViewGallery, onDeleteAdventure }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, [adventure.adventure_id]);

  const loadGames = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/saved-games/adventures/${adventure.adventure_id}/games`);
      setGames(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load games:', error);
      setLoading(false);
    }
  };

  const handleDeleteGame = async (gameId) => {
    if (!window.confirm('Are you sure you want to delete this playthrough?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/saved-games/${gameId}`);
      setGames(games.filter(g => g.id !== gameId));
      if (games.length === 1) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete game:', error);
      alert(error.response?.data?.error || 'Failed to delete game.');
    }
  };

  const handleDeleteAdventure = async () => {
    if (!window.confirm('Are you sure you want to delete this entire adventure? This will delete all playthroughs and cannot be undone.')) return;

    try {
      await axios.delete(`${API_BASE_URL}/adventures/${adventure.adventure_id}`);
      onDeleteAdventure(adventure.adventure_id);
      onClose();
    } catch (error) {
      console.error('Failed to delete adventure:', error);
      alert(error.response?.data?.error || 'Failed to delete adventure.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <FadeIn>
        <div
          className="bg-background-card rounded-2xl border border-background-input max-w-2xl w-full max-h-[85vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={adventure.cover_image_url}
              alt={adventure.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background-card via-background-card/30 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-6 right-6">
              <h2 className="font-display text-2xl font-bold text-white">{adventure.title}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${difficultyColors[adventure.difficulty]}`}>
                  {adventure.difficulty.charAt(0).toUpperCase() + adventure.difficulty.slice(1)}
                </span>
                <span className="text-gray-400 text-sm">{adventure.play_count} playthrough{adventure.play_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex gap-2 px-6 py-3 border-b border-background-input bg-background-dark/30">
            <Button
              onClick={() => onNewGame(adventure.adventure_id)}
              variant="primary"
              className="gap-2 flex-1"
            >
              <Plus className="w-4 h-4" />
              New Character
            </Button>
            <Button
              onClick={() => onViewGallery(adventure.adventure_id)}
              variant="secondary"
              className="gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Scenes
            </Button>
            <Button
              onClick={handleDeleteAdventure}
              variant="ghost"
              className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/10"
              title="Delete adventure"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Play History List */}
          <div className="overflow-y-auto max-h-[400px]">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Loading play history...</p>
              </div>
            ) : games.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400">No playthroughs found.</p>
              </div>
            ) : (
              <div className="divide-y divide-background-input">
                {games.map((game) => {
                  const ClassIcon = classIcons[game.character_class] || Shield;
                  const hpPercent = (game.hp / game.maxHp) * 100;
                  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500';

                  return (
                    <div key={game.id} className="p-4 hover:bg-background-dark/30 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Character Avatar */}
                        <div className="w-12 h-12 rounded-full bg-background-input flex items-center justify-center flex-shrink-0">
                          <ClassIcon className="w-6 h-6 text-accent-gold" />
                        </div>

                        {/* Game Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display text-lg font-bold text-white truncate">
                              {game.character_name}
                            </h3>
                            <span className="text-gray-400 text-sm">{game.character_class}</span>
                          </div>

                          {/* Stats Row */}
                          <div className="flex items-center gap-4 mb-2">
                            {/* HP */}
                            <div className="flex items-center gap-1.5">
                              <Heart className="w-3.5 h-3.5 text-red-400" />
                              <div className="w-16 h-1.5 bg-background-input rounded-full overflow-hidden">
                                <div className={`h-full ${hpColor}`} style={{ width: `${hpPercent}%` }} />
                              </div>
                              <span className="text-xs text-gray-400">{game.hp}/{game.maxHp}</span>
                            </div>
                            {/* Gold */}
                            <div className="flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-yellow-400" />
                              <span className="text-xs text-gray-400">{game.gold}</span>
                            </div>
                            {/* Progress */}
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-accent-purple" />
                              <span className="text-xs text-gray-400">Scene {game.progress}</span>
                            </div>
                          </div>

                          {/* Last Played */}
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            Last played: {formatDate(game.last_played)}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            onClick={() => onResume(game.id)}
                            variant="primary"
                            size="sm"
                            className="gap-1"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Continue
                          </Button>
                          <button
                            onClick={() => handleDeleteGame(game.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            title="Delete playthrough"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export function Library() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adventures, setAdventures] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [selectedAdventure, setSelectedAdventure] = useState(null);

  // Check if user wants to generate new adventure
  const urlParams = new URLSearchParams(location.search);
  const shouldGenerate = urlParams.get('action') === 'generate';

  useEffect(() => {
    if (!shouldGenerate) {
      loadAdventures();
    }
  }, [shouldGenerate]);

  const loadAdventures = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/saved-games/adventures`);
      setAdventures(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load adventures:', error);
      setLoading(false);
    }
  };

  const handleResume = (gameId) => {
    setSelectedAdventure(null);
    navigate(`/game/${gameId}`);
  };

  const handleNewGame = (adventureId) => {
    setSelectedAdventure(null);
    navigate(`/create-character/${adventureId}`);
  };

  const handleViewGallery = (adventureId) => {
    setSelectedAdventure(null);
    navigate(`/gallery/${adventureId}`);
  };

  const handleDeleteAdventure = (adventureId) => {
    // Remove adventure from list after deletion
    setAdventures(adventures.filter(a => a.adventure_id !== adventureId));
  };

  // Show story generator if action=generate
  if (shouldGenerate || generating) {
    return <StoryGenerator />;
  }

  if (loading) {
    return <LoadingPage message="Loading your adventures..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-dark to-background-darker">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <FadeIn>
            <div className="flex items-center justify-between mb-10">
              <div>
                <h1 className="font-display text-5xl font-bold text-white mb-3">
                  Story Library
                </h1>
                <p className="text-gray-400 text-lg">
                  {adventures.length} {adventures.length === 1 ? 'story' : 'stories'} in your collection
                </p>
              </div>
              <Button
                onClick={() => setGenerating(true)}
                variant="secondary"
                className="gap-2 text-lg px-6 py-3"
              >
                <BookOpen className="w-5 h-5" />
                New Adventure
              </Button>
            </div>
          </FadeIn>

          {/* Adventures Grid */}
          {adventures.length === 0 ? (
            <FadeIn>
              <div className="bg-background-card p-16 rounded-3xl border border-background-input text-center">
                <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-background-input flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-gray-500" />
                </div>
                <h2 className="font-display text-3xl font-bold text-white mb-4">
                  No Adventures Yet
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto text-lg">
                  Your legend awaits! Start your first adventure and create memories that will echo through the ages.
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
            </FadeIn>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {adventures.map((adventure, index) => (
                <SlideUp key={adventure.adventure_id} delay={index * 100}>
                  <Card
                    hover
                    className="group overflow-hidden cursor-pointer"
                    onClick={() => setSelectedAdventure(adventure)}
                  >
                    {/* Cover Image */}
                    <div className="relative aspect-square overflow-hidden">
                      <Image
                        src={adventure.cover_image_url}
                        alt={adventure.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background-card via-transparent to-transparent" />

                      {/* Difficulty Badge */}
                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border ${difficultyColors[adventure.difficulty]}`}>
                        {adventure.difficulty.charAt(0).toUpperCase() + adventure.difficulty.slice(1)}
                      </div>

                      {/* Play Count Badge */}
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-accent-purple/80 backdrop-blur-sm text-xs font-bold text-white">
                        {adventure.play_count} {adventure.play_count === 1 ? 'playthrough' : 'playthroughs'}
                      </div>
                    </div>

                    <CardBody className="p-5">
                      {/* Adventure Title */}
                      <h3 className="font-display text-2xl font-bold text-white mb-2 line-clamp-1">
                        {adventure.title}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {adventure.description}
                      </p>

                      {/* Stats Row */}
                      <div className="flex items-center justify-between text-sm text-gray-400 bg-background-dark/50 px-3 py-2 rounded-lg mb-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-accent-purple" />
                          <span>{adventure.total_scenes} scenes</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-accent-gold" />
                          <span>Last: {new Date(adventure.last_played).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Click to View Hint */}
                      <div className="flex items-center justify-center gap-2 text-accent-gold text-sm font-medium group-hover:gap-3 transition-all">
                        <span>View Play History</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </CardBody>
                  </Card>
                </SlideUp>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Play History Modal */}
      {selectedAdventure && (
        <PlayHistoryModal
          adventure={selectedAdventure}
          onClose={() => setSelectedAdventure(null)}
          onResume={handleResume}
          onNewGame={handleNewGame}
          onViewGallery={handleViewGallery}
          onDeleteAdventure={handleDeleteAdventure}
        />
      )}
    </div>
  );
}

export default Library;
