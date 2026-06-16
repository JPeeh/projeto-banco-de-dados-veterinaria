const mysql = require('mysql2/promise');
require('dotenv').config();

const adminPool = mysql.createPool({
  host:               process.env.DB_HOST         || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_ADMIN_USER   || 'vet_admin',
  password:           process.env.DB_ADMIN_PASSWORD || 'Admin@Vet2024!',
  database:           process.env.DB_NAME         || 'clinica_veterinaria',
  waitForConnections: true,
  connectionLimit:    5,
  charset:            'utf8mb4',
});

module.exports = adminPool;
