import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useGameStore = create(
  persist(
    (set) => ({
      // Game state
      currentGame: null,
      currentScene: null,
      character: null,
      gameHistory: [],

      // Settings
      settings: {
        imageStyle: 'fantasy art',
        difficulty: 'medium',
        diceAnimations: true,
        soundEffects: false
      },

      // UI state
      isLoading: false,
      error: null,

      // Actions
      setCurrentGame: (game) => set({ currentGame: game }),
      setCurrentScene: (scene) => set({ currentScene: scene }),
      setCharacter: (character) => set({ character }),
      addToHistory: (entry) => set((state) => ({ gameHistory: [...state.gameHistory, entry] })),
      setSettings: (settings) => set({ settings: { ...settings } }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      
      // Game actions
      rollDice: () => {
        const roll = Math.floor(Math.random() * 20) + 1;
        return roll;
      },
      
      resetGame: () => set({
        currentGame: null,
        currentScene: null,
        character: null,
        gameHistory: [],
        isLoading: false,
        error: null
      })
    }),
    {
      name: 'dnd-game-storage',
      getStorage: () => localStorage,
    }
  )
);

// Selectors
export const selectCharacterStats = (state) => state.character?.stats || {};
export const selectCharacterHP = (state) => state.character?.hp || 0;
export const selectCharacterMaxHP = (state) => state.character?.maxHp || 0;
export const selectCurrentSceneChoices = (state) => state.currentScene?.choices || [];
export const selectIsGameActive = (state) => !!state.currentGame && !!state.character;

export default useGameStore;
