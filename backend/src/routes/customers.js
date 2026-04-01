'use strict';
// ================================================================
// src/routes/customers.js
// GET  /customers              — list with balances
// POST /customers              — create
// GET  /customers/:id          — detail + ledger summary
// PUT  /customers/:id          — update
// GET  /customers/:id/ledger   — transaction history
// POST /customers/:id/payment  — record collection (payment receipt)
// GET  /customers/aging        — AR aging report
// ================================================================
const router = require('express').Router();
const { z }  = require('zod');
const { authenticate, hasPermission } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ok, created, notFound, paginated, badRequest } = require('../utils/response');

router.use(authenticate);

// ── Schemas ───────────────────────────────────────────────────
const customerSchema = z.object({
  name:          z.string().min(1).max(255),
  nameUr:        z.string().max(255).optional(),
  contactPerson: z.string().max(255).optional(),
  phone:         z.string().max(20).optional(),
  whatsapp:      z.string().max(20).optional(),
  email:         z.string().email().optional().or(z.literal('')),
  cnic:          z.string().regex(/^\d{5}-\d{7}-\d$/).optional().or(z.literal('')).nullable(),
  ntn:           z.string().max(20).optional().nullable(),
  address:       z.string().max(500).optional(),
  city:          z.string().max(100).optional(),
  tierId:        z.string().uuid().optional().nullable(),
  creditLimit:   z.coerce.number().min(0).default(0),
  paymentTerms:  z.coerce.number().int().min(0).default(0),
  notes:         z.string().max(1000).optional(),
});

const paymentSchema = z.object({
  amount:      z.coerce.number().positive(),
  paymentMode: z.enum(['cash','hbl_transfer','mcb_transfer','cheque','easypaisa','jazzcash','other']),
  referenceNo: z.string().max(100).optional(),
  bankName:    z.string().max(100).optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:       z.string().max(500).optional(),
  invoiceId:   z.string().uuid().optional(), // link to specific invoice
});

// ── GET /customers/aging ──────────────────────────────────────
// (before /:id to avoid routing conflict)
router.get('/aging', hasPermission('reports:read'), async (req, res, next) => {
  try {
    const rows = await req.tenantDb.queryAll(`SELECT * FROM v_ar_aging ORDER BY days_90_plus DESC, current_balance DESC`);
    const totals = rows.reduce((acc, r) => ({
      current_amt:  acc.current_amt  + parseFloat(r.current_amt),
      days_1_30:    acc.days_1_30    + parseFloat(r.days_1_30),
      days_31_60:   acc.days_31_60   + parseFloat(r.days_31_60),
      days_61_90:   acc.days_61_90   + parseFloat(r.days_61_90),
      days_90_plus: acc.days_90_plus + parseFloat(r.days_90_plus),
    }), { current_amt:0, days_1_30:0, days_31_60:0, days_61_90:0, days_90_plus:0 });
    return ok(res, { rows, totals });
  } catch (err) { next(err); }
});

// ── GET /customers ────────────────────────────────────────────
router.get('/', hasPermission('customers:read'), validate.query(validate.schemas.pagination), async (req, res, next) => {
  const { page, limit, search } = req.query;
  const searchClause = search ? `AND (c.name LIKE $2 OR c.phone LIKE $2 OR c.code LIKE $2)` : '';
  const params = search ? [`%${search}%`] : [];

  try {
    const result = await req.tenantDb.paginate(`
      SELECT c.id, c.code, c.name, c.name_ur, c.phone, c.city,
             c.credit_limit, c.current_balance, c.payment_terms,
             c.status, c.last_invoice_at,
             ct.name AS tier_name
      FROM customers c
      LEFT JOIN customer_tiers ct ON ct.id = c.tier_id
      WHERE c.status != 'blacklisted' ${searchClause}
      ORDER BY c.name ASC
    `, params, { page, limit });
    return paginated(res, result);
  } catch (err) { next(err); }
});

// ── POST /customers ───────────────────────────────────────────
router.post('/', hasPermission('customers:create'), validate(customerSchema), async (req, res, next) => {
  const { name, nameUr, contactPerson, phone, whatsapp, email, cnic, ntn,
          address, city, tierId, creditLimit, paymentTerms, notes } = req.body;
  try {
    const customer = await req.tenantDb.queryOne(`
      INSERT INTO customers
        (code, name, name_ur, contact_person, phone, whatsapp, email, cnic, ntn,
         address, city, tier_id, credit_limit, payment_terms, notes)
      VALUES (next_customer_code(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `, [name, nameUr||null, contactPerson||null, phone||null, whatsapp||null,
        email||null, cnic||null, ntn||null, address||null, city||null,
        tierId||null, creditLimit, paymentTerms, notes||null]);
    return created(res, customer, 'Customer created');
  } catch (err) { next(err); }
});

