'use strict';
// src/routes/auth.js — PostgreSQL version
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { z }   = require('zod');

const { db, publicDb }  = require('../../config/database');
const { authenticate }  = require('../middleware/auth');
const validate          = require('../middleware/validate');
const { ok, unauthorized, badRequest } = require('../utils/response');
const logger            = require('../utils/logger');

const JWT_SECRET  = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES = parseInt(process.env.JWT_ACCESS_EXPIRES_SECONDS || '900');

const loginSchema = z.object({
  email:      z.string().email(),
  password:   z.string().min(1),
  tenantSlug: z.string().optional(),
});
const refreshSchema = z.object({ refreshToken: z.string().min(10) });
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});

// ── POST /login ───────────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const emailLower = email.toLowerCase();

    // 1. Fetch user from the single 'users' table
    const user = await publicDb.queryOne(
      `SELECT id, email, password_hash, name, role, permissions, is_active, is_super_admin, tenant_id FROM users WHERE email = $1`,
      [emailLower]
    );

    const dummyHash = '$2a$12$invalidhashinvalidhashinvalidhash';
    const passwordOk = await bcrypt.compare(password, user?.password_hash || dummyHash);

    if (!user || !passwordOk) {
      return unauthorized(res, 'Invalid email or password');
    }

    if (!user.is_active) {
      return unauthorized(res, 'Account is deactivated');
    }

    // 2. Handle Super Admin Login
    if (user.is_super_admin) {
      const accessToken  = jwt.sign(
        { userId: user.id, email: user.email, role: 'admin', tenantSlug: 'admin', isSuperAdmin: true },
        JWT_SECRET, { expiresIn: JWT_EXPIRES }
      );
      const refreshToken = jwt.sign({ userId: user.id, type: 'super_admin' }, JWT_SECRET, { expiresIn: '30d' });
      
      await publicDb.execute(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]);

      logger.info('Super admin logged in', { email: user.email });
      return ok(res, {
        accessToken, refreshToken, expiresIn: JWT_EXPIRES,
        user: { id: user.id, email: user.email, name: user.name, role: 'admin', permissions: ['*'], isSuperAdmin: true },
        tenant: { slug: 'admin', companyName: 'Infosys Pak ERP' },
      }, 'Login successful');
    }

    // 3. Handle Regular User Login
    let permissions = [];
    try { 
      permissions = user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : []; 
    } catch (e) {}
    if (user.role === 'admin') permissions = ['*'];

    const accessToken  = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, tenantSlug: user.tenant_id },
      JWT_SECRET, { expiresIn: JWT_EXPIRES }
    );
    const refreshToken = jwt.sign({ userId: user.id, type: 'user' }, JWT_SECRET, { expiresIn: '30d' });
    await publicDb.execute(
      `UPDATE users SET refresh_token_hash = $1, last_login_at = NOW() WHERE id = $2`,
      [refreshToken, user.id]
    );

    logger.info('User logged in', { userId: user.id, email: user.email, tenant: user.tenant_id });
    return ok(res, {
      accessToken, refreshToken, expiresIn: JWT_EXPIRES,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions, isSuperAdmin: false },
      tenant: { slug: user.tenant_id, companyName: 'Infosys Pak ERP' }, // Assuming tenant info is fetched elsewhere
    }, 'Login successful');

  } catch (err) { 
    logger.error('Login error', { 
      error: err.message, // Log only message for cleaner logs
      stack: err.stack, 
      email: req.body.email 
    });
    next(err); 
  }
});

// ... (rest of the file remains the same)

// ── POST /refresh ─────────────────────────────────────────────
router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  const { refreshToken } = req.body;
  try {
    let decoded;
    try { decoded = jwt.verify(refreshToken, JWT_SECRET); }
    catch (e) { return unauthorized(res, 'Invalid or expired refresh token'); }

    const user = await publicDb.queryOne(
      `SELECT id, email, name, role, is_active, is_super_admin, refresh_token_hash FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (!user || !user.is_active) return unauthorized(res, 'Account not found or inactive');

    // Super Admin Refresh
    if (decoded.type === 'super_admin' && user.is_super_admin) {
      const newAccess = jwt.sign({ userId: user.id, email: user.email, role: 'admin', tenantSlug: 'admin', isSuperAdmin: true }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      return ok(res, { accessToken: newAccess, refreshToken, expiresIn: JWT_EXPIRES });
    }
    
    // Regular User Refresh
    if (decoded.type === 'user' && !user.is_super_admin) {
      if (user.refresh_token_hash !== refreshToken) return unauthorized(res, 'Refresh token revoked');
      const newAccess = jwt.sign({ userId: user.id, email: user.email, role: user.role, tenantSlug: user.tenant_id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      return ok(res, { accessToken: newAccess, refreshToken, expiresIn: JWT_EXPIRES });
    }

    return unauthorized(res, 'Invalid token type');
  } catch (err) { next(err); }
});

// ── POST /logout ──────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await publicDb.execute(`UPDATE users SET refresh_token_hash = NULL WHERE id = $1`, [req.userId]);
    return ok(res, null, 'Logged out successfully');
  } catch (err) { next(err); }
});

// ── GET /me ───────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await publicDb.queryOne(`SELECT id, email, name, role, permissions, last_login_at, is_super_admin FROM users WHERE id = $1`, [req.userId]);
    if (!user) return unauthorized(res, 'User not found');

    let permissions = [];
    if (user.is_super_admin) {
      permissions = ['*'];
    } else {
      try { permissions = user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : []; } catch (e) {}
    }

    return ok(res, { 
      ...user, 
      permissions, 
      isSuperAdmin: user.is_super_admin,
      tenantSlug: req.tenantSlug
    });
  } catch (err) { next(err); }
});

// ── POST /change-password ─────────────────────────────────────
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await publicDb.queryOne(`SELECT id, password_hash FROM users WHERE id = $1`, [req.userId]);
    if (!await bcrypt.compare(currentPassword, user.password_hash)) return badRequest(res, 'Current password is incorrect');
    const newHash = await bcrypt.hash(newPassword, 12);
    await publicDb.execute(`UPDATE users SET password_hash = $1, updated_at = NOW(), refresh_token_hash = NULL WHERE id = $2`, [newHash, req.userId]);
    return ok(res, null, 'Password changed. Please log in again.');
  } catch (err) { next(err); }
});

module.exports = router;
