'use strict';
// src/routes/auth.js — Final Correct Implementation
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const { publicDb } = require('../../config/database');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ok, unauthorized, badRequest, internalError } = require('../utils/response');
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
    // Step 1: Find the tenant by its slug.
    const tenant = await publicDb.queryOne(`SELECT * FROM tenants WHERE slug = ?`, [tenantSlug]);
    if (!tenant || !tenant.is_active) {
      return unauthorized(res, 'Invalid company slug, email, or password.');
    }

    // Step 2: Find the user by their email.
    const user = await publicDb.queryOne(`SELECT * FROM users WHERE email = ?`, [emailLower]);

    // Step 3: Verify the user exists and the password is correct.
    const dummyHash = '$2a$12$invalidhashinvalidhashinvalidhash.';
    const passwordOk = await bcrypt.compare(password, user?.password_hash || dummyHash);
    if (!user || !passwordOk) {
      return unauthorized(res, 'Invalid company slug, email, or password.');
    }

    // Step 4: CRITICAL FIX - Manually check if the user's tenant_id matches the tenant's id.
    // This bypasses the "integer = uuid" database error by comparing in JS code.
    if (String(user.tenant_id) !== String(tenant.id)) {
        // This check is lenient with types (e.g. integer 1 vs string '1'), which is safer here.
        logger.warn('Login attempt with mismatched tenant', { email: emailLower, tenantSlug, userTenant: user.tenant_id, slugTenant: tenant.id });
        return unauthorized(res, 'This user account does not belong to the specified company.');
    }

    if (!user.is_active) {
      return unauthorized(res, 'Your account is deactivated.');
    }

    // Step 5: Proceed with generating tokens and returning the response.
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: tenant.id,       // Use the UUID from tenant object
      tenantSlug: tenant.slug,
      isSuperAdmin: user.is_super_admin,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    const refreshToken = jwt.sign({ userId: user.id, type: 'auth' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });

    publicDb.execute(
      `UPDATE users SET refresh_token_hash = ?, last_login_at = NOW() WHERE id = ?`,
      [refreshToken, user.id]
    ).catch(err => logger.error('Failed to update refresh token on login', { userId: user.id, error: err }));

    let userPermissions = (user.is_super_admin || user.role === 'admin') ? ['*'] : (user.permissions || []);

    logger.info('User logged in successfully', { userId: user.id, tenant: tenant.slug });

    return ok(res, {
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRES,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: userPermissions, isSuperAdmin: user.is_super_admin },
      tenant: { slug: tenant.slug, companyName: tenant.name },
    }, 'Login successful');

  } catch (err) {
    logger.error('Login process encountered an unexpected error', { error: err.message, email: emailLower, tenantSlug: tenantSlug });
    return internalError(res, 'An internal error occurred during login.');
  }
});

// ── Restoring other routes that were accidentally removed ───

router.post('/refresh', authenticate, async (req, res) => {
    // Basic refresh logic, can be expanded
    const newAccessToken = jwt.sign({ userId: req.userId, email: req.email, tenantId: req.tenantId, tenantSlug: req.tenantSlug }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return ok(res, { accessToken: newAccessToken, expiresIn: JWT_EXPIRES });
});

router.post('/logout', authenticate, async (req, res) => {
    try {
        await publicDb.execute(`UPDATE users SET refresh_token_hash = NULL WHERE id = ?`, [req.userId]);
        return ok(res, null, 'Logged out successfully');
    } catch (err) {
        logger.error('Logout failed', { userId: req.userId, error: err });
        return internalError(res, 'Logout failed.');
    }
});

router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await publicDb.queryOne(`SELECT id, email, name, role, permissions, is_super_admin FROM users WHERE id = ?`, [req.userId]);
        if (!user) return unauthorized(res, 'User not found');
        
        const tenant = await publicDb.queryOne(`SELECT slug, name FROM tenants WHERE id = ?`, [req.tenantId]);

        let permissions = (user.is_super_admin || user.role === 'admin') ? ['*'] : (user.permissions || []);

        return ok(res, { user, tenant });
    } catch (err) {
        logger.error('Failed to fetch /me', { userId: req.userId, error: err });
        return internalError(res, 'Failed to fetch user profile.');
    }
});

module.exports = router;
