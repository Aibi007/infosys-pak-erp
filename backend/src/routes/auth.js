'use strict';
// src/routes/auth.js — PostgreSQL version - Corrected for Knex parameter binding
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const { publicDb } = require('../../config/database');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ok, unauthorized, badRequest } = require('../utils/response');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES = parseInt(process.env.JWT_ACCESS_EXPIRES_SECONDS || '900', 10);
const JWT_REFRESH_EXPIRES = '30d';

const loginSchema = z.object({
  email: z.string().email('Invalid email format.'),
  password: z.string().min(1, 'Password cannot be empty.'),
  tenantSlug: z.string().min(1, 'Company slug is required.'),
});
const refreshSchema = z.object({ refreshToken: z.string().min(10) });
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});


// ── POST /login ───────────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res, next) => {
  const { email, password, tenantSlug } = req.body;
  const emailLower = email.toLowerCase();
  
  try {
    // Corrected Query: Use `?` for knex positional bindings
    const userAndTenant = await publicDb.queryOne(
      `SELECT 
         u.id, u.email, u.password_hash, u.name, u.role, u.permissions, u.is_active, u.is_super_admin,
         t.id as tenant_id, t.name as tenant_name, t.slug as tenant_slug, t.is_active as tenant_is_active
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = ? AND t.slug = ?`,
      [emailLower, tenantSlug]
    );

    const dummyHash = '$2a$12$invalidhashinvalidhashinvalidhash.';
    const passwordOk = await bcrypt.compare(password, userAndTenant?.password_hash || dummyHash);

    if (!userAndTenant || !passwordOk) {
      return unauthorized(res, 'Invalid company slug, email, or password.');
    }
    
    const { id, name, role, permissions, is_active, is_super_admin, tenant_id, tenant_name, tenant_slug, tenant_is_active } = userAndTenant;

    if (!is_active) {
      return unauthorized(res, 'Your account is deactivated.');
    }
    if (!tenant_is_active) {
      return unauthorized(res, 'The company account is inactive.');
    }

    const payload = {
      userId: id,
      email: emailLower,
      role: role,
      tenantId: tenant_id,
      tenantSlug: tenant_slug,
      isSuperAdmin: is_super_admin,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    const refreshToken = jwt.sign({ userId: id, type: 'auth' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });

    publicDb.execute(
      `UPDATE users SET refresh_token_hash = ?, last_login_at = NOW() WHERE id = ?`,
      [refreshToken, id]
    ).catch(err => logger.error('Failed to update refresh token on login', { userId: id, error: err }));

    let userPermissions = [];
    if (is_super_admin || role === 'admin') {
        userPermissions = ['*'];
    } else {
        try {
            userPermissions = permissions ? JSON.parse(permissions) : [];
        } catch (e) {
            logger.warn('Failed to parse user permissions JSON', { userId: id });
            userPermissions = [];
        }
    }

    logger.info('User logged in successfully', { userId: id, tenant: tenant_slug });

    return ok(res, {
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRES,
      user: {
        id: id,
        email: emailLower,
        name: name,
        role: role,
        permissions: userPermissions,
        isSuperAdmin: is_super_admin,
      },
      tenant: {
        slug: tenant_slug,
        companyName: tenant_name,
      },
    }, 'Login successful');

  } catch (err) {
    logger.error('Login process encountered an error', {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      email: emailLower,
      tenantSlug: tenantSlug,
    });
    next(err);
  }
});

// ── POST /refresh ─────────────────────────────────────────────
router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  const { refreshToken } = req.body;
  try {
    let decoded;
    try { decoded = jwt.verify(refreshToken, JWT_SECRET); }
    catch (e) { return unauthorized(res, 'Invalid or expired refresh token'); }

    const user = await publicDb.queryOne(
      `SELECT id, email, name, role, is_active, is_super_admin, tenant_id, refresh_token_hash FROM users WHERE id = ?`,
      [decoded.userId]
    );

    if (!user || !user.is_active) return unauthorized(res, 'Account not found or inactive');
    
    const tenant = await publicDb.queryOne(`SELECT slug FROM tenants WHERE id = ?`, [user.tenant_id]);
    if (!tenant) return unauthorized(res, 'Associated tenant not found.');

    if (user.refresh_token_hash !== refreshToken) return unauthorized(res, 'Refresh token has been revoked');

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      tenantSlug: tenant.slug,
      isSuperAdmin: user.is_super_admin,
    };
    
    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return ok(res, { accessToken: newAccessToken, expiresIn: JWT_EXPIRES });

  } catch (err) { next(err); }
});

// ── POST /logout ──────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await publicDb.execute(`UPDATE users SET refresh_token_hash = NULL WHERE id = ?`, [req.userId]);
    return ok(res, null, 'Logged out successfully');
  } catch (err) { next(err); }
});

// ── GET /me ───────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await publicDb.queryOne(`SELECT id, email, name, role, permissions, last_login_at, is_super_admin FROM users WHERE id = ?`, [req.userId]);
    if (!user) return unauthorized(res, 'User not found');

    let permissions = [];
    if (user.is_super_admin || user.role === 'admin') {
      permissions = ['*'];
    } else {
      try { permissions = user.permissions ? JSON.parse(user.permissions) : []; } catch (e) {}
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
    const user = await publicDb.queryOne(`SELECT id, password_hash FROM users WHERE id = ?`, [req.userId]);
    if (!await bcrypt.compare(currentPassword, user.password_hash)) return badRequest(res, 'Current password is incorrect');
    const newHash = await bcrypt.hash(newPassword, 12);
    await publicDb.execute(`UPDATE users SET password_hash = ?, updated_at = NOW(), refresh_token_hash = NULL WHERE id = ?`, [newHash, req.userId]);
    return ok(res, null, 'Password changed. Please log in again.');
  } catch (err) { next(err); }
});

module.exports = router;
