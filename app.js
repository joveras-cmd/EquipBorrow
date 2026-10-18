// app.js - starts the server and wires everything together.
require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');

const R = require('./models/reservationModel');
const helpers = require('./helpers');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---- Security headers (Content-Security-Policy etc.) ----
app.use(helmet({
  contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': null } },
  hsts: false                       // turn ON when you deploy with HTTPS
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));

// ---- Sessions: the cookie holds only an id, the data stays on the server ----
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,                 // JavaScript in the page cannot read the cookie
    sameSite: 'lax',                // not sent on cross-site POSTs
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 2      // 2 hours
  }
}));

// ---- Values every view can use (all synchronous, so the error page always works) ----
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  res.locals.currentUrl = req.originalUrl;
  res.locals.flash = req.session.flash || null;       // show once, then clear
  delete req.session.flash;
  res.locals.pendingCount = 0;
  Object.assign(res.locals, helpers);                 // fmtDateTime, ymd, statusLabel, ...
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrf;
  next();
});

// ---- CSRF protection: every POST must carry the secret token from its own form ----
app.use((req, res, next) => {
  if (req.method === 'POST') {
    const sent = Buffer.from(String((req.body && req.body._csrf) || ''));
    const real = Buffer.from(req.session.csrf);
    if (sent.length !== real.length || !crypto.timingSafeEqual(sent, real)) {
      return res.status(403).render('error', { title: 'Blocked', message: 'Invalid or missing security token. Go back, refresh the page, and try again.' });
    }
  }
  next();
});

// ---- Signed-in extras: automatic check in/out + the admin bell badge ----
app.use(async (req, res, next) => {
  try {
    if (req.session.user) {
      await R.runAutomation();
      if (req.session.user.role === 'admin') res.locals.pendingCount = await R.pendingCount();
    }
    next();
  } catch (e) { next(e); }
});

// ---- Routes ----
app.use(require('./routes/auth'));
app.use(require('./routes/reservations'));
app.use(require('./routes/booking'));
app.use(require('./routes/assets'));

// ---- 404 and generic error page (no stack traces shown to users) ----
app.use((req, res) => res.status(404).render('error', { title: 'Not found', message: 'Page not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Server error', message: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => console.log(`Equipment Borrowing running at http://localhost:${PORT}`));