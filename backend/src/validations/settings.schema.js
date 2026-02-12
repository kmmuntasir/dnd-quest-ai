const { z } = require('zod');

const validImageStyles = ['fantasy art', 'realistic', 'cartoon', 'anime', 'dark fantasy', 'watercolor'];
const validDifficulties = ['easy', 'medium', 'hard'];

/**
 * Schema for settings update
 */
const settingsSchema = z.object({
  image_style: z.enum(validImageStyles, {
    errorMap: () => ({ message: `Invalid image style. Must be one of: ${validImageStyles.join(', ')}` })
  }).optional(),
  difficulty: z.enum(validDifficulties, {
    errorMap: () => ({ message: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}` })
  }).optional(),
  dice_animations: z.boolean({
    errorMap: () => ({ message: 'dice_animations must be a boolean' })
  }).optional()
}).refine(
  data => Object.keys(data).length > 0,
  { message: 'At least one setting must be provided' }
);

module.exports = {
  settingsSchema,
  validImageStyles,
  validDifficulties
};
