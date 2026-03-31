'use strict';
// ================================================================
// src/routes/auth.js
// POST /api/v1/auth/login           — email + password → tokens
// POST /api/v1/auth/refresh         — refresh token → new access token
// POST /api/v1/auth/logout          — revoke refresh token
// POST /api/v1/auth/change-password — authenticated password change
// GET  /api/v1/auth/me              — current user profile
// ================================================================
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { z }   = require('zod');

const { publicDb, getTenantDB } = require('../../config/database');
const { buildAuthTokens, hashToken, verifyAccessToken } = require('../utils/jwt');
const { authenticate }          = require('../middleware/auth');
const validate                  = require('../middleware/validate');
const { ok, created, badRequest, unauthorized, serverError } = require('../utils/response');
const logger                    = require('../utils/logger');

// ── Validation schemas ────────────────────────────────────────
const loginSchema = z.object({
  email:       z.string().email('Invalid email'),
  password:    z.string().min(1, 'Password required'),
  tenantSlug:  z.string().min(2).max(63).optional(), // also accepted in body
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, 'New password must be at least 8 characters')
                    .regex(/[A-Z]/,    'Must contain an uppercase letter')
                    .regex(/[0-9]/,    'Must contain a number'),
});

// ── Helper: get tenant from slug ──────────────────────────────
async function resolveTenant(slug) {
  return publicDb.queryOne(
    `SELECT id, slug, company_name, status FROM tenants WHERE slug = $1`,
    [slug]
  );
}

// ── Helper: record failed login & lock if needed ──────────────
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MIN = 30;

async function handleFailedLogin(userId) {
  await publicDb.execute(
    `UPDATE users
     SET login_attempts = login_attempts + 1,
         locked_until   = CASE
           WHEN login_attempts + 1 >= $1
           THEN NOW() + INTERVAL '${LOCK_DURATION_MIN} minutes'
           ELSE locked_until
         END
     WHERE id = $2`,
    [MAX_ATTEMPTS, userId]
  );
}

async function resetLoginAttempts(userId) {
  await publicDb.execute(
    `UPDATE users
     SET login_attempts = 0, locked_until = NULL, last_login_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

// ── POST /login ───────────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res, next) => {
  const { email, password } = req.body;
  const slug = req.body.tenantSlug || req.headers['x-tenant-slug'];

  try {
    // 1. Find user
   // Line 81-86 ke qareeb:
// Line 86 ke qareeb users table ko public.users kar dein:
const user = await publicDb.queryOne(
  `SELECT id, email, password_hash, full_name, full_name_ur,
          is_super_admin, is_active, tenant_id,
          login_attempts, locked_until
   FROM public.users WHERE email = $1`, // Yahan 'public.users' kar diya
  [email.toLowerCase()]
);


    // Timing-safe: always run bcrypt to prevent user enumeration
    const dummyHash = '$2a$12$invalidhashinvalidhashinvalidhashin';
    const hashToCheck = user?.password_hash || dummyHash;
    const passwordOk  = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordOk) {
      if (user) await handleFailedLogin(user.id);
      return unauthorized(res, 'Invalid email or password');
    }

    // 2. Check account status
    if (!user.is_active) {
      return unauthorized(res, 'Account is deactivated. Contact your administrator.');
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return unauthorized(res, `Account locked. Try again in ${mins} minute(s).`);
    }

    // 3. Resolve tenant (super-admin can skip tenant)
    let tenant    = null;
    let tenantSlug= null;

    if (!user.is_super_admin) {
      const tenantId = user.tenant_id;
      tenant = await publicDb.queryOne(
        `SELECT id, slug, company_name, status FROM tenants WHERE id = $1`,
        [tenantId]
      );

      if (!tenant) return unauthorized(res, 'No tenant associated with this account');
      if (tenant.status === 'suspended') return unauthorized(res, 'Account suspended');

      // If slug provided, validate it matches
      if (slug && tenant.slug !== slug) {
        return unauthorized(res, 'Tenant mismatch');
      }
      tenantSlug = tenant.slug;
    } else {
      tenantSlug = slug || 'super_admin';
    }

    // 4. Load role + permissions from tenant schema
    const tenantDb = user.is_super_admin ? publicDb : getTenantDB(tenantSlug);
    let   role     = user.is_super_admin ? 'owner' : 'viewer';
    let   permissions = [];

    if (!user.is_super_admin) {
      const tuRow = await tenantDb.queryOne(
        `SELECT r.name AS role
         FROM tenant_users tu JOIN roles r ON r.id = tu.role_id
         WHERE tu.user_id = $1 AND tu.is_active = TRUE`,
        [user.id]
      );
      role = tuRow?.role || 'viewer';

      const permRows = await tenantDb.queryAll(
        `SELECT p.name FROM tenant_users tu
         JOIN role_permissions rp ON rp.role_id = tu.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE tu.user_id = $1 AND tu.is_active = TRUE`,
        [user.id]
      );
      permissions = permRows.map(r => r.name);
    }

    // 5. Build tokens
    const { accessToken, refreshTokenRaw, refreshTokenHash } = buildAuthTokens(
      { ...user, role },
      tenantSlug,
      permissions
    );

    // 6. Store refresh token
    const deviceInfo = req.headers['user-agent']?.slice(0, 200);
    const ipAddress  = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    await publicDb.execute(
      `INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')`,
      [user.id, refreshTokenHash, deviceInfo, ipAddress]
    );

    // 7. Reset failed attempts
    await resetLoginAttempts(user.id);

    logger.info('User logged in', {
      userId:     user.id,
      email:      user.email,
      tenantSlug,
      role,
      ip:         ipAddress,
    });

    return ok(res, {
      accessToken,
      refreshToken: refreshTokenRaw,
      expiresIn:    parseInt(process.env.JWT_ACCESS_EXPIRES_SECONDS || '900'),
      user: {
        id:          user.id,
        email:       user.email,
        name:        user.full_name,
        nameUr:      user.full_name_ur,
        role,
        permissions,
        isSuperAdmin:user.is_super_admin,
      },
      tenant: tenant ? {
        id:          tenant.id,
        slug:        tenant.slug,
        companyName: tenant.company_name,
      } : null,
    }, 'Login successful');

  } catch (err) {
    next(err);
  }
});

