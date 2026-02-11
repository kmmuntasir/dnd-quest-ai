import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Swords, Heart, Coins, Backpack } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Image } from '../components/ui/Image';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { CharacterCreation } from './CharacterCreation';

export function Game() {
  const { gameId } = useParams();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);
  const [character, setCharacter] = useState(null);
  const [currentScene, setCurrentScene] = useState(null);
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);

  useEffect(() => {
    loadGame();
  }, [gameId]);

  const loadGame = async () => {
    try {
      // TODO: Call backend API
      // const response = await axios.get(`/api/games/${gameId}`);
      // setGame(response.data);
      
      // For now, mock data
      setTimeout(() => {
        setCharacter({
          name: 'Aragorn',
          class: 'Fighter',
          stats: { STR: 14, DEX: 12, INT: 10, WIS: 11, CON: 13, CHA: 9 },
          hp: 13,
          maxHp: 13,
          inventory: ['Health Potion', 'Steel Sword'],
          gold: 25
        });
        setCurrentScene({
          id: 1,
          description: 'You stand at the edge of an ancient forest. The trees tower above you, their branches creating a canopy that blocks most of the sunlight. A narrow path winds into the darkness ahead. You hear the distant sound of howling wolves.',
          image_url: 'https://via.placeholder.com/1024x576/4a1c6b/ffffff?text=Forest+Scene',
          choices: [
            'Enter the forest cautiously',
            'Look for another way around',
            'Return to the village',
            'Light a torch and proceed'
          ],
          is_key_scene: true
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to load game:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingPage message="Loading your adventure..." />;
  }

  if (showCharacterCreation) {
    return <CharacterCreation />;
  }

  if (!game || !character || !currentScene) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-darker">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold text-white mb-4">
            Game Not Found
          </h1>
          <p className="text-gray-400">
            The adventure you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-dark to-background-darker">
      {/* Character Stats Bar (Mobile) */}
      <div className="md:hidden bg-background-dark/90 backdrop-blur-sm border-b border-background-card p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-bold text-white">
              {character.name}
            </p>
            <p className="text-sm text-gray-400">
              {character.class}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-accent-red" />
              <span className="text-sm text-white">
                {character.hp}/{character.maxHp}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-accent-gold" />
              <span className="text-sm text-white">
                {character.gold}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Layout */}
      <div className="container mx-auto px-4 py-6">
        <div className="lg:grid lg:grid-cols-[300px_1fr_300px] gap-6">
          {/* Left Sidebar - Character Stats (Desktop) */}
          <aside className="hidden lg:block">
            <Card className="sticky top-6">
              <div className="p-6 space-y-6">
                {/* Character Info */}
                <div className="text-center border-b border-background-input pb-6">
                  <h2 className="font-display text-2xl font-bold text-white mb-2">
                    {character.name}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {character.class}
                  </p>
                </div>

                {/* HP Bar */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-5 h-5 text-accent-red" />
                    <span className="font-bold text-white">
                      Hit Points
                    </span>
                  </div>
                  <div className="relative">
                    <div className="w-full h-4 bg-background-input rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-red transition-all duration-300"
                        style={{ width: `${(character.hp / character.maxHp) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center mt-1 text-sm">
                    <span className="text-accent-red font-bold">{character.hp}</span>
                    <span className="text-gray-400"> / </span>
                    <span className="text-white">{character.maxHp}</span>
                  </div>
                </div>

                {/* Gold */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-accent-gold" />
                    <span className="font-bold text-white">Gold</span>
                  </div>
                  <span className="font-display text-2xl font-bold text-accent-gold">
                    {character.gold}
                  </span>
                </div>

                {/* Stats */}
                <div>
                  <h3 className="font-display text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Swords className="w-5 h-5 text-accent-gold" />
                    Stats
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(character.stats).map(([stat, value]) => (
                      <div
                        key={stat}
                        className="flex items-center justify-between bg-background-dark/50 p-2 rounded"
                      >
                        <span className="text-sm text-gray-400">
                          {stat}
                        </span>
                        <span className="font-display text-xl font-bold text-white">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inventory */}
                <div>
                  <h3 className="font-display text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Backpack className="w-5 h-5 text-accent-gold" />
                    Inventory
                  </h3>
                  <div className="space-y-2">
                    {character.inventory.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">
                        No items
                      </p>
                    ) : (
                      character.inventory.map((item, index) => (
                        <div
                          key={index}
                          className="bg-background-dark/50 p-2 rounded text-sm text-gray-300"
                        >
                          {item}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </aside>

          {/* Center - Scene Display */}
          <div className="order-first lg:order-none">
            {/* Scene Image */}
            <div className="mb-6">
              <div className="aspect-video bg-background-input rounded-2xl overflow-hidden shadow-2xl border border-background-input">
                <Image src={currentScene.image_url} alt={currentScene.description} />
              </div>
            </div>

            {/* Scene Narrative */}
            <div className="bg-background-card p-8 rounded-2xl border border-background-input mb-6">
              <p className="text-lg text-white leading-relaxed font-fantasy">
                {currentScene.description}
              </p>
            </div>

            {/* Scene Number */}
            <div className="text-center mb-4">
              <span className="inline-block bg-background-dark/50 px-4 py-2 rounded-full text-sm text-gray-400">
                Scene {currentScene.id}
                {currentScene.is_key_scene && ' • Key Scene'}
              </span>
            </div>
          </div>

          {/* Right Sidebar - Choices */}
          <aside className="space-y-4">
            {/* Choices */}
            <Card>
              <div className="p-6">
                <h3 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Swords className="w-6 h-6 text-accent-gold" />
                  Your Choice
                </h3>
                <div className="space-y-3">
                  {currentScene.choices.map((choice, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-4 py-4 bg-background-dark/50 hover:bg-background-input text-white rounded-lg border border-background-input hover:border-primary-default transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded bg-background-input flex items-center justify-center text-sm font-bold text-gray-400 group-hover:bg-primary-default group-hover:text-white transition-colors">
                          {index + 1}
                        </div>
                        <span className="text-left">
                          {choice}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Dice Roll */}
            <Card>
              <div className="p-6">
                <h3 className="font-display text-xl font-bold text-white mb-4 text-center">
                  Make Your Choice
                </h3>
                <p className="text-sm text-gray-400 text-center mb-4">
                  Select an option above, then roll the d20 to determine your outcome
                </p>
                <button className="w-full px-6 py-4 bg-primary-default hover:bg-primary-hover text-white rounded-xl font-display text-lg font-bold transition-all transform hover:scale-105 shadow-lg">
                  Roll d20
                </button>
              </div>
            </Card>

            {/* Save Button */}
            <button className="w-full px-6 py-3 bg-background-card hover:bg-background-input text-white rounded-lg border border-background-input transition-all flex items-center justify-center gap-2">
              <Backpack className="w-5 h-5 text-gray-400" />
              Save Game
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Game;
