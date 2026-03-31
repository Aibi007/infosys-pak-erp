'use strict';
// Simple tenantResolver — MySQL single-DB version
const { db } = require('../../config/database');
const logger  = require('../utils/logger');

function invalidateTenantCache(slug) {
  // No-op in single DB mode
}

async function tenantResolver(req, res, next) {
  // Single database — just attach db to req and continue
  req.tenantSlug     = req.headers['x-tenant-slug'] || 'default';
  req.tenantDb       = db;
  req.tenantId       = null;
  req.tenantSettings = {};
  next();
}

module.exports = { tenantResolver, invalidateTenantCache };
