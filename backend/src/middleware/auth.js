'use strict';
const jwt    = require('jsonwebtoken');
const { db } = require('../../config/database');
const { unauthorized, forbidden } = require('../utils/response');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return unauthorized(res, 'No token provided');

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return unauthorized(res, err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token');
  }

  try {
    const user = await db.queryOne(
      `SELECT id, email, name, role, permissions, is_active, is_super_admin FROM users WHERE id = $1`,
      [payload.userId]
    );

    if (!user || !user.is_active) {
      return unauthorized(res, 'User not found or deactivated');
    }

    req.user = user;
    req.userId = user.id;
    req.userRole = user.role;
    req.isSuperAdmin = user.is_super_admin;
    req.tenantDb = db; // Assuming a single DB for now, tenant logic can be added here

    if (user.is_super_admin) {
      req.permissions = ['*'];
      req.tenantSlug = 'admin';
      req.tenantId = null;
    } else {
      let permissions = [];
      try {
        permissions = user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : [];
      } catch (e) {}
      if (user.role === 'admin') permissions.push('*');

      req.permissions = [...new Set(permissions)]; // Remove duplicates
      req.tenantSlug = payload.tenantSlug || 'default';
      // In a real multi-tenant setup, you would use tenantSlug to set tenantId and tenantDb
      req.tenantId = null; // Placeholder
    }

    next();
  } catch (err) {
    logger.error('Authentication middleware error', { error: err.message, stack: err.stack });
    next(err);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (req.isSuperAdmin) return next();
    if (roles.length && !roles.includes(req.userRole)) return forbidden(res, `Role '${req.userRole}' not allowed`);
    next();
  };
}

function hasPermission(permission) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (req.isSuperAdmin || (req.permissions && req.permissions.includes('*'))) return next();
    const perms = req.permissions || [];
    if (!perms.includes(permission)) return forbidden(res, `Missing permission: ${permission}`);
    next();
  };
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || !req.isSuperAdmin) return forbidden(res, 'Admin access required');
  next();
}


module.exports = { authenticate, authorize, hasPermission, requireSuperAdmin };
