'use strict';
// src/routes/auth.js — Complete and Corrected Implementation

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

// Schemas for validation
const loginSchema = z.object({
    email: z.string().email('Invalid email format.'),
    password: z.string().min(1, 'Password cannot be empty.'),
    tenantSlug: z.string().min(1, 'Company slug is required.'),
});
const refreshSchema = z.object({ 
    refreshToken: z.string().min(1, 'Refresh token is required.') 
});
const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'New password must be at least 8 characters long.'),
});

// ── POST /login ───────────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res) => {
    const { email, password, tenantSlug } = req.body;
    const emailLower = email.toLowerCase();

    try {
        const tenant = await publicDb.queryOne(`SELECT * FROM tenants WHERE slug = ?`, [tenantSlug]);
        if (!tenant || !tenant.is_active) {
            return unauthorized(res, 'Invalid company slug, email, or password.');
        }

        const user = await publicDb.queryOne(`SELECT * FROM users WHERE email = ?`, [emailLower]);

        const dummyHash = '$2a$12$invalidhashinvalidhashinvalidhash.';
        const passwordOk = await bcrypt.compare(password, user?.password_hash || dummyHash);
        if (!user || !passwordOk) {
            return unauthorized(res, 'Invalid company slug, email, or password.');
        }

        if (String(user.tenant_id) !== String(tenant.id)) {
            logger.warn('Login attempt with mismatched tenant', { email: emailLower, userTenant: user.tenant_id, slugTenant: tenant.id });
            return unauthorized(res, 'This user account does not belong to the specified company.');
        }

        if (!user.is_active) {
            return unauthorized(res, 'Your account is deactivated.');
        }

        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            isSuperAdmin: user.is_super_admin,
        };

        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        const refreshToken = jwt.sign({ userId: user.id, type: 'auth' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });

        await publicDb.execute(
            `UPDATE users SET refresh_token_hash = ?, last_login_at = NOW() WHERE id = ?`,
            [refreshToken, user.id]
        );

        const userPermissions = (user.is_super_admin || user.role === 'admin') ? ['*'] : (user.permissions || []);

        logger.info('User logged in successfully', { userId: user.id, tenant: tenant.slug });

        return ok(res, {
            accessToken,
            refreshToken,
            expiresIn: JWT_EXPIRES,
            user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: userPermissions, isSuperAdmin: user.is_super_admin },
            tenant: { slug: tenant.slug, companyName: tenant.name },
        }, 'Login successful');

    } catch (err) {
        logger.error('Login process failed', { error: err.message, email: emailLower });
        return internalError(res, 'An internal error occurred. Please try again.');
    }
});

// ── POST /refresh ─────────────────────────────────────────────
router.post('/refresh', validate(refreshSchema), async (req, res) => {
    const { refreshToken } = req.body;
    try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        
        const user = await publicDb.queryOne(`SELECT * FROM users WHERE id = ?`, [decoded.userId]);
        if (!user || !user.is_active || user.refresh_token_hash !== refreshToken) {
            return unauthorized(res, 'Invalid or expired refresh token.');
        }

        const tenant = await publicDb.queryOne(`SELECT id, slug FROM tenants WHERE id = ?`, [user.tenant_id]);
        if (!tenant) {
            return unauthorized(res, 'Tenant not found for this user.');
        }

        const payload = { userId: user.id, email: user.email, role: user.role, tenantId: tenant.id, tenantSlug: tenant.slug, isSuperAdmin: user.is_super_admin };
        const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

        return ok(res, { accessToken: newAccessToken, expiresIn: JWT_EXPIRES });
    } catch (err) {
        logger.warn('Refresh token validation failed', { error: err.message });
        return unauthorized(res, 'Invalid or expired refresh token.');
    }
});

// ── POST /logout ──────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
    try {
        await publicDb.execute(`UPDATE users SET refresh_token_hash = NULL WHERE id = ?`, [req.userId]);
        return ok(res, null, 'Logged out successfully.');
    } catch (err) {
        logger.error('Logout failed', { userId: req.userId, error: err });
        return internalError(res, 'Failed to logout.');
    }
});

// ── GET /me ───────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await publicDb.queryOne(`SELECT id, email, name, role, permissions, is_super_admin, last_login_at FROM users WHERE id = ?`, [req.userId]);
        if (!user) {
            return unauthorized(res, 'User not found');
        }

        const tenant = await publicDb.queryOne(`SELECT slug, name FROM tenants WHERE id = ?`, [req.tenantId]);
        if (!tenant) {
            return unauthorized(res, 'Tenant not found');
        }

        let permissions = (user.is_super_admin || user.role === 'admin') ? ['*'] : (user.permissions || []);

        return ok(res, { user: { ...user, permissions }, tenant });
    } catch (err) {
        logger.error('Failed to fetch user profile (/me)', { userId: req.userId, error: err });
        return internalError(res, 'Could not retrieve user profile.');
    }
});

// ── POST /change-password ─────────────────────────────────────
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await publicDb.queryOne(`SELECT password_hash FROM users WHERE id = ?`, [req.userId]);
        if (!user || !await bcrypt.compare(currentPassword, user.password_hash)) {
            return badRequest(res, 'The current password you entered is incorrect.');
        }

        const newHash = await bcrypt.hash(newPassword, 12);
        await publicDb.execute(`UPDATE users SET password_hash = ?, refresh_token_hash = NULL WHERE id = ?`, [newHash, req.userId]);

        return ok(res, null, 'Password changed successfully. All other sessions have been logged out.');
    } catch (err) {
        logger.error('Password change failed', { userId: req.userId, error: err });
        return internalError(res, 'An error occurred while changing your password.');
    }
});

module.exports = router;
