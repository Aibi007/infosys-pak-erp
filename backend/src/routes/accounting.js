'use strict';
// ================================================================
// src/routes/accounting.js
// GET  /accounting/accounts          — chart of accounts
// POST /accounting/accounts          — add account
// GET  /accounting/vouchers          — list vouchers
// POST /accounting/vouchers          — create + post voucher
// GET  /accounting/vouchers/:id      — voucher detail
// POST /accounting/vouchers/:id/post — post draft voucher
// POST /accounting/vouchers/:id/reverse — reverse posted voucher
// GET  /accounting/ledger/:accountId — account ledger
// GET  /accounting/trial-balance     — trial balance
// GET  /accounting/periods           — fiscal periods
// POST /accounting/periods/:id/close — close period
// ================================================================
const router = require('express').Router();
const { z }  = require('zod');
const { authenticate, hasPermission } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ok, created, notFound, paginated, badRequest, unprocessable } = require('../utils/response');

router.use(authenticate);

// ── GET /accounting/accounts ──────────────────────────────────
router.get('/accounts', hasPermission('accounting:read'), async (req, res, next) => {
  const { type, posting } = req.query;
  const conds = []; const params = [];
  const p = v => { params.push(v); return `$${params.length}`; };
  if (type)    conds.push(`at.name LIKE ${p(type)}`);
  if (posting !== undefined) conds.push(`a.is_posting=${p(posting === 'true')}`);
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  try {
    const rows = await req.tenantDb.queryAll(`
      SELECT a.id, a.code, a.name, a.name_ur, a.level, a.is_posting,
             a.is_system, a.is_active, a.current_balance, a.opening_balance,
             a.parent_id, at.name AS account_type, at.normal_side
      FROM accounts a JOIN account_types at ON at.id=a.account_type_id
      ${where}
      ORDER BY a.code ASC
    `, params);

    // Build tree structure
    const byId = Object.fromEntries(rows.map(r => [r.id, { ...r, children: [] }]));
    const tree = [];
    for (const r of rows) {
      if (r.parent_id && byId[r.parent_id]) {
        byId[r.parent_id].children.push(byId[r.id]);
      } else {
        tree.push(byId[r.id]);
      }
    }
    return ok(res, tree);
  } catch (err) { next(err); }
});

// ── POST /accounting/accounts ─────────────────────────────────
router.post('/accounts', hasPermission('accounting:create'), validate(z.object({
  code:          z.string().min(2).max(20),
  name:          z.string().min(1).max(255),
  nameUr:        z.string().max(255).optional(),
  accountTypeId: z.string().uuid(),
  parentId:      z.string().uuid().optional().nullable(),
  isPosting:     z.boolean().default(true),
  description:   z.string().max(500).optional(),
  openingBalance:z.coerce.number().default(0),
})), async (req, res, next) => {
  const { code, name, nameUr, accountTypeId, parentId, isPosting, description, openingBalance } = req.body;
  try {
    const parent = parentId
      ? await req.tenantDb.queryOne(`SELECT level FROM accounts WHERE id=$1`, [parentId])
      : null;
    const level = parent ? parent.level + 1 : 1;

    const account = await req.tenantDb.queryOne(`
      INSERT INTO accounts (code, name, name_ur, account_type_id, parent_id, level, is_posting, description, opening_balance, current_balance)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
    `, [code, name, nameUr||null, accountTypeId, parentId||null, level, isPosting, description||null, openingBalance]);
    return created(res, account, 'Account created');
  } catch (err) { next(err); }
});

// ── GET /accounting/vouchers ──────────────────────────────────
router.get('/vouchers', hasPermission('accounting:read'), validate.query(
  validate.schemas.pagination.extend({
    type:   z.string().optional(),
    status: z.string().optional(),
    from:   z.string().optional(),
    to:     z.string().optional(),
  })
), async (req, res, next) => {
  const { page, limit, type, status, from, to } = req.query;
  const conds=[]; const params=[];
  const p = v => { params.push(v); return `$${params.length}`; };
  if (type)   conds.push(`vt.code=${p(type)}`);
  if (status) conds.push(`v.status=${p(status)}`);
  if (from)   conds.push(`v.voucher_date>=${p(from)}`);
  if (to)     conds.push(`v.voucher_date<=${p(to)}`);
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  try {
    const result = await req.tenantDb.paginate(`
      SELECT v.id, v.voucher_number, v.voucher_date, v.status,
             v.total_debit, v.narration, v.reference_type, v.created_at,
             vt.name AS voucher_type, vt.code AS voucher_code
      FROM vouchers v JOIN voucher_types vt ON vt.id=v.voucher_type_id
      ${where}
      ORDER BY v.voucher_date DESC, v.created_at DESC
    `, params, { page, limit });
    return paginated(res, result);
  } catch (err) { next(err); }
});

// ── POST /accounting/vouchers ─────────────────────────────────
const voucherLineSchema = z.object({
  accountId: z.string().uuid(),
  debit:     z.coerce.number().min(0).default(0),
  credit:    z.coerce.number().min(0).default(0),
  narration: z.string().max(300).optional(),
});

