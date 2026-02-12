const adventureSchema = require('./adventure.schema');
const gameSchema = require('./game.schema');
const settingsSchema = require('./settings.schema');
const authSchema = require('./auth.schema');

module.exports = {
  adventure: adventureSchema,
  game: gameSchema,
  settings: settingsSchema,
  auth: authSchema
};
