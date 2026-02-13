import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

export function DiceRoller({ onRoll, disabled = false }) {
  const [rolling, setRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(1);
  const [rotation, setRotation] = useState(0);
  const finalValueRef = useRef(null);

  const rollDice = useCallback(() => {
    if (rolling || disabled) return;

    setRolling(true);
    const finalValue = Math.floor(Math.random() * 20) + 1;
    finalValueRef.current = finalValue;
  }, [rolling, disabled]);

  // Handle dice rolling animation with proper cleanup
  useEffect(() => {
    if (!rolling || !finalValueRef.current) return;

    const finalValue = finalValueRef.current;
    let currentRotation = rotation;
    let isCancelled = false;

    const animateInterval = setInterval(() => {
      if (isCancelled) return;
      currentRotation += 30;
      setRotation(currentRotation);
      setDiceValue(Math.floor(Math.random() * 20) + 1);
    }, 50);

    const animationTimeout = setTimeout(() => {
      if (isCancelled) return;
      clearInterval(animateInterval);
      const newRotation = currentRotation + 720 + (finalValue * 45);
      setRotation(newRotation);
      setDiceValue(finalValue);
      setRolling(false);
      onRoll(finalValue);
      finalValueRef.current = null;
    }, 2000);

    return () => {
      isCancelled = true;
      clearInterval(animateInterval);
      clearTimeout(animationTimeout);
    };
  }, [rolling, onRoll]);

  return (
    <div className="flex flex-col items-center gap-8">
      {/* 3D Dice Display */}
      <div className="relative w-32 h-32">
        <motion.div
          animate={{
            rotateX: 0,
            rotateY: rotation,
            rotateZ: 0
          }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className="w-full h-full"
          style={{
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Dice Front */}
          <div
            className={`absolute w-full h-full bg-gradient-to-br from-accent-gold to-accent-gold/70 rounded-2xl border-4 border-white/20 flex items-center justify-center shadow-2xl ${
              rolling ? 'animate-pulse' : ''
            }`}
            style={{
              backfaceVisibility: 'hidden'
            }}
          >
            <div className="text-center">
              <div className="font-display text-5xl font-bold text-white">
                {diceValue}
              </div>
            </div>
          </div>

          {/* Dice Back (just for 3D effect) */}
          <div
            className="absolute w-full h-full bg-background-dark rounded-2xl border-4 border-accent-gold/20"
            style={{
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden'
            }}
          />
        </motion.div>
      </div>

      {/* Roll Button */}
      <button
        onClick={rollDice}
        disabled={rolling || disabled}
        className={`group px-8 py-4 bg-primary-default hover:bg-primary-hover text-white rounded-xl font-display text-xl font-bold transition-all transform hover:scale-105 shadow-lg ${
          rolling || disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {rolling ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0 4.311 3.367 7.91 7.547 8.45l-3.06-1.257z"
              />
            </svg>
            Rolling...
          </span>
        ) : (
          <>
            Roll d20
            <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-sm">
              Click to roll
            </span>
          </>
        )}
      </button>

      {/* Last Roll Display */}
      {!rolling && diceValue && (
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">Last Roll</p>
          <div className="font-display text-4xl font-bold text-accent-gold">
            {diceValue}
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {diceValue === 20 ? '🎉 Natural 20! Critical Success!' : ''}
            {diceValue === 1 ? '💀 Natural 1! Critical Failure!' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

DiceRoller.propTypes = {
  onRoll: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

DiceRoller.defaultProps = {
  disabled: false
};

export default DiceRoller;
