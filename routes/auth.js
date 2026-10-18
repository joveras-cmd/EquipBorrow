// routes/auth.js - register, login, logout.
const express = require('express');
const bcrypt = require('bcrypt');
const users = require('../models/userModel');
const { flash } = require('../middleware/auth');

const router = express.Router();
const COST = 12;                                   // bcrypt work factor (course minimum is 10)
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', COST);
// DUMMY_HASH: when the email does not exist we still run one bcrypt compare, so the
// response time does not reveal which emails are registered.

router.get('/', (req, res) => res.redirect(req.session.user ? '/reservations' : '/login'));

// ----- LOGIN -----
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/reservations');
  res.render('login', { title: 'Log in' });
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await users.findByEmail(email);
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

    if (!user || !ok) {                            // same message for both cases on purpose
      flash(req, 'error', 'Invalid email or password.');
      return res.redirect('/login');
    }
    // regenerate() = brand-new session id after login (stops session fixation)
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = { id: user.id, name: user.full_name, role: user.role };
      res.redirect('/reservations');
    });
  } catch (e) { next(e); }
});

// ----- REGISTER (students/staff -> role "user") -----
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/reservations');
  res.render('register', { title: 'Create account' });
});

router.post('/register', async (req, res, next) => {
  try {
    const fullName = String(req.body.full_name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    let problem = null;
    if (!fullName || fullName.length > 120) problem = 'Please enter your name (max 120 characters).';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) problem = 'Please enter a valid email address.';
    else if (password.length < 8 || password.length > 72) problem = 'Password must be 8 to 72 characters.';   // bcrypt reads max 72 bytes
    else if (password !== String(req.body.confirm || '')) problem = 'Passwords do not match.';
    if (problem) { flash(req, 'error', problem); return res.redirect('/register'); }

    if (await users.findByEmail(email)) {
      flash(req, 'error', 'That email is already registered.');
      return res.redirect('/register');
    }
    await users.create({ fullName, email, passwordHash: await bcrypt.hash(password, COST) });
    flash(req, 'success', 'Account created. You can log in now.');
    res.redirect('/login');
  } catch (e) { next(e); }
});

// ----- LOGOUT (POST + CSRF token, so another site cannot log you out) -----
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.redirect('/login');
  });
});

module.exports = router;