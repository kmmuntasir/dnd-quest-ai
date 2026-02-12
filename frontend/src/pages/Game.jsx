import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Swords, Heart, Coins, Backpack } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Image } from '../components/ui/Image';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { CharacterCreation } from '../components/game/CharacterCreation';
import { DiceRoller } from '../components/game/DiceRoller';
import { ChoicesList } from '../components/game/Choices';
import { FadeIn, SlideUp } from '../components/ui/Transitions';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function Game() {
  const { gameId } = useParams();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);
  const [character, setCharacter] = useState(null);
  const [currentScene, setCurrentScene] = useState(null);
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [narrative, setNarrative] = useState(null);

  useEffect(() => {
    loadGame();
  }, [gameId]);

  const loadGame = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/games/${gameId}`);
      const data = response.data;

      setGame(data);
      setCharacter({
        name: data.character.name,
        class: data.character.class,
        stats: data.character.stats,
        hp: data.character.hp,
        maxHp: data.character.hp,
        inventory: data.character.inventory,
        gold: data.character.gold
      });
      setCurrentScene(data.scene);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load game:', error);
      setLoading(false);
      alert(error.response?.data?.error || 'Failed to load game. Please try again.');
    }
  };

  const handleDiceRoll = async (diceValue) => {
    if (selectedChoice === null) {
      alert('Please select a choice first!');
      return;
    }

    try {
      setRolling(true);
      const response = await axios.post(`${API_BASE_URL}/games/${gameId}/choice`, {
        choiceIndex: selectedChoice,
        diceRoll: diceValue
      });

      const data = response.data;

      // Update narrative
      setNarrative(data.narrative);

      // Update character state
      if (data.character) {
        setCharacter(prev => ({
          ...prev,
          hp: data.character.hp,
          gold: data.character.gold,
          inventory: data.character.inventory,
          stats: data.character.stats || prev.stats
        }));
      }

      // Check for game over
      if (data.gameOver) {
        alert(data.victory ? 'Congratulations! You won!' : 'Game Over! You have been defeated.');
        // Could navigate to a game over screen here
      } else if (data.nextScene) {
        // Progress to next scene after a short delay to show narrative
        setTimeout(() => {
          setCurrentScene(data.nextScene);
          setNarrative(null); // Clear narrative for new scene
        }, 1500);
      }

      // Reset for next choice
      setSelectedChoice(null);
      setRolling(false);
    } catch (error) {
      console.error('Failed to submit choice:', error);
      setRolling(false);
      alert(error.response?.data?.error || 'Failed to submit choice. Please try again.');
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
              <FadeIn delay={100}>
                <div className="aspect-video bg-background-input rounded-2xl overflow-hidden shadow-2xl border border-background-input">
                  <Image src={currentScene.image_url} alt={currentScene.description} />
                </div>
              </FadeIn>
            </div>

            {/* Scene Narrative */}
            <div className="mb-6">
              <SlideUp delay={300}>
                <div className="bg-background-card p-8 rounded-2xl border border-background-input">
                  <p className="text-lg text-white leading-relaxed font-fantasy">
                    {currentScene.description}
                  </p>
                </div>
              </SlideUp>
            </div>

            {/* Choice Result Narrative */}
            {narrative && (
              <div className="mb-6">
                <SlideUp delay={100}>
                  <div className="bg-accent-purple/20 p-8 rounded-2xl border border-accent-purple/50">
                    <h3 className="font-display text-xl font-bold text-accent-gold mb-4">
                      Result
                    </h3>
                    <p className="text-lg text-white leading-relaxed">
                      {narrative}
                    </p>
                  </div>
                </SlideUp>
              </div>
            )}

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
                <ChoicesList
                  choices={currentScene.choices}
                  onSelectChoice={setSelectedChoice}
                  selectedIndex={selectedChoice}
                />
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
                <DiceRoller onRoll={handleDiceRoll} disabled={selectedChoice === null || rolling} />
              </div>
            </Card>

            {/* Save Button */}
            <button
              onClick={async () => {
                try {
                  await axios.post(`${API_BASE_URL}/games/${gameId}/save`);
                  alert('Game saved successfully!');
                } catch (error) {
                  console.error('Failed to save game:', error);
                  alert(error.response?.data?.error || 'Failed to save game. Please try again.');
                }
              }}
              className="w-full px-6 py-3 bg-background-card hover:bg-background-input text-white rounded-lg border border-background-input transition-all flex items-center justify-center gap-2"
            >
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
