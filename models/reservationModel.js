// models/reservationModel.js - all SQL about reservations.
const { db } = require('../db');

const STATUSES = ['in_approval', 'approved', 'declined', 'checked_out', 'returned', 'cancelled'];

// A reservation is overdue when it is still open and its due date has passed.
const OVERDUE = `(r.status IN ('in_approval','approved','checked_out')
                  AND r.due_date IS NOT NULL AND r.due_date < NOW())`;
const STARTS_TODAY = `(DATE(r.start_date) = CURDATE() AND r.status IN ('in_approval','approved'))`;

const BASE = `
  SELECT r.id, r.status, r.start_date, r.due_date, r.auto_checkout, r.notes, r.user_id,
         a.name AS asset_name, a.asset_tag, u.full_name AS requested_by,
         ${OVERDUE} AS is_overdue
  FROM reservations r
  JOIN assets a ON a.id = r.asset_id
  JOIN users  u ON u.id = r.user_id`;

// ---- LIST with filters (userId = null means "everyone", used by admin) ----
async function list({ userId, status, q, period }) {
  const where = [];
  const params = [];

  if (userId) { where.push('r.user_id = ?'); params.push(userId); }

  if (status === 'overdue')      where.push(OVERDUE);
  else if (status === 'today')   where.push(STARTS_TODAY);
  else if (STATUSES.includes(status)) { where.push('r.status = ?'); params.push(status); }

  if (q) {
    where.push('(a.name LIKE ? OR a.asset_tag LIKE ? OR u.full_name LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  // The period is mapped through a list WE wrote - never interpolate user input.
  const PERIODS = {
    today: 'DATE(r.start_date) = CURDATE()',
    week:  'YEARWEEK(r.start_date, 1) = YEARWEEK(CURDATE(), 1)',
    month: 'YEAR(r.start_date) = YEAR(CURDATE()) AND MONTH(r.start_date) = MONTH(CURDATE())'
  };
  if (PERIODS[period]) where.push(PERIODS[period]);

  const sql = BASE + (where.length ? ' WHERE ' + where.join(' AND ') : '') +
              ' ORDER BY r.start_date DESC LIMIT 200';
  const [rows] = await db.query(sql, params);
  return rows;
}

// ---- Numbers for the four coloured cards ----
async function counts(userId) {
  const params = [];
  let sql = `SELECT SUM(r.status = 'in_approval') AS in_approval,
                    SUM(r.status = 'declined')    AS declined,
                    SUM(${STARTS_TODAY})          AS start_today,
                    SUM(${OVERDUE})               AS overdue
             FROM reservations r`;
  if (userId) { sql += ' WHERE r.user_id = ?'; params.push(userId); }
  const [rows] = await db.query(sql, params);
  const n = (v) => Number(v || 0);   // SUM() returns NULL on an empty table
  return { in_approval: n(rows[0].in_approval), declined: n(rows[0].declined),
           start_today: n(rows[0].start_today), overdue: n(rows[0].overdue) };
}

async function pendingCount() {
  const [rows] = await db.query("SELECT COUNT(*) AS n FROM reservations WHERE status = 'in_approval'");
  return rows[0].n;
}

// ---- Double-booking check: do two time ranges overlap? ----
// Existing [start, due) and new [start, due). NULL due_date = never ends.
async function hasConflict({ assetId, start, due }) {
  let sql = `SELECT COUNT(*) AS n FROM reservations
             WHERE asset_id = ? AND status IN ('in_approval','approved','checked_out')
               AND (due_date IS NULL OR due_date > ?)`;
  const params = [assetId, start];
  if (due) { sql += ' AND start_date < ?'; params.push(due); }
  const [rows] = await db.query(sql, params);
  return rows[0].n > 0;
}

async function create({ assetId, userId, status, start, due, autoCheckout, notes }) {
  const [r] = await db.query(
    `INSERT INTO reservations (asset_id, user_id, status, start_date, due_date, auto_checkout, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [assetId, userId, status, start, due, autoCheckout ? 1 : 0, notes || null]);
  return r.insertId;
}

// ---- Safe status change: only works if the CURRENT status is allowed ----
// ownerId (optional) adds "AND user_id = ?" so users can only touch their own rows.
async function transition(id, to, allowedFrom, ownerId = null) {
  let sql = 'UPDATE reservations SET status = ? WHERE id = ? AND status IN (?)';
  const params = [to, id, allowedFrom];
  if (ownerId) { sql += ' AND user_id = ?'; params.push(ownerId); }
  const [r] = await db.query(sql, params);
  return r.affectedRows === 1;
}

async function remove(id) {
  const [r] = await db.query('DELETE FROM reservations WHERE id = ?', [id]);
  return r.affectedRows === 1;
}

// ---- Calendar: every open booking touching [rangeStart, rangeEnd) ----
async function forRange(rangeStart, rangeEnd) {
  const [rows] = await db.query(
    `SELECT r.id, r.status, r.start_date, r.due_date, r.user_id,
            a.name AS asset_name, u.full_name AS requested_by
     FROM reservations r
     JOIN assets a ON a.id = r.asset_id
     JOIN users  u ON u.id = r.user_id
     WHERE r.status IN ('in_approval','approved','checked_out')
       AND r.start_date < ? AND (r.due_date IS NULL OR r.due_date >= ?)
     ORDER BY r.start_date`,
    [rangeEnd, rangeStart]);
  return rows;
}

// ---- "Auto check in/out": runs on every page load ----
async function runAutomation() {
  await db.query(`UPDATE reservations SET status = 'checked_out'
                  WHERE auto_checkout = 1 AND status = 'approved' AND start_date <= NOW()
                    AND (due_date IS NULL OR due_date > NOW())`);
  await db.query(`UPDATE reservations SET status = 'returned'
                  WHERE auto_checkout = 1 AND status = 'checked_out'
                    AND due_date IS NOT NULL AND due_date <= NOW()`);
}

module.exports = { list, counts, pendingCount, hasConflict, create, transition,
                   remove, forRange, runAutomation };