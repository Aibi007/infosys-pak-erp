'use strict';
// ================================================================
// src/middleware/auth.js — Simple JWT auth for MySQL schema
// ================================================================
const jwt = require('jsonwebtoken');
const { db } = require('../../config/database');
const { unauthorized, forbidden } = require('../utils/response');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const permCache = new Map();

function invalidatePermCache(tenantSlug, userId) {
  permCache.delete(`${tenantSlug}:${userId}`);
}

// ── authenticate ──────────────────────────────────────────────
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return unauthorized(res, 'No token provided');

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return unauthorized(res, msg);
  }

  try {
    const [rows] = await db.raw(
      'SELECT id, email, name, role, permissions, is_active FROM users WHERE id = ?',
      [payload.userId]
    );
    const user = rows[0];
    if (!user || !user.is_active) return unauthorized(res, 'User not found or deactivated');

    let permissions = [];
    try {
      permissions = user.permissions
        ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions)
        : [];
    } catch (e) { permissions = []; }

    // Admin gets all permissions
    if (user.role === 'admin') permissions = ['*'];

    req.user        = user;
    req.userId      = user.id;
    req.userRole    = user.role;
    req.permissions = permissions;
    req.tenantSlug  = payload.tenantSlug || 'default';
    req.tenantId    = payload.tenantId   || null;
    req.tenantDb    = db;
    req.isSuperAdmin= user.role === 'admin';

    next();
  } catch (err) {
    logger.error('authenticate error', { error: err.message });
    next(err);
  }
}

// ── authorize ────────────────────────────────────────────────
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (req.isSuperAdmin) return next();
    if (roles.length && !roles.includes(req.userRole)) {
      return forbidden(res, `Role '${req.userRole}' not allowed. Required: ${roles.join(' | ')}`);
    }
    next();
  };
}

// ── hasPermission ────────────────────────────────────────────
function hasPermission(permission) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (req.isSuperAdmin) return next();
    const perms = req.permissions || [];
    if (!perms.includes(permission) && !perms.includes('*')) {
      return forbidden(res, `Missing permission: ${permission}`);
    }
    next();
  };
}

// ── requireSuperAdmin ────────────────────────────────────────
function requireSuperAdmin(req, res, next) {
  if (!req.user || !req.isSuperAdmin) {
    return forbidden(res, 'Admin access required');
  }
  next();
}

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