router.post('/vouchers', hasPermission('accounting:create'), validate(z.object({
  voucherTypeCode: z.enum(['CRV','CPV','BRV','BPV','JV']),
  voucherDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  narration:       z.string().min(3).max(500),
  narrationUr:     z.string().max(500).optional(),
  postImmediately: z.boolean().default(false),
  lines:           z.array(voucherLineSchema).min(2, 'At least 2 lines required'),
})), async (req, res, next) => {
  const { voucherTypeCode, voucherDate, narration, narrationUr, postImmediately, lines } = req.body;

  // Validate balance
  const totalDr = lines.reduce((s, l) => s + l.debit,  0);
  const totalCr = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDr - totalCr) > 0.01) {
    return unprocessable(res, `Voucher not balanced: DR=${totalDr.toFixed(2)} CR=${totalCr.toFixed(2)}`);
  }

  try {
    const voucher = await req.tenantDb.transaction(async (txDb) => {
      const period = await txDb.queryOne(
        `SELECT id FROM fiscal_periods WHERE status='open' AND $1 BETWEEN start_date AND end_date LIMIT 1`,
        [voucherDate || new Date().toISOString().slice(0,10)]
      );
      if (!period) throw Object.assign(new Error('No open fiscal period for this date'), { statusCode: 422 });

      const vt = await txDb.queryOne(`SELECT id, prefix FROM voucher_types WHERE code=$1`, [voucherTypeCode]);
      if (!vt) throw Object.assign(new Error('Voucher type not found'), { statusCode: 400 });

      const vNo = `${vt.prefix}-${Date.now().toString().slice(-6)}`;
      const v = await txDb.queryOne(`
        INSERT INTO vouchers
          (voucher_type_id, voucher_number, voucher_date, period_id,
           status, narration, narration_ur, total_debit, total_credit, created_by)
        VALUES ($1,$2,COALESCE($3,CURDATE()),$4,'draft',$5,$6,$7,$7,$8)
      `, [vt.id, vNo, voucherDate||null, period.id, narration, narrationUr||null, totalDr, req.userId]);

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await txDb.execute(`
          INSERT INTO voucher_lines (voucher_id, account_id, debit, credit, narration, sort_order)
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [v.id, l.accountId, l.debit, l.credit, l.narration||null, i]);
      }

      if (postImmediately) {
        await txDb.execute(`CALL post_voucher($1,$2)`, [v.id, req.userId]);
      }

      return v;
    });
    return created(res, voucher, `Voucher ${voucher.voucher_number} ${postImmediately ? 'posted' : 'saved as draft'}`);
  } catch (err) { next(err); }
});

// ── GET /accounting/vouchers/:id ──────────────────────────────
router.get('/vouchers/:id', hasPermission('accounting:read'), async (req, res, next) => {
  try {
    const db = req.tenantDb;
    const [voucher, lines] = await Promise.all([
      db.queryOne(`
        SELECT v.*, vt.name AS voucher_type, vt.code AS voucher_code
        FROM vouchers v JOIN voucher_types vt ON vt.id=v.voucher_type_id WHERE v.id=$1
      `, [req.params.id]),
      db.queryAll(`
        SELECT vl.*, a.code AS account_code, a.name AS account_name, a.name_ur AS account_name_ur
        FROM voucher_lines vl JOIN accounts a ON a.id=vl.account_id
        WHERE vl.voucher_id=$1 ORDER BY vl.sort_order
      `, [req.params.id]),
    ]);
    if (!voucher) return notFound(res, 'Voucher');
    return ok(res, { ...voucher, lines });
  } catch (err) { next(err); }
});

// ── POST /accounting/vouchers/:id/post ───────────────────────
router.post('/vouchers/:id/post', hasPermission('accounting:create'), async (req, res, next) => {
  try {
    const v = await req.tenantDb.queryOne(`SELECT id, status FROM vouchers WHERE id=$1`, [req.params.id]);
    if (!v)               return notFound(res, 'Voucher');
    if (v.status !== 'draft') return badRequest(res, `Voucher is already ${v.status}`);
    await req.tenantDb.execute(`CALL post_voucher($1,$2)`, [req.params.id, req.userId]);
    return ok(res, null, 'Voucher posted to general ledger');
  } catch (err) { next(err); }
});

// ── POST /accounting/vouchers/:id/reverse ────────────────────
router.post('/vouchers/:id/reverse', hasPermission('accounting:create'), async (req, res, next) => {
  const { reason } = req.body;
  if (!reason) return badRequest(res, 'Reversal reason required');
  try {
    await req.tenantDb.transaction(async (txDb) => {
      const v = await txDb.queryOne(`SELECT * FROM vouchers WHERE id=$1 AND status='posted'`, [req.params.id]);
      if (!v) throw Object.assign(new Error('Posted voucher not found'), { statusCode: 404 });

      const period = await txDb.queryOne(`SELECT id FROM fiscal_periods WHERE status='open' LIMIT 1`);
      if (!period) throw Object.assign(new Error('No open period for reversal'), { statusCode: 422 });

      const lines = await txDb.queryAll(`SELECT * FROM voucher_lines WHERE voucher_id=$1`, [v.id]);
      const revNo = `REV-${v.voucher_number.slice(-8)}`;

      const rev = await txDb.queryOne(`
        INSERT INTO vouchers
          (voucher_type_id, voucher_number, voucher_date, period_id,
           status, narration, total_debit, total_credit, reversal_of, created_by)
        VALUES ($1,$2,CURDATE(),$3,'draft',
                CONCAT('REVERSAL: ', $4),$5,$5,$6,$7)
      `, [v.voucher_type_id, revNo, period.id, reason, v.total_debit, v.id, req.userId]);

      // Swap DR and CR
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await txDb.execute(`
          INSERT INTO voucher_lines (voucher_id, account_id, debit, credit, narration, sort_order)
          VALUES ($1,$2,$3,$4,'Reversal',$5)
        `, [rev.id, l.account_id, l.credit, l.debit, i]);
      }

      await txDb.execute(`CALL post_voucher($1,$2)`, [rev.id, req.userId]);
      await txDb.execute(
        `UPDATE vouchers SET status='reversed', reversed_by=$1, reversed_at=NOW() WHERE id=$2`,
        [req.userId, v.id]
      );
    });
    return ok(res, null, 'Voucher reversed');
  } catch (err) { next(err); }
});

// ── GET /accounting/ledger/:accountId ────────────────────────
router.get('/ledger/:accountId', hasPermission('accounting:read'), validate.query(
  validate.schemas.dateRange.extend({
    page:  z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(50),
  })
), async (req, res, next) => {
  const { from, to, page, limit } = req.query;
  const conds = [`vl.account_id=$1`]; const params = [req.params.accountId];
  const p = v => { params.push(v); return `$${params.length}`; };
  if (from) conds.push(`v.voucher_date>=${p(from)}`);
  if (to)   conds.push(`v.voucher_date<=${p(to)}`);
  conds.push(`v.status='posted'`);
  try {
    const [account, result] = await Promise.all([
      req.tenantDb.queryOne(`SELECT id, code, name, name_ur, current_balance FROM accounts WHERE id=$1`, [req.params.accountId]),
      req.tenantDb.paginate(`
        SELECT v.voucher_number, v.voucher_date, v.narration,
               vl.debit, vl.credit, vl.narration AS line_narration,
               vt.code AS voucher_type
        FROM voucher_lines vl
        JOIN vouchers v      ON v.id=vl.voucher_id
        JOIN voucher_types vt ON vt.id=v.voucher_type_id
        WHERE ${conds.join(' AND ')}
        ORDER BY v.voucher_date ASC, v.created_at ASC
      `, params, { page, limit }),
    ]);
    if (!account) return notFound(res, 'Account');

    // Add running balance
    let running = 0;
    result.data = result.data.map(row => {
      running += parseFloat(row.debit) - parseFloat(row.credit);
      return { ...row, running_balance: running };
    });

    return ok(res, { account, ...result });
  } catch (err) { next(err); }
});

// ── GET /accounting/trial-balance ─────────────────────────────
router.get('/trial-balance', hasPermission('accounting:read'), async (req, res, next) => {
  try {
    const rows = await req.tenantDb.queryAll(`SELECT * FROM v_trial_balance`);
    const totalDr = rows.reduce((s, r) => s + parseFloat(r.debit_balance  || 0), 0);
    const totalCr = rows.reduce((s, r) => s + parseFloat(r.credit_balance || 0), 0);
    return ok(res, { rows, totals: { debit: totalDr, credit: totalCr, balanced: Math.abs(totalDr - totalCr) < 0.01 } });
  } catch (err) { next(err); }
});

// ── GET /accounting/periods ───────────────────────────────────
router.get('/periods', hasPermission('accounting:read'), async (req, res, next) => {
  try {
    const rows = await req.tenantDb.queryAll(`SELECT * FROM fiscal_periods ORDER BY start_date DESC`);
    return ok(res, rows);
  } catch (err) { next(err); }
});

// ── POST /accounting/periods/:id/close ───────────────────────
router.post('/periods/:id/close', hasPermission('accounting:close'), async (req, res, next) => {
  try {
    const period = await req.tenantDb.queryOne(`SELECT * FROM fiscal_periods WHERE id=$1`, [req.params.id]);
    if (!period)               return notFound(res, 'Fiscal period');
    if (period.status !== 'open') return badRequest(res, `Period is already ${period.status}`);

    // Check for unposted vouchers in this period
    const unposted = await req.tenantDb.queryOne(
      `SELECT COUNT(*) AS n FROM vouchers WHERE period_id=$1 AND status='draft'`, [req.params.id]
    );
    if (parseInt(unposted.n) > 0) {
      return unprocessable(res, `Cannot close period: ${unposted.n} draft voucher(s) pending. Post or delete them first.`);
    }

    await req.tenantDb.execute(
      `UPDATE fiscal_periods SET status='closed', closed_at=NOW(), closed_by=$1 WHERE id=$2`,
      [req.userId, req.params.id]
    );
    return ok(res, null, 'Fiscal period closed');
  } catch (err) { next(err); }
});

module.exports = router;
