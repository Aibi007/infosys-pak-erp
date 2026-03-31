'use strict';
// ================================================================
// src/middleware/tenantResolver.js
//
// Resolves which tenant this request belongs to by:
//   1. X-Tenant-Slug header  (preferred for API clients)
//   2. Subdomain             (albaraka.erp.pk → 'albaraka_textiles')
//   3. JWT payload           (fallback after authenticate())
//
// Attaches to req:
//   req.tenantSlug   — e.g. 'albaraka_textiles'
//   req.tenantId     — UUID from tenants table
//   req.tenantDb     — TenantDB instance scoped to that schema
//   req.tenantSettings — cached settings object
// ================================================================
'use strict';
const { publicDb, getTenantDB } = require('../../config/database');
const { unauthorized, badRequest } = require('../utils/response');
const logger = require('../utils/logger');

// Simple in-memory cache for tenant lookup (TTL: 5 min)
const tenantCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getTenantBySlug(slug) {
  const cached = tenantCache.get(slug);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.tenant;

  const tenant = await publicDb.queryOne(
    `SELECT id, slug, company_name, status, settings, plan_id
     FROM tenants WHERE slug = $1`,
    [slug]
  );
  if (tenant) tenantCache.set(slug, { tenant, ts: Date.now() });
  return tenant;
}

// Invalidate cache when settings change (called from settings route)
function invalidateTenantCache(slug) {
  tenantCache.delete(slug);
}

// ── Resolver middleware ───────────────────────────────────────
async function tenantResolver(req, res, next) {
  try {
    let slug = null;

    // 1. Explicit header (API clients, Postman, React frontend)
    if (req.headers['x-tenant-slug']) {
      slug = req.headers['x-tenant-slug'].toLowerCase().trim();
    }

    // 2. Subdomain: albaraka.api.erp.pk → 'albaraka'
    if (!slug && req.hostname) {
      const parts = req.hostname.split('.');
      if (parts.length >= 3) slug = parts[0].toLowerCase();
    }

    // 3. Fall through to auth middleware to pick from JWT
    if (!slug) {
      // Not an error yet — authenticate() will set tenantSlug if token present
      return next();
    }

    // Validate slug format
    if (!/^[a-z0-9_]{2,63}$/.test(slug)) {
      return badRequest(res, 'Invalid tenant identifier');
    }

    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    if (tenant.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'Account suspended. Contact support.' });
    }

    if (tenant.status === 'cancelled') {
      return res.status(403).json({ success: false, error: 'Account cancelled.' });
    }

    req.tenantSlug     = tenant.slug;
    req.tenantId       = tenant.id;
    req.tenantDb       = getTenantDB(tenant.slug);
    req.tenantSettings = tenant.settings || {};
    req.tenant         = tenant;

    next();
  } catch (err) {
    logger.error('Tenant resolver error', { error: err.message });
    next(err);
  }
}

module.exports = { tenantResolver, invalidateTenantCache };
