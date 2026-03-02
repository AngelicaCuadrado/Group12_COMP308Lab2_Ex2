const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const cors = require('cors');
const connectDB = require('./config/db');
const isAuth = require('./middleware/is-auth');
const graphqlSchema = require('./schema/index');
const graphqlResolvers = require('./resolvers/index');

const app = express();

// Conectar a MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(isAuth); 

// Configuración del servidor GraphQL
app.use('/graphql', graphqlHTTP({
  schema: graphqlSchema,
  rootValue: graphqlResolvers,
  graphiql: true 
}));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('Server running at: http://localhost:4000/graphql');
});