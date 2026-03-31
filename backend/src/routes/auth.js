'use strict';
// ================================================================
// src/routes/auth.js  — MySQL + simple schema version
// POST /api/v1/auth/login
// POST /api/v1/auth/refresh
// POST /api/v1/auth/logout
// GET  /api/v1/auth/me
// POST /api/v1/auth/change-password
// ================================================================
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { z }   = require('zod');

const { db }       = require('../../config/database');
const { authenticate } = require('../middleware/auth');
const validate     = require('../middleware/validate');
const { ok, unauthorized, badRequest } = require('../utils/response');
const logger       = require('../utils/logger');

const JWT_SECRET  = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES = process.env.JWT_ACCESS_EXPIRES_SECONDS || '900';

// ── Schemas ───────────────────────────────────────────────────
const loginSchema = z.object({
  email:      z.string().email(),
  password:   z.string().min(1),
  tenantSlug: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
});

// ── POST /login ───────────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res, next) => {
  const { email, password } = req.body;
  try {
    // 1. Find user in users table
    const [rows] = await db.raw(
      'SELECT id, email, password_hash, name, role, permissions, is_active, last_login_at FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    const user = rows[0];

    // Timing-safe
    const dummyHash = '$2a$12$invalidhashinvalidhashinvalidhashin';
    const hashToCheck = user?.password_hash || dummyHash;
    const passwordOk = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordOk) {
      return unauthorized(res, 'Invalid email or password');
    }

    if (!user.is_active) {
      return unauthorized(res, 'Account is deactivated. Contact your administrator.');
    }

    // 2. Build JWT
    const payload = {
      userId:    user.id,
      email:     user.email,
      role:      user.role,
      tenantSlug: req.body.tenantSlug || 'default',
    };

    const accessToken   = jwt.sign(payload, JWT_SECRET, { expiresIn: parseInt(JWT_EXPIRES) });
    const refreshToken  = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    // 3. Save refresh token hash
    await db.raw(
      'UPDATE users SET refresh_token_hash = ?, last_login_at = NOW() WHERE id = ?',
      [refreshToken, user.id]
    );

    let permissions = [];
    try {
      permissions = user.permissions
        ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions)
        : [];
    } catch (e) { permissions = []; }

    logger.info('User logged in', { userId: user.id, email: user.email });

    return ok(res, {
      accessToken,
      refreshToken,
      expiresIn: parseInt(JWT_EXPIRES),
      user: {
        id:          user.id,
        email:       user.email,
        name:        user.name,
        role:        user.role,
        permissions,
        isSuperAdmin: user.role === 'admin',
      },
      tenant: {
        slug:        req.body.tenantSlug || 'default',
        companyName: 'Infosys Pak ERP',
      },
    }, 'Login successful');

  } catch (err) { next(err); }
});

// ── POST /refresh ─────────────────────────────────────────────
router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  const { refreshToken } = req.body;
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    const [rows] = await db.raw(
      'SELECT id, email, role, permissions, is_active, refresh_token_hash FROM users WHERE id = ?',
      [decoded.userId]
    );
    const user = rows[0];

    if (!user || !user.is_active) return unauthorized(res, 'Invalid refresh token');
    if (user.refresh_token_hash !== refreshToken) return unauthorized(res, 'Refresh token revoked');

    const newAccess = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, tenantSlug: 'default' },
      JWT_SECRET,
      { expiresIn: parseInt(JWT_EXPIRES) }
    );

    return ok(res, { accessToken: newAccess, refreshToken, expiresIn: parseInt(JWT_EXPIRES) });
  } catch (err) {
    return unauthorized(res, 'Invalid or expired refresh token');
  }
});

// ── POST /logout ──────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await db.raw('UPDATE users SET refresh_token_hash = NULL WHERE id = ?', [req.userId]);
    return ok(res, null, 'Logged out successfully');
  } catch (err) { next(err); }
});

// ── GET /me ───────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [rows] = await db.raw(
      'SELECT id, email, name, role, permissions, is_active, last_login_at FROM users WHERE id = ?',
      [req.userId]
    );
    const user = rows[0];
    if (!user) return unauthorized(res, 'User not found');

    let permissions = [];
    try {
      permissions = user.permissions
        ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions)
        : [];
    } catch (e) { permissions = []; }

    return ok(res, {
      ...user,
      permissions,
      role:       req.userRole || user.role,
      tenantSlug: req.tenantSlug || 'default',
    });
  } catch (err) { next(err); }
});

// ── POST /change-password ─────────────────────────────────────
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const [rows] = await db.raw('SELECT id, password_hash FROM users WHERE id = ?', [req.userId]);
    const user = rows[0];

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return badRequest(res, 'Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.raw(
      'UPDATE users SET password_hash = ?, refresh_token_hash = NULL, updated_at = NOW() WHERE id = ?',
      [newHash, req.userId]
    );

    return ok(res, null, 'Password changed successfully. Please log in again.');
  } catch (err) { next(err); }
});

module.exports = router;
