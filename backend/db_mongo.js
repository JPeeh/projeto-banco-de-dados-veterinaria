const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinica_veterinaria';

async function conectarMongo() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB conectado em', MONGO_URI);
  } catch (err) {
    console.error('Erro ao conectar MongoDB:', err.message);
  }
}

module.exports = { conectarMongo, mongoose };
