const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  genre: { type: String, required: true },
  platform: { type: String, required: true },
  releaseYear: { type: Number, required: true }
});

module.exports = mongoose.model('Game', GameSchema);