const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Player = require('../models/Player');
const Game = require('../models/Game');

module.exports = {
  createPlayer: async ({ playerId, username, email, password, avatarImage }) => {
    const existingPlayer = await Player.findOne({ email });
    if (existingPlayer) throw new Error('El usuario ya existe.');
    const hashedPassword = await bcrypt.hash(password, 12);
    const player = new Player({ playerId, username, email, password: hashedPassword, avatarImage });
    return await player.save();
  },
  createGame: async (args) => {
    const game = new Game({ ...args });
    return await game.save();
  },
  login: async ({ email, password }) => {
    const player = await Player.findOne({ email });
    if (!player) throw new Error('Usuario no encontrado.');
    const isEqual = await bcrypt.compare(password, player.password);
    if (!isEqual) throw new Error('Contraseña incorrecta.');
    const token = jwt.sign({ userId: player.id }, 'supersecretkey_group12_lab2', { expiresIn: '1h' });
    return { userId: player.id, token, tokenExpiration: 1 };
  },
  updatePlayerProfile: async ({ avatarImage }, req) => {
    if (!req.isAuth) throw new Error('No autenticado.');
    const player = await Player.findById(req.userId).populate('favoriteGames');
    player.avatarImage = avatarImage;
    await player.save();
    return player;
  },
  addFavoriteGame: async ({ gameId }, req) => {
    if (!req.isAuth) throw new Error('No autenticado.');
    const player = await Player.findById(req.userId);
    if (!player.favoriteGames.includes(gameId)) {
      player.favoriteGames.push(gameId);
      await player.save();
    }
    return await Player.findById(req.userId).populate('favoriteGames');
  },
  removeFavoriteGame: async ({ gameId }, req) => {
    if (!req.isAuth) throw new Error('No autenticado.');
    const player = await Player.findById(req.userId);
    player.favoriteGames.pull(gameId);
    await player.save();
    return await Player.findById(req.userId).populate('favoriteGames');
  },
  getAllGames: async () => await Game.find(),
  searchGames: async ({ title, genre, platform }) => {
    const query = {};
    if (title) query.title = { $regex: title, $options: 'i' };
    if (genre) query.genre = { $regex: genre, $options: 'i' };
    if (platform) query.platform = { $regex: platform, $options: 'i' };
    return await Game.find(query);
  },
  getGameById: async ({ _id }) => await Game.findById(_id),
  getPlayerProfile: async (args, req) => {
    if (!req.isAuth) throw new Error('No autenticado.');
    return await Player.findById(req.userId).populate('favoriteGames');
  }
};