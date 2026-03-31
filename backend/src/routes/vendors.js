'use strict';
// ================================================================
// src/routes/vendors.js
// GET  /vendors          — list vendors
// POST /vendors          — create
// GET  /vendors/:id      — detail + PO summary + ledger
// PUT  /vendors/:id      — update
// GET  /vendors/:id/ledger — AP transaction history
// ================================================================
const router = require('express').Router();
const { z }  = require('zod');
const { authenticate, hasPermission } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ok, created, notFound, paginated, badRequest } = require('../utils/response');

router.use(authenticate);

const vendorSchema = z.object({
  name:          z.string().min(1).max(255),
  nameUr:        z.string().max(255).optional(),
  contactPerson: z.string().max(255).optional(),
  phone:         z.string().max(20).optional(),
  email:         z.string().email().optional().or(z.literal('')).nullable(),
  ntn:           z.string().max(20).optional().nullable(),
  strn:          z.string().max(20).optional().nullable(),
  address:       z.string().max(500).optional(),
  city:          z.string().max(100).optional(),
  vendorType:    z.enum(['manufacturer','brand','mill','supplier','importer']).default('supplier'),
  paymentTerms:  z.coerce.number().int().min(0).default(30),
  creditLimit:   z.coerce.number().min(0).default(0),
  bankName:      z.string().max(100).optional(),
  bankAccount:   z.string().max(50).optional(),
  iban:          z.string().max(50).optional(),
  notes:         z.string().max(1000).optional(),
});

// ── GET /vendors ──────────────────────────────────────────────
router.get('/', hasPermission('vendors:read'), validate.query(validate.schemas.pagination), async (req, res, next) => {
  const { page, limit, search } = req.query;
  const conds=[]; const params=[];
  if (search) { params.push(`%${search}%`); conds.push(`(v.name LIKE $1 OR v.phone LIKE $1 OR v.code LIKE $1)`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : `WHERE v.status='active'`;
  try {
    const result = await req.tenantDb.paginate(`
      SELECT v.id, v.code, v.name, v.name_ur, v.phone, v.city, v.vendor_type,
             v.current_balance, v.payment_terms, v.status, v.last_purchase_at
      FROM vendors v ${where} ORDER BY v.name ASC
    `, params, { page, limit });
    return paginated(res, result);
  } catch (err) { next(err); }
});

// ── POST /vendors ─────────────────────────────────────────────
router.post('/', hasPermission('vendors:create'), validate(vendorSchema), async (req, res, next) => {
  const { name, nameUr, contactPerson, phone, email, ntn, strn, address, city,
          vendorType, paymentTerms, creditLimit, bankName, bankAccount, iban, notes } = req.body;
  try {
    const vendor = await req.tenantDb.queryOne(`
      INSERT INTO vendors (code, name, name_ur, contact_person, phone, email, ntn, strn,
        address, city, vendor_type, payment_terms, credit_limit, bank_name, bank_account, iban, notes)
      VALUES (next_vendor_code(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    `, [name, nameUr||null, contactPerson||null, phone||null, email||null, ntn||null, strn||null,
        address||null, city||null, vendorType, paymentTerms, creditLimit,
        bankName||null, bankAccount||null, iban||null, notes||null]);
    return created(res, vendor, 'Vendor created');
  } catch (err) { next(err); }
});

// ── GET /vendors/:id ──────────────────────────────────────────
router.get('/:id', hasPermission('vendors:read'), async (req, res, next) => {
  try {
    const db = req.tenantDb;
    const [vendor, summary, recentPOs] = await Promise.all([
      db.queryOne(`SELECT * FROM vendors WHERE id=$1`, [req.params.id]),
      db.queryOne(`
        SELECT COUNT(*) AS total_pos,
               COALESCE(SUM(grand_total),0) AS lifetime_purchases,
               COALESCE(SUM(amount_due),0)  AS total_outstanding
        FROM purchase_orders WHERE vendor_id=$1 AND status!='cancelled'
      `, [req.params.id]),
      db.queryAll(`
        SELECT po_number, po_date, grand_total, amount_due, status
        FROM purchase_orders WHERE vendor_id=$1 AND status!='draft'
        ORDER BY po_date DESC LIMIT 5
      `, [req.params.id]),
    ]);
    if (!vendor) return notFound(res, 'Vendor');
    return ok(res, { ...vendor, summary, recentPOs });
  } catch (err) { next(err); }
});

// ── PUT /vendors/:id ──────────────────────────────────────────
router.put('/:id', hasPermission('vendors:update'), validate(vendorSchema.partial()), async (req, res, next) => {
  const map = {
    name:'name', nameUr:'name_ur', contactPerson:'contact_person',
    phone:'phone', email:'email', ntn:'ntn', strn:'strn',
    address:'address', city:'city', vendorType:'vendor_type',
    paymentTerms:'payment_terms', bankName:'bank_name', bankAccount:'bank_account', iban:'iban', notes:'notes',
  };
  const sets=[]; const params=[];
  for (const [jsKey, col] of Object.entries(map)) {
    if (req.body[jsKey] !== undefined) { params.push(req.body[jsKey]??null); sets.push(`${col}=$${params.length}`); }
  }
  if (!sets.length) return badRequest(res, 'No fields to update');
  sets.push('updated_at=NOW()');
  params.push(req.params.id);
  try {
    const v = await req.tenantDb.queryOne(
      `UPDATE vendors SET ${sets.join(',')} WHERE id=$${params.length}`, params
    );
    if (!v) return notFound(res, 'Vendor');
    return ok(res, v, 'Vendor updated');
  } catch (err) { next(err); }
});

// ── GET /vendors/:id/ledger ───────────────────────────────────
router.get('/:id/ledger', hasPermission('procurement:read'), async (req, res, next) => {
  const { from, to } = req.query;
  const dateFilter = from && to ? `AND po.po_date BETWEEN $2 AND $3` : '';
  const params = [req.params.id, ...(from && to ? [from, to] : [])];
  try {
    const [vendor, entries] = await Promise.all([
      req.tenantDb.queryOne(`SELECT code, name, current_balance FROM vendors WHERE id=$1`, [req.params.id]),
      req.tenantDb.queryAll(`
        SELECT 'po' AS type, po_number AS ref, po_date AS txn_date, grand_total AS debit, 0 AS credit, status
        FROM purchase_orders WHERE vendor_id=$1 ${dateFilter} AND status NOT IN ('draft','cancelled')
        UNION ALL
        SELECT 'payment', payment_number, payment_date, 0, amount, payment_mode
        FROM vendor_payments WHERE vendor_id=$1
        ORDER BY txn_date ASC
      `, params),
    ]);
    if (!vendor) return notFound(res, 'Vendor');

    let running = 0;
    const withBalance = entries.map(e => {
      running += parseFloat(e.debit) - parseFloat(e.credit);
      return { ...e, running_balance: running };
    });
    return ok(res, { vendor, entries: withBalance });
  } catch (err) { next(err); }
});

module.exports = router;
