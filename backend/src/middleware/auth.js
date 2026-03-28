'use strict';
// ================================================================
// src/middleware/auth.js
// authenticate  — verify JWT, load user + permissions, attach to req
// authorize     — check role membership
// hasPermission — check granular permission string (e.g. 'pos:create')
// requireOwner  — resource ownership check
// ================================================================
const { verifyAccessToken }    = require('../utils/jwt');
const { publicDb, getTenantDB }= require('../../config/database');
const { unauthorized, forbidden } = require('../utils/response');
const logger = require('../utils/logger');

// In-memory permission cache per user (cleared on logout / role change)
const permCache = new Map();
const PERM_CACHE_TTL = 5 * 60 * 1000; // 5 min

async function loadUserPermissions(tenantDb, userId) {
  const cacheKey = `${tenantDb.schema}:${userId}`;
  const cached   = permCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < PERM_CACHE_TTL) return cached.perms;

  const rows = await tenantDb.queryAll(`
    SELECT p.name
    FROM tenant_users tu
    JOIN role_permissions rp ON rp.role_id = tu.role_id
    JOIN permissions p        ON p.id = rp.permission_id
    WHERE tu.user_id = $1 AND tu.is_active = TRUE
  `, [userId]);

  const perms = rows.map(r => r.name);
  permCache.set(cacheKey, { perms, ts: Date.now() });
  return perms;
}

function invalidatePermCache(tenantSlug, userId) {
  permCache.delete(`${tenantSlug}:${userId}`);
}

// ── authenticate ─────────────────────────────────────────────
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return unauthorized(res, 'No token provided');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return unauthorized(res, msg);
  }

  try {
    // Use tenantDb already set by tenantResolver, or build from JWT
    const slug     = req.tenantSlug || payload.tenantSlug;
    const tenantDb = req.tenantDb   || getTenantDB(slug);

    // Load user from public schema
    const user = await publicDb.queryOne(
      `SELECT id, email, full_name, full_name_ur, is_super_admin, is_active, tenant_id
       FROM users WHERE id = $1 AND is_active = TRUE`,
      [payload.sub]
    );

    if (!user) return unauthorized(res, 'User not found or deactivated');
    if (user.tenant_id && user.tenant_id !== req.tenantId) {
      return unauthorized(res, 'Token does not match tenant');
    }

    // Load role from tenant schema
    const tuRow = await tenantDb.queryOne(
      `SELECT tu.role_id, r.name AS role
       FROM tenant_users tu
       JOIN roles r ON r.id = tu.role_id
       WHERE tu.user_id = $1 AND tu.is_active = TRUE`,
      [user.id]
    );

    const role = tuRow?.role || (user.is_super_admin ? 'owner' : 'viewer');

    // Load permissions (cached)
    const permissions = user.is_super_admin
      ? ['*']  // super-admin bypasses all checks
      : await loadUserPermissions(tenantDb, user.id);

    req.user        = { ...user, role };
    req.userId      = user.id;
    req.userRole    = role;
    req.permissions = permissions;
    req.tenantSlug  = req.tenantSlug || slug;
    req.tenantId    = req.tenantId   || payload.tenantId;
    req.tenantDb    = tenantDb;
    req.isSuperAdmin= user.is_super_admin;

    next();
  } catch (err) {
    logger.error('authenticate middleware error', { error: err.message });
    next(err);
  }
}

// ── authorize(role1, role2, ...) ─────────────────────────────
// Ensures user has at least one of the specified roles
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user)   return unauthorized(res);
    if (req.isSuperAdmin) return next(); // super-admin bypasses all
    if (roles.length && !roles.includes(req.userRole)) {
      return forbidden(res, `Role '${req.userRole}' is not allowed here. Required: ${roles.join(' | ')}`);
    }
    next();
  };
}

// ── hasPermission('module:action') ───────────────────────────
// Checks granular permission string
function hasPermission(permission) {
  return (req, res, next) => {
    if (!req.user)     return unauthorized(res);
    if (req.isSuperAdmin) return next();

    const perms = req.permissions || [];
    if (!perms.includes(permission) && !perms.includes('*')) {
      return forbidden(res, `Missing permission: ${permission}`);
    }
    next();
  };
}

// ── requireSuperAdmin ─────────────────────────────────────────
function requireSuperAdmin(req, res, next) {
  if (!req.user || !req.isSuperAdmin) {
    return forbidden(res, 'Super-admin access required');
  }
  next();
}

// ── optionalAuth ──────────────────────────────────────────────
// Attaches user if token present, but doesn't fail if missing
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  return authenticate(req, res, next);
}

module.exports = {
  authenticate,
  authorize,
  hasPermission,
  requireSuperAdmin,
  optionalAuth,
  invalidatePermCache,
};