// ── POST /refresh ─────────────────────────────────────────────
router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  const { refreshToken: rawToken } = req.body;

  try {
    const hash = hashToken(rawToken);

    const stored = await publicDb.queryOne(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at,
              u.is_active, u.tenant_id, u.is_super_admin, u.full_name
       FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1`,
      [hash]
    );

    if (!stored)              return unauthorized(res, 'Invalid refresh token');
    if (stored.revoked_at)    return unauthorized(res, 'Refresh token revoked');
    if (new Date(stored.expires_at) < new Date()) return unauthorized(res, 'Refresh token expired');
    if (!stored.is_active)    return unauthorized(res, 'Account deactivated');

    // Resolve tenant
    const tenant = await publicDb.queryOne(
      `SELECT id, slug, status FROM tenants WHERE id = $1`,
      [stored.tenant_id]
    );
    if (!tenant || tenant.status !== 'active') return unauthorized(res, 'Tenant unavailable');

    const tenantDb = getTenantDB(tenant.slug);
    const tuRow    = await tenantDb.queryOne(
      `SELECT r.name AS role FROM tenant_users tu JOIN roles r ON r.id = tu.role_id
       WHERE tu.user_id = $1 AND tu.is_active = TRUE`,
      [stored.user_id]
    );
    const role = tuRow?.role || 'viewer';

    const permRows = await tenantDb.queryAll(
      `SELECT p.name FROM tenant_users tu
       JOIN role_permissions rp ON rp.role_id = tu.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE tu.user_id = $1 AND tu.is_active = TRUE`,
      [stored.user_id]
    );

    const { accessToken } = buildAuthTokens(
      { id: stored.user_id, tenant_id: stored.tenant_id, role, is_super_admin: stored.is_super_admin, full_name: stored.full_name },
      tenant.slug,
      permRows.map(r => r.name)
    );

    // Rotate: revoke old token, issue new one
    await publicDb.execute(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      [stored.id]
    );

    const { raw: newRaw, hash: newHash } = require('../utils/jwt').signRefreshToken(stored.user_id);
    await publicDb.execute(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [stored.user_id, newHash]
    );

    return ok(res, {
      accessToken,
      refreshToken: newRaw,
      expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_SECONDS || '900'),
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /logout ──────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res, next) => {
  const { refreshToken } = req.body;
  try {
    if (refreshToken) {
      const hash = hashToken(refreshToken);
      await publicDb.execute(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE token_hash = $1 AND user_id = $2`,
        [hash, req.userId]
      );
    }
    // Optionally revoke ALL tokens for this user
    if (req.query.all === 'true') {
      await publicDb.execute(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [req.userId]
      );
    }
    return ok(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
});

// ── GET /me ───────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    // Fetch fresh user from DB (don't rely purely on token)
    const user = await publicDb.queryOne(
      `SELECT id, email, full_name, full_name_ur, is_super_admin, created_at, last_login_at
       FROM users WHERE id = $1`,
      [req.userId]
    );
    if (!user) return unauthorized(res, 'User not found');

    return ok(res, {
      ...user,
      role:        req.userRole,
      permissions: req.permissions,
      tenantSlug:  req.tenantSlug,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /change-password ─────────────────────────────────────
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await publicDb.queryOne(
      `SELECT id, password_hash FROM users WHERE id = $1`,
      [req.userId]
    );

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return badRequest(res, 'Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'));
    await publicDb.execute(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newHash, req.userId]
    );

    // Revoke all refresh tokens to force re-login everywhere
    await publicDb.execute(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [req.userId]
    );

    logger.info('Password changed', { userId: req.userId });
    return ok(res, null, 'Password changed successfully. Please log in again.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
