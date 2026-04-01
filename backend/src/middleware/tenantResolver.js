'use strict';
const { db } = require('../../config/database');

function invalidateTenantCache(slug) {}

async function tenantResolver(req, res, next) {
  req.tenantSlug     = req.headers['x-tenant-slug'] || req.tenantSlug || 'default';
  req.tenantDb       = db;
  req.tenantId       = null;
  req.tenantSettings = {};
  next();
}

module.exports = { tenantResolver, invalidateTenantCache };
