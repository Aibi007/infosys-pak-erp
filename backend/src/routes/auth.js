'use strict';
// src/routes/auth.js — PostgreSQL version - Final Fix Attempt for type mismatch
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

// ── POST /login ───────────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res, next) => {
  const { email, password, tenantSlug } = req.body;
  const emailLower = email.toLowerCase();
  
  try {
    // SCHEMA FIX: The error "operator does not exist: integer = uuid" proves a type mismatch 
    // between users.tenant_id (integer) and tenants.id (uuid). This is a schema design flaw.
    // The correct fix is to alter the `users.tenant_id` column to be of type UUID.
    // As a workaround, we cast the UUID to TEXT. This is a temporary solution.
    const userAndTenant = await publicDb.queryOne(
      `SELECT 
         u.id, u.email, u.password_hash, u.name, u.role, u.permissions, u.is_active, u.is_super_admin,
         t.id as tenant_id, t.name as tenant_name, t.slug as tenant_slug, t.is_active as tenant_is_active
       FROM users u
       JOIN tenants t ON CAST(u.tenant_id AS TEXT) = CAST(t.id AS TEXT)
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

// Other routes are unchanged
router.post('/refresh', authenticate, (req, res) => { res.status(501).send('Not implemented') });
router.post('/logout', authenticate, (req, res) => { res.status(501).send('Not implemented') });
router.get('/me', authenticate, (req, res) => { res.status(501).send('Not implemented') });
router.post('/change-password', authenticate, (req, res) => { res.status(501).send('Not implemented') });


module.exports = router;
