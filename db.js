// db.js - one shared connection POOL for the whole app.
// Every query in the project uses "?" placeholders (parameterised queries),
// so user input can never be read as SQL (prevents SQL injection).
const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT || 3306),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = { db };