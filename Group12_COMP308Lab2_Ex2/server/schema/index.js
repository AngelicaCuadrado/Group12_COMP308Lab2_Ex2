const { buildSchema } = require('graphql');

module.exports = buildSchema(`
  type Game {
    _id: ID!
    gameId: String!
    title: String!
    genre: String!
    platform: String!
    releaseYear: Int!
  }

  type Player {
    _id: ID!
    playerId: String!
    username: String!
    email: String!
    avatarImage: String
    favoriteGames: [Game!]
  }

  type AuthData {
    userId: ID!
    token: String!
    tokenExpiration: Int!
  }

  type Query {
    login(email: String!, password: String!): AuthData!
    getAllGames: [Game!]!
    searchGames(title: String, genre: String, platform: String): [Game!]!
    getGameById(_id: ID!): Game!
    getPlayerProfile: Player!
  }

  type Mutation {
    createPlayer(playerId: String!, username: String!, email: String!, password: String!, avatarImage: String): Player!
    createGame(gameId: String!, title: String!, genre: String!, platform: String!, releaseYear: Int!): Game!
    updatePlayerProfile(avatarImage: String!): Player!
    addFavoriteGame(gameId: ID!): Player!
    removeFavoriteGame(gameId: ID!): Player!
  }

  schema {
    query: Query
    mutation: Mutation
  }
`);