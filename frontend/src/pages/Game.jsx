import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Swords, Heart, Coins, Backpack, Undo2, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Image, resolveImageUrl } from '../components/ui/Image';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { CharacterCreation } from '../components/game/CharacterCreation';
import { DiceRoller } from '../components/game/DiceRoller';
import { ChoicesList } from '../components/game/Choices';
import { FadeIn, SlideUp } from '../components/ui/Transitions';
import { useToast } from '../components/ui/ToastContext';
import { gamesAPI, imagesAPI, adventuresAPI } from '../services/api';

export function Game() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);
  const [character, setCharacter] = useState(null);
  const [currentScene, setCurrentScene] = useState(null);
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [narrative, setNarrative] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [adventureComplete, setAdventureComplete] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalNarrative, setFinalNarrative] = useState(null);
  const [goingBack, setGoingBack] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Image status tracking
  const [imageStatus, setImageStatus] = useState({});
  const [imageRefreshKey, setImageRefreshKey] = useState(0);

  // Ref to track difficulty for setTimeout closures (avoids stale closure issue)
  const difficultyRef = useRef(null);

  // Keep difficulty ref in sync with game state
  useEffect(() => {
    difficultyRef.current = game?.adventure?.difficulty;
  }, [game?.adventure?.difficulty]);

  const loadGame = useCallback(async () => {
    try {
      const data = await gamesAPI.getById(gameId);

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

      // Check if can go back (has history and not hard mode)
      const hasHistory = data.gameHistory && data.gameHistory.length > 0;
      const isHardMode = data.adventure?.difficulty === 'hard';
      setCanGoBack(hasHistory && !isHardMode);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load game:', error);
      setLoading(false);
      toast.error(error.response?.data?.error || 'Failed to load game. Please try again.');
    }
  }, [gameId, toast]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  // Load image status for current scene
  const loadImageStatus = useCallback(async () => {
    if (!game?.adventure?.id && !game?.adventure_id) return;

    const adventureId = game?.adventure?.id || game?.adventure_id;
    try {
      const response = await adventuresAPI.getStatus(adventureId);
      const data = response.data || response;

      // Build status map from images array
      const statusMap = {};
      if (data.images) {
        data.images.forEach(img => {
          statusMap[img.hash] = img.status;
        });
      }
      setImageStatus(statusMap);

      // Check if current scene image just became ready
      if (currentScene?.image_hash) {
        const currentStatus = statusMap[currentScene.image_hash];
        if (currentStatus === 'ready') {
          // Force image refresh by updating the refresh key
          setImageRefreshKey(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Failed to load image status:', error);
    }
  }, [game?.adventure?.id, game?.adventure_id, currentScene?.image_hash]);

  // Initial status load when game is loaded
  useEffect(() => {
    if (game && currentScene) {
      loadImageStatus();
    }
  }, [game, currentScene, loadImageStatus]);

  // Poll for status updates when current scene image is processing
  useEffect(() => {
    const currentImageStatus = currentScene?.image_hash ? imageStatus[currentScene.image_hash] : null;

    if (currentImageStatus === 'processing' || currentImageStatus === 'pending' || !currentImageStatus) {
      const interval = setInterval(() => {
        loadImageStatus();
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [currentScene?.image_hash, imageStatus, loadImageStatus]);

  const handleGoBack = async () => {
    if (!canGoBack) return;

    try {
      setGoingBack(true);
      const data = await gamesAPI.goBack(gameId);

      // Restore previous state
      setCurrentScene(data.scene);
      setCharacter(prev => ({
        ...prev,
        hp: data.character.hp,
        gold: data.character.gold,
        inventory: data.character.inventory,
        stats: data.character.stats
      }));

      // Check if can still go back
      const gameData = await gamesAPI.getById(gameId);
      const hasHistory = gameData.gameHistory && gameData.gameHistory.length > 0;
      const isHardMode = gameData.adventure?.difficulty === 'hard';
      setCanGoBack(hasHistory && !isHardMode);

      // Clear any narrative
      setNarrative(null);
      setSelectedChoice(null);
      setGoingBack(false);
    } catch (error) {
      console.error('Failed to go back:', error);
      setGoingBack(false);
      toast.error(error.response?.data?.error || 'Failed to go back. Please try again.');
    }
  };

  const handleRegenerateImage = async () => {
    if (!currentScene?.image_hash || regenerating) return;

    try {
      setRegenerating(true);
      const data = await imagesAPI.regenerate(currentScene.image_hash);

      if (data.success) {
        // Update the current scene with the new hash and URL
        const newHash = data.newHash;
        const newUrl = data.newUrl;

        setCurrentScene(prev => ({
          ...prev,
          image_hash: newHash,
          image_url: newUrl
        }));

        // Start polling for status (async regeneration)
        pollImageStatus(newHash);
      }
    } catch (error) {
      console.error('Failed to regenerate image:', error);
      toast.error(error.response?.data?.error || 'Failed to regenerate image. Please try again.');
      setRegenerating(false);
    }
  };

  // Poll for image status until ready or failed
  const pollImageStatus = async (hash, attempts = 0) => {
    const maxAttempts = 36; // 3 minutes at 5s intervals
    const pollInterval = 5000; // 5 seconds

    if (attempts >= maxAttempts) {
      toast.error('Image generation timed out');
      setRegenerating(false);
      return;
    }

    try {
      const data = await imagesAPI.getStatus(hash);

      if (data.status === 'ready') {
        // Image is ready - force reload and stop regenerating
        setCurrentScene(prev => ({
          ...prev,
          image_url: `/api/images/${hash}?t=${Date.now()}`
        }));
        setRegenerating(false);
      } else if (data.status === 'failed') {
        toast.error(data.error || 'Image generation failed');
        setRegenerating(false);
      } else {
        // Still processing - continue polling
        setTimeout(() => pollImageStatus(hash, attempts + 1), pollInterval);
      }
    } catch (error) {
      console.error('Error polling image status:', error);
      // Continue polling on error
      setTimeout(() => pollImageStatus(hash, attempts + 1), pollInterval);
    }
  };

  const handleDiceRoll = async (diceValue) => {
    if (selectedChoice === null) {
      toast.warning('Please select a choice first!');
      return;
    }

    try {
      setRolling(true);
      const response = await gamesAPI.submitChoice(gameId, {
        choiceIndex: selectedChoice,
        diceRoll: diceValue
      });

      // API interceptor returns response.data directly
      const data = response.data || response;

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
        if (data.victory) {
          // Victory! Show adventure complete modal
          setAdventureComplete(true);
        } else {
          // Defeat - show defeat modal
          setFinalNarrative(data.narrative);
          setGameOver(true);
        }
      } else if (data.nextScene) {
        // Progress to next scene after a short delay to show narrative
        setTransitioning(true);
        setTimeout(() => {
          setCurrentScene(data.nextScene);
          setNarrative(null); // Clear narrative for new scene
          setTransitioning(false);
          // After moving to a new scene, we can go back (if not hard mode)
          // Use ref to avoid stale closure
          const isHardMode = difficultyRef.current === 'hard';
          setCanGoBack(!isHardMode);
        }, 2000);
      } else {
        // No next scene but not game over - adventure is complete
        setAdventureComplete(true);
      }

      // Reset for next choice
      setSelectedChoice(null);
      setRolling(false);
    } catch (error) {
      console.error('Failed to submit choice:', error);
      setRolling(false);
      toast.error(error.response?.data?.error || 'Failed to submit choice. Please try again.');
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
                <div className="relative aspect-video bg-background-input rounded-2xl overflow-hidden shadow-2xl border border-background-input">
                  <Image
                    src={currentScene.image_url ? `${currentScene.image_url}${currentScene.image_url.includes('?') ? '&' : '?'}refresh=${imageRefreshKey}` : null}
                    alt={currentScene.description}
                  />
                  {/* Image status indicator */}
                  {currentScene.image_hash && imageStatus[currentScene.image_hash] && imageStatus[currentScene.image_hash] !== 'ready' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background-dark/80">
                      <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-accent-gold text-sm">
                          {imageStatus[currentScene.image_hash] === 'processing' ? 'Generating image...' : 'Waiting in queue...'}
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Regenerate button */}
                  {currentScene.image_hash && (
                    <button
                      onClick={handleRegenerateImage}
                      disabled={regenerating}
                      className="absolute bottom-3 right-3 px-3 py-2 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                      title="Regenerate image with new AI variation"
                    >
                      <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                      {regenerating ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  )}
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

            {/* Scene Transition Indicator */}
            {transitioning && (
              <div className="mb-6">
                <SlideUp delay={100}>
                  <div className="bg-accent-gold/20 p-6 rounded-2xl border border-accent-gold/50 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin w-6 h-6 border-2 border-accent-gold border-t-transparent rounded-full"></div>
                      <span className="font-display text-xl text-accent-gold">
                        Venturing forth to the next scene...
                      </span>
                    </div>
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
                  await gamesAPI.save(gameId);
                  toast.success('Game saved successfully!');
                } catch (error) {
                  console.error('Failed to save game:', error);
                  toast.error(error.response?.data?.error || 'Failed to save game. Please try again.');
                }
              }}
              className="w-full px-6 py-3 bg-background-card hover:bg-background-input text-white rounded-lg border border-background-input transition-all flex items-center justify-center gap-2"
            >
              <Backpack className="w-5 h-5 text-gray-400" />
              Save Game
            </button>

            {/* Go Back Button - Only shown if can go back (not hard mode and has history) */}
            {canGoBack && (
              <button
                onClick={handleGoBack}
                disabled={goingBack || rolling || transitioning}
                className="w-full px-6 py-3 bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple rounded-lg border border-accent-purple/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {goingBack ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-accent-purple border-t-transparent rounded-full"></div>
                    Going Back...
                  </>
                ) : (
                  <>
                    <Undo2 className="w-5 h-5" />
                    Go Back & Retry
                  </>
                )}
              </button>
            )}
          </aside>
        </div>

        {/* Adventure Complete Modal */}
        {adventureComplete && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <FadeIn>
              <div className="bg-background-card p-8 rounded-2xl border border-accent-gold max-w-md mx-4 text-center">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="font-display text-3xl font-bold text-accent-gold mb-4">
                  Adventure Complete!
                </h2>
                <p className="text-gray-300 mb-6">
                  Congratulations, {character?.name}! You have completed this chapter of your journey.
                </p>
                <div className="bg-background-dark/50 p-4 rounded-lg mb-6">
                  <h3 className="font-display text-lg text-white mb-2">Final Stats</h3>
                  <div className="flex justify-center gap-6">
                    <div>
                      <span className="text-accent-red">❤️</span>
                      <span className="text-white ml-1">{character?.hp} HP</span>
                    </div>
                    <div>
                      <span className="text-accent-gold">💰</span>
                      <span className="text-white ml-1">{character?.gold} Gold</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      try {
                        await gamesAPI.restart(gameId);
                        loadGame(); // Reload game state instead of page
                      } catch (error) {
                        console.error('Failed to restart:', error);
                        navigate('/library');
                      }
                    }}
                    className="px-6 py-3 bg-accent-gold text-background-dark font-bold rounded-lg hover:bg-accent-gold/90 transition-colors"
                  >
                    Play Again (Same Character)
                  </button>
                  <button
                    onClick={() => navigate(`/create-character/${game?.adventure?.id || game?.adventure_id}`)}
                    className="px-6 py-3 bg-background-input text-white font-bold rounded-lg hover:bg-background-dark transition-colors border border-background-input"
                  >
                    New Character
                  </button>
                  <button
                    onClick={() => navigate('/library')}
                    className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                  >
                    Return to Library
                  </button>
                </div>
              </div>
            </FadeIn>
          </div>
        )}

        {/* Game Over / Defeat Modal */}
        {gameOver && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <FadeIn>
              <div className="bg-background-card p-8 rounded-2xl border border-accent-red max-w-md mx-4 text-center">
                <div className="text-6xl mb-4">💀</div>
                <h2 className="font-display text-3xl font-bold text-accent-red mb-4">
                  Game Over
                </h2>
                <p className="text-gray-300 mb-6">
                  Alas, {character?.name} has fallen in battle. Your legend will be remembered.
                </p>
                {finalNarrative && (
                  <div className="bg-background-dark/50 p-4 rounded-lg mb-6 text-left">
                    <p className="text-gray-300 text-sm italic">
                      {finalNarrative.substring(0, 200)}...
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      // Restart with same character
                      try {
                        await gamesAPI.restart(gameId);
                        loadGame(); // Reload game state instead of page
                      } catch (error) {
                        console.error('Failed to restart:', error);
                        navigate('/library');
                      }
                    }}
                    className="px-6 py-3 bg-accent-red text-white font-bold rounded-lg hover:bg-accent-red/80 transition-colors"
                  >
                    Try Again (Same Character)
                  </button>
                  <button
                    onClick={() => {
                      // Create new character for same adventure
                      navigate(`/create-character/${game?.adventure?.id || game?.adventure_id}`);
                    }}
                    className="px-6 py-3 bg-background-input text-white font-bold rounded-lg hover:bg-background-dark transition-colors border border-background-input"
                  >
                    New Character
                  </button>
                  <button
                    onClick={() => navigate('/library')}
                    className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                  >
                    Return to Library
                  </button>
                </div>
              </div>
            </FadeIn>
          </div>
        )}
      </div>
    </div>
  );
}

export default Game;