// ── GET /customers/:id ────────────────────────────────────────
router.get('/:id', hasPermission('customers:read'), async (req, res, next) => {
  try {
    const db = req.tenantDb;
    const [customer, invoiceSummary, recentInvoices] = await Promise.all([
      db.queryOne(`
        SELECT c.*, ct.name AS tier_name, ct.discount_pct, ct.credit_days
        FROM customers c LEFT JOIN customer_tiers ct ON ct.id=c.tier_id
        WHERE c.id=$1
      `, [req.params.id]),
      db.queryOne(`
        SELECT COUNT(*) AS total_invoices,
               COALESCE(SUM(grand_total),0) AS lifetime_sales,
               COALESCE(SUM(amount_due),0)  AS total_outstanding
        FROM invoices WHERE customer_id=$1 AND status NOT IN ('voided','draft')
      `, [req.params.id]),
      db.queryAll(`
        SELECT invoice_number, invoice_date, grand_total, amount_due, status, fbr_status
        FROM invoices WHERE customer_id=$1 AND status!='draft'
        ORDER BY invoice_date DESC LIMIT 5
      `, [req.params.id]),
    ]);
    if (!customer) return notFound(res, 'Customer');
    return ok(res, { ...customer, invoiceSummary, recentInvoices });
  } catch (err) { next(err); }
});

// ── PUT /customers/:id ────────────────────────────────────────
router.put('/:id', hasPermission('customers:update'), validate(customerSchema.partial()), async (req, res, next) => {
  const map = {
    name: 'name', nameUr:'name_ur', contactPerson:'contact_person',
    phone:'phone', whatsapp:'whatsapp', email:'email', cnic:'cnic',
    address:'address', city:'city', tierId:'tier_id',
    creditLimit:'credit_limit', paymentTerms:'payment_terms', notes:'notes',
  };
  const sets=[]; const params=[];
  for (const [jsKey, col] of Object.entries(map)) {
    if (req.body[jsKey] !== undefined) { params.push(req.body[jsKey]??null); sets.push(`${col}=$${params.length}`); }
  }
  if (!sets.length) return badRequest(res, 'No fields to update');
  sets.push('updated_at=NOW()');
  params.push(req.params.id);
  try {
    const c = await req.tenantDb.queryOne(
      `UPDATE customers SET ${sets.join(',')} WHERE id=$${params.length}`, params
    );
    if (!c) return notFound(res, 'Customer');
    return ok(res, c, 'Customer updated');
  } catch (err) { next(err); }
});

// ── GET /customers/:id/ledger ─────────────────────────────────
router.get('/:id/ledger', hasPermission('sales:read'), async (req, res, next) => {
  const { from, to } = req.query;
  try {
    const dateFilter = from && to
      ? `AND invoice_date BETWEEN $2 AND $3`
      : '';
    const params = [req.params.id, ...(from && to ? [from, to] : [])];

    const [entries, customer] = await Promise.all([
      req.tenantDb.queryAll(`
        SELECT 'invoice'   AS type,
               invoice_number AS ref,
               invoice_date   AS txn_date,
               grand_total    AS debit,
               0              AS credit,
               amount_due     AS balance_effect,
               status
        FROM invoices WHERE customer_id=$1 ${dateFilter} AND status!='draft'
        UNION ALL
        SELECT 'payment'   AS type,
               reference_no   AS ref,
               payment_date   AS txn_date,
               0              AS debit,
               amount          AS credit,
               -amount         AS balance_effect,
               payment_mode   AS status
        FROM invoice_payments ip
        JOIN invoices inv ON inv.id=ip.invoice_id
        WHERE inv.customer_id=$1 ${dateFilter.replace('invoice_date','payment_date')}
        ORDER BY txn_date ASC
      `, params),
      req.tenantDb.queryOne(
        `SELECT code, name, name_ur, current_balance FROM customers WHERE id=$1`,
        [req.params.id]
      ),
    ]);

    // Running balance
    let running = 0;
    const withBalance = entries.map(e => {
      running += parseFloat(e.debit) - parseFloat(e.credit);
      return { ...e, runningBalance: running };
    });

    return ok(res, { customer, entries: withBalance });
  } catch (err) { next(err); }
});

// ── POST /customers/:id/payment ───────────────────────────────
router.post('/:id/payment', hasPermission('sales:create'), validate(paymentSchema), async (req, res, next) => {
  const { amount, paymentMode, referenceNo, bankName, paymentDate, notes, invoiceId } = req.body;
  try {
    await req.tenantDb.transaction(async (txDb) => {
      // If linked to invoice, record as invoice payment
      if (invoiceId) {
        await txDb.execute(`
          INSERT INTO invoice_payments (invoice_id, amount, payment_mode, reference_no, bank_name, payment_date, notes, created_by)
          VALUES ($1,$2,$3,$4,$5,COALESCE($6,CURDATE()),$7,$8)
        `, [invoiceId, amount, paymentMode, referenceNo||null, bankName||null, paymentDate||null, notes||null, req.userId]);
        // Recalculate invoice totals via function
        await txDb.execute(`CALL recalc_invoice_totals($1)`, [invoiceId]);
      }

      // Update customer running balance
      await txDb.execute(
        `UPDATE customers SET current_balance=current_balance-$1, updated_at=NOW() WHERE id=$2`,
        [amount, req.params.id]
      );
    });
    return ok(res, null, `Payment of PKR ${amount} recorded`);
  } catch (err) { next(err); }
});

module.exports = router;
