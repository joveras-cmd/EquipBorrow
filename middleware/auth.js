// middleware/auth.js - route guards.
// requireLogin: any signed-in person.  requireAdmin: role must be "admin".
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  if (req.session.user.role !== 'admin') {
    return res.status(403).render('error', { title: 'Forbidden', message: 'This page is for administrators only.' });
  }
  next();
}

// One-time message shown after a redirect (e.g. "Reservation approved.")
function flash(req, type, text) {
  req.session.flash = { type, text };
}

module.exports = { requireLogin, requireAdmin, flash };