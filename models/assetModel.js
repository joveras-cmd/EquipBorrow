// models/assetModel.js - all SQL about assets (equipment).
const { db } = require('../db');

// "in_use" is worked out from reservations, so it can never get out of sync.
async function list() {
  const [rows] = await db.query(
    `SELECT a.id, a.name, a.asset_tag, a.category, a.status,
            EXISTS(SELECT 1 FROM reservations r
                   WHERE r.asset_id = a.id AND r.status = 'checked_out') AS in_use
     FROM assets a ORDER BY a.name, a.asset_tag`);
  return rows;
}

async function listBookable() {
  const [rows] = await db.query(
    "SELECT id, name, asset_tag FROM assets WHERE status = 'available' ORDER BY name, asset_tag");
  return rows;
}

async function findById(id) {
  const [rows] = await db.query('SELECT id, name, status FROM assets WHERE id = ?', [id]);
  return rows[0];
}

async function create({ name, tag, category, status }) {
  const [r] = await db.query(
    'INSERT INTO assets (name, asset_tag, category, status) VALUES (?, ?, ?, ?)',
    [name, tag, category, status]);
  return r.insertId;
}

async function update(id, { name, tag, category, status }) {
  const [r] = await db.query(
    'UPDATE assets SET name = ?, asset_tag = ?, category = ?, status = ? WHERE id = ?',
    [name, tag, category, status, id]);
  return r.affectedRows === 1;
}

async function remove(id) {
  const [r] = await db.query('DELETE FROM assets WHERE id = ?', [id]);
  return r.affectedRows === 1;
}

module.exports = { list, listBookable, findById, create, update, remove };