'use strict';
// ================================================================
// src/routes/settings.js
// GET   /settings          — all settings (grouped)
// GET   /settings/:key     — single value
// PATCH /settings          — update one or more keys
// GET   /settings/branches — list branches
// POST  /settings/branches — add branch
// ================================================================
const router  = require('express').Router();
const { z }   = require('zod');
const { authenticate, authorize, hasPermission } = require('../middleware/auth');
const { invalidateTenantCache }    = require('../middleware/tenantResolver');
const validate                     = require('../middleware/validate');
const { ok, created, badRequest, notFound } = require('../utils/response');

router.use(authenticate);

// ── GET all settings ──────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const rows = await req.tenantDb.queryAll(
      `SELECT key, value, value_type, description FROM system_settings ORDER BY key`
    );

    // Group into sections
    const grouped = {};
    for (const row of rows) {
      const section = row.key.split('.')[0];
      if (!grouped[section]) grouped[section] = {};
      const val = row.value_type === 'boolean' ? row.value === 'true'
                : row.value_type === 'integer'  ? parseInt(row.value)
                : row.value_type === 'json'      ? JSON.parse(row.value)
                : row.value;
      grouped[section][row.key.split('.').slice(1).join('.')] = val;
    }
    return ok(res, grouped);
  } catch (err) { next(err); }
});

// ── GET single key ────────────────────────────────────────────
router.get('/key/:key', async (req, res, next) => {
  try {
    const row = await req.tenantDb.queryOne(
      `SELECT key, value, value_type FROM system_settings WHERE key=$1`,
      [req.params.key]
    );
    if (!row) return notFound(res, 'Setting');
    return ok(res, row);
  } catch (err) { next(err); }
});

// ── PATCH settings ────────────────────────────────────────────
router.patch('/', hasPermission('settings:update'), async (req, res, next) => {
  const updates = req.body; // { "company.name": "New Name", "system.lang": "ur" }
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return badRequest(res, 'Body must be an object of { key: value } pairs');
  }
  try {
    await req.tenantDb.transaction(async (txDb) => {
      for (const [key, value] of Object.entries(updates)) {
        await txDb.execute(
          `UPDATE system_settings
           SET value=$1, updated_at=NOW(), updated_by=$2
           WHERE key=$3`,
          [String(value), req.userId, key]
        );
      }
    });
    invalidateTenantCache(req.tenantSlug);
    return ok(res, null, 'Settings updated');
  } catch (err) { next(err); }
});

// ── GET branches ──────────────────────────────────────────────
router.get('/branches', async (req, res, next) => {
  try {
    const branches = await req.tenantDb.queryAll(
      `SELECT id, name, name_ur, code, city, phone, email, is_main, is_active, settings
       FROM branches ORDER BY is_main DESC, name ASC`
    );
    return ok(res, branches);
  } catch (err) { next(err); }
});

// ── POST branch ───────────────────────────────────────────────
const branchSchema = z.object({
  name:    z.string().min(2).max(255),
  nameUr:  z.string().max(255).optional(),
  code:    z.string().min(2).max(20),
  city:    z.string().max(100).optional(),
  phone:   z.string().max(20).optional(),
  email:   z.string().email().optional().or(z.literal('')),
  address: z.string().max(500).optional(),
});

router.post('/branches', hasPermission('settings:update'), authorize('owner','admin'), validate(branchSchema), async (req, res, next) => {
  const { name, nameUr, code, city, phone, email, address } = req.body;
  try {
    const branch = await req.tenantDb.queryOne(
      `INSERT INTO branches (name, name_ur, code, city, phone, email, address)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name, code`,
      [name, nameUr||null, code.toUpperCase(), city||null, phone||null, email||null, address||null]
    );
    return created(res, branch, 'Branch created');
  } catch (err) { next(err); }
});

module.exports = router;
