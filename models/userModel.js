// models/userModel.js - all SQL about users.
const { db } = require('../db');

async function findByEmail(email) {
  const [rows] = await db.query(
    'SELECT id, full_name, email, password_hash, role FROM users WHERE email = ?', [email]);
  return rows[0];
}

async function findById(id) {
  const [rows] = await db.query('SELECT id, full_name, role FROM users WHERE id = ?', [id]);
  return rows[0];
}

async function listAll() {
  const [rows] = await db.query('SELECT id, full_name FROM users ORDER BY full_name');
  return rows;
}

// New accounts are ALWAYS role "user". Admins are created in the database only.
async function create({ fullName, email, passwordHash }) {
  const [result] = await db.query(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'user')",
    [fullName, email, passwordHash]);
  return result.insertId;
}

module.exports = { findByEmail, findById, listAll, create };