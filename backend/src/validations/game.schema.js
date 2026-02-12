const { z } = require('zod');

const validClasses = ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger'];

/**
 * Schema for starting a new game
 */
const startGameSchema = z.object({
  adventureId: z.number().int().positive('Adventure ID must be a positive integer'),
  characterName: z.string()
    .min(1, 'Character name is required')
    .max(50, 'Character name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Character name can only contain letters, spaces, hyphens and apostrophes'),
  characterClass: z.enum(validClasses, {
    errorMap: () => ({ message: `Invalid class. Must be one of: ${validClasses.join(', ')}` })
  })
});

/**
 * Schema for game ID parameter
 */
const gameIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid game ID').transform(Number)
});

/**
 * Schema for submitting a choice
 */
const choiceSchema = z.object({
  choiceIndex: z.number().int().min(0, 'Choice index must be non-negative'),
  diceRoll: z.number().int().min(1, 'Dice roll must be between 1 and 20').max(20, 'Dice roll must be between 1 and 20')
});

/**
 * Schema for game history entry
 */
const gameHistoryEntrySchema = z.object({
  choice: z.any(),
  roll: z.number().int().min(1).max(20),
  outcome: z.string(),
  stats: z.record(z.number()).optional(),
  previousState: z.any().optional()
});

/**
 * Schema for character stats
 */
const statsSchema = z.object({
  STR: z.number().int().min(3).max(18),
  DEX: z.number().int().min(3).max(18),
  INT: z.number().int().min(3).max(18),
  WIS: z.number().int().min(3).max(18),
  CON: z.number().int().min(3).max(18),
  CHA: z.number().int().min(3).max(18)
});

module.exports = {
  startGameSchema,
  gameIdSchema,
  choiceSchema,
  gameHistoryEntrySchema,
  statsSchema,
  validClasses
};
