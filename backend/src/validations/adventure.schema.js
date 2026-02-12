const { z } = require('zod');

// Valid options
const validDifficulties = ['easy', 'medium', 'hard'];
const validLengths = ['quick', 'standard', 'extended', 'ai'];
const validTones = ['serious', 'lighthearted', 'dark', 'heroic', 'mysterious'];

/**
 * Schema for generating character name
 */
const generateCharacterNameSchema = z.object({
  characterClass: z.enum(['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger'], {
    errorMap: () => ({ message: 'Invalid character class' })
  })
});

/**
 * Schema for generating story context
 */
const generateContextSchema = z.object({
  theme: z.string().min(1, 'Theme is required').max(100, 'Theme too long'),
  tone: z.enum(validTones, {
    errorMap: () => ({ message: `Invalid tone. Must be one of: ${validTones.join(', ')}` })
  }).optional().default('heroic'),
  difficulty: z.enum(validDifficulties, {
    errorMap: () => ({ message: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}` })
  })
});

/**
 * Schema for generating adventure
 */
const generateAdventureSchema = z.object({
  theme: z.string().min(1, 'Theme is required').max(100, 'Theme too long'),
  tone: z.enum(validTones, {
    errorMap: () => ({ message: `Invalid tone. Must be one of: ${validTones.join(', ')}` })
  }).optional().default('heroic'),
  difficulty: z.enum(validDifficulties, {
    errorMap: () => ({ message: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}` })
  }),
  length: z.enum(validLengths, {
    errorMap: () => ({ message: `Invalid length. Must be one of: ${validLengths.join(', ')}` })
  }).optional().default('standard'),
  context: z.string().max(1000, 'Context too long').optional()
});

/**
 * Schema for adventure ID parameter
 */
const adventureIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid adventure ID').transform(Number)
});

module.exports = {
  generateCharacterNameSchema,
  generateContextSchema,
  generateAdventureSchema,
  adventureIdSchema,
  validDifficulties,
  validLengths,
  validTones
};
