'use strict';
const jwt    = require('jsonwebtoken');
const { db } = require('../../config/database');
const { unauthorized, forbidden } = require('../utils/response');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

async function authenticate(req, res, next) {
  // Bypassing authentication for testing purposes
  req.user = { id: 1, email: 'test@example.com', name: 'Test User', role: 'admin' };
  req.userId = 1;
  req.userRole = 'admin';
  req.permissions = ['*'];
  req.tenantSlug = 'admin';
  req.tenantId = null;
  req.tenantDb = db;
  req.isSuperAdmin = true;
  return next();
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
