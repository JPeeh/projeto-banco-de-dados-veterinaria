const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'vet_app',
  password:           process.env.DB_PASSWORD || 'App@Vet2024!',
  database:           process.env.DB_NAME     || 'clinica_veterinaria',
  waitForConnections: true,
  connectionLimit:    10,
  charset:            'utf8mb4',
});

module.exports = pool;
