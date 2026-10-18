// routes/assets.js - admin-only equipment management (add / edit / delete).
const express = require('express');
const A = require('../models/assetModel');
const { requireAdmin, flash } = require('../middleware/auth');

const router = express.Router();

// Clean + validate the form fields. Returns { data } or { error }.
function readAsset(body) {
  const data = {
    name: String(body.name || '').trim(),
    tag: String(body.asset_tag || '').trim(),
    category: String(body.category || '').trim() || 'General',
    status: body.status === 'maintenance' ? 'maintenance' : 'available'
  };
  if (!data.name || data.name.length > 120) return { error: 'Asset name is required (max 120 characters).' };
  if (!data.tag || data.tag.length > 40) return { error: 'Asset tag is required (max 40 characters).' };
  if (data.category.length > 60) return { error: 'Category is too long (max 60 characters).' };
  return { data };
}

router.get('/assets', requireAdmin, async (req, res, next) => {
  try { res.render('assets', { title: 'Assets', assets: await A.list() }); }
  catch (e) { next(e); }
});

router.post('/assets', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = readAsset(req.body);
    if (error) flash(req, 'error', error);
    else { await A.create(data); flash(req, 'success', 'Asset added.'); }
    res.redirect('/assets');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') { flash(req, 'error', 'That asset tag already exists.'); return res.redirect('/assets'); }
    next(e);
  }
});

router.post('/assets/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { data, error } = readAsset(req.body);
    if (error || !Number.isInteger(id)) flash(req, 'error', error || 'Invalid asset.');
    else flash(req, (await A.update(id, data)) ? 'success' : 'error', 'Asset saved.');
    res.redirect('/assets');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') { flash(req, 'error', 'That asset tag already exists.'); return res.redirect('/assets'); }
    next(e);
  }
});

router.post('/assets/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isInteger(id) && (await A.remove(id))) flash(req, 'success', 'Asset deleted.');
    else flash(req, 'error', 'Could not delete that asset.');
    res.redirect('/assets');
  } catch (e) {
    // The database refuses to delete an asset that still has reservation history
    if (e.code === 'ER_ROW_IS_REFERENCED_2') {
      flash(req, 'error', 'This asset has reservation history. Set it to "maintenance" instead of deleting.');
      return res.redirect('/assets');
    }
    next(e);
  }
});

module.exports = router;