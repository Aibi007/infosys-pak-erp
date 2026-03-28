'use strict';
// ================================================================
// src/routes/superAdmin.js
// Super-admin only routes (is_super_admin = TRUE in users table)
//
// GET    /admin/tenants          — list all tenants + stats
// GET    /admin/tenants/:id      — tenant detail
// POST   /admin/tenants          — create new tenant
// PATCH  /admin/tenants/:id      — update plan / status
// GET    /admin/stats            — platform-wide stats
// GET    /admin/users            — all users across tenants
// POST   /admin/migrate          — run pending migrations
// ================================================================
const router  = require('express').Router();
const { z }   = require('zod');
const bcrypt  = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const { publicDb, getTenantDB } = require('../../config/database');
const validate = require('../middleware/validate');
const { ok, created, paginated, notFound, badRequest, conflict } = require('../utils/response');
const logger  = require('../utils/logger');

router.use(authenticate, requireSuperAdmin);

// ── GET /admin/tenants ────────────────────────────────────────
router.get('/tenants', validate.query(validate.schemas.pagination.extend({
  status: z.enum(['active','trial','suspended','cancelled','all']).default('all'),
})), async (req, res, next) => {
  const { page, limit, search, status } = req.query;
  try {
    const conds  = [];
    const params = [];
    if (status !== 'all') { params.push(status); conds.push(`t.status=$${params.length}`); }
    if (search) { params.push(`%${search}%`); conds.push(`(t.slug ILIKE $${params.length} OR t.company_name ILIKE $${params.length})`); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const sql = `
      SELECT t.id, t.slug, t.company_name, t.status, t.created_at,
             p.name AS plan, p.price_pkr,
             (SELECT COUNT(*) FROM users WHERE tenant_id=t.id AND is_active=TRUE) AS user_count
      FROM tenants t JOIN plans p ON p.id=t.plan_id
      ${where}
      ORDER BY t.created_at DESC
    `;
    const result = await publicDb.paginate(sql, params, { page, limit });
    return paginated(res, result);
  } catch (err) { next(err); }
});

// ── GET /admin/tenants/:id ────────────────────────────────────
router.get('/tenants/:id', async (req, res, next) => {
  try {
    const tenant = await publicDb.queryOne(
      `SELECT t.*, p.name plan_name, p.price_pkr
       FROM tenants t JOIN plans p ON p.id=t.plan_id WHERE t.id=$1`,
      [req.params.id]
    );
    if (!tenant) return notFound(res, 'Tenant');

    // Get tenant stats from their schema
    let stats = {};
    try {
      const db = getTenantDB(tenant.slug);
      const [invRow, prodRow, empRow] = await Promise.all([
        db.queryOne(`SELECT COUNT(*) AS invoices, COALESCE(SUM(grand_total),0) AS sales FROM invoices WHERE status NOT IN ('voided','draft')`),
        db.queryOne(`SELECT COUNT(*) AS products FROM products WHERE is_active=TRUE`),
        db.queryOne(`SELECT COUNT(*) AS employees FROM employees WHERE status='active'`),
      ]);
      stats = { invoices: parseInt(invRow.invoices), totalSales: parseFloat(invRow.sales), products: parseInt(prodRow.products), employees: parseInt(empRow.employees) };
    } catch { /* schema may not exist yet */ }

    return ok(res, { ...tenant, stats });
  } catch (err) { next(err); }
});

// ── PATCH /admin/tenants/:id ──────────────────────────────────
router.patch('/tenants/:id', validate(z.object({
  status:  z.enum(['active','trial','suspended','cancelled']).optional(),
  planId:  z.string().uuid().optional(),
  notes:   z.string().max(500).optional(),
}).refine(d => Object.keys(d).length > 0, 'At least one field required')), async (req, res, next) => {
  const { status, planId, notes } = req.body;
  try {
    const sets   = [];
    const params = [];
    if (status) { params.push(status); sets.push(`status=$${params.length}`); }
    if (planId) { params.push(planId); sets.push(`plan_id=$${params.length}`); }
    if (notes)  { params.push(notes);  sets.push(`notes=$${params.length}`); }
    sets.push(`updated_at=NOW()`);
    params.push(req.params.id);

    const updated = await publicDb.queryOne(
      `UPDATE tenants SET ${sets.join(',')} WHERE id=$${params.length} RETURNING slug, status`,
      params
    );
    if (!updated) return notFound(res, 'Tenant');

    logger.info('Tenant updated by super-admin', { tenantId: req.params.id, changes: req.body, by: req.userId });
    return ok(res, updated, 'Tenant updated');
  } catch (err) { next(err); }
});

// ── GET /admin/stats ──────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [tenantStats, userStats, planStats] = await Promise.all([
      publicDb.queryAll(`
        SELECT status, COUNT(*) AS count FROM tenants GROUP BY status ORDER BY count DESC
      `),
      publicDb.queryOne(`
        SELECT COUNT(*) AS total, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active
        FROM users WHERE is_super_admin=FALSE
      `),
      publicDb.queryAll(`
        SELECT p.name, COUNT(t.id) AS tenants FROM plans p
        LEFT JOIN tenants t ON t.plan_id=p.id AND t.status='active'
        GROUP BY p.id, p.name ORDER BY tenants DESC
      `),
    ]);

    const totalTenants  = tenantStats.reduce((s,r) => s+parseInt(r.count), 0);
    const activeTenants = tenantStats.find(r => r.status==='active')?.count || 0;

    return ok(res, { tenantStats, totalTenants, activeTenants, userStats, planStats });
  } catch (err) { next(err); }
});

// ── POST /admin/migrate ───────────────────────────────────────
router.post('/migrate', async (req, res, next) => {
  const { tenantSlug } = req.body;
  try {
    // Run migration programmatically
    const { execSync } = require('child_process');
    const cmd = tenantSlug
      ? `node migrate.js --tenant ${tenantSlug}`
      : `node migrate.js`;

    const output = execSync(cmd, { cwd: process.cwd(), timeout: 60_000 }).toString();
    logger.info('Manual migration run', { by: req.userId, tenantSlug, output: output.slice(0,500) });
    return ok(res, { output }, 'Migrations complete');
  } catch (err) {
    return badRequest(res, `Migration failed: ${err.message}`);
  }
});

module.exports = router;
