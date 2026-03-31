'use strict';
// ================================================================
// src/routes/reports.js
// GET /reports/sales           — sales summary (daily/monthly)
// GET /reports/profit-loss     — P&L from GL accounts
// GET /reports/balance-sheet   — balance sheet snapshot
// GET /reports/products        — product-level sales analysis
// GET /reports/stock-aging     — slow-moving stock
// GET /reports/fbr-summary     — FBR transmission stats
// GET /reports/tax-summary     — GST collected by period
// ================================================================
const router = require('express').Router();
const { z }  = require('zod');
const { authenticate, hasPermission } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ok, badRequest } = require('../utils/response');

router.use(authenticate);
router.use(hasPermission('reports:read'));

const dateRangeQuery = z.object({
  from:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  groupBy:  z.enum(['day','month','category','product']).optional(),
  branchId: z.string().uuid().optional(),
});

// ── GET /reports/sales ────────────────────────────────────────
router.get('/sales', validate.query(dateRangeQuery), async (req, res, next) => {
  const { from, to, groupBy = 'month', branchId } = req.query;
  const fromDate = from || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const toDate   = to   || new Date().toISOString().slice(0, 10);

  try {
    const db = req.tenantDb;
    const branchCond = branchId ? `AND i.branch_id='${branchId}'` : '';

    const groupExpr = {
      day:   `DATE_FORMAT(i.invoice_date, '%Y-%m-%d')`,
      month: `TO_CHAR(DATE_FORMAT(i.invoice_date, '%Y-%m-01'), 'Mon YYYY')`,
    }[groupBy] || `TO_CHAR(DATE_FORMAT(i.invoice_date, '%Y-%m-01'), 'Mon YYYY')`;

    const [summary, byCategory, paymentModes, topCustomers] = await Promise.all([
      // Time-series summary
      db.queryAll(`
        SELECT ${groupExpr} AS period,
               COUNT(DISTINCT i.id)           AS invoices,
               COALESCE(SUM(i.grand_total),0) AS gross_sales,
               COALESCE(SUM(i.discount_amount),0) AS discounts,
               COALESCE(SUM(i.tax_amount),0)      AS tax,
               COALESCE(SUM(ii.cost_price * ii.qty),0) AS cogs,
               COALESCE(SUM(i.grand_total),0) - COALESCE(SUM(ii.cost_price * ii.qty),0) AS gross_profit
        FROM invoices i
        LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
        WHERE i.invoice_date BETWEEN $1 AND $2
          AND i.status NOT IN ('voided','draft') ${branchCond}
        GROUP BY 1 ORDER BY MIN(i.invoice_date) ASC
      `, [fromDate, toDate]),

      // By category
      db.queryAll(`
        SELECT c.name AS category, c.name_ur,
               COUNT(DISTINCT i.id)             AS invoices,
               SUM(ii.qty)                      AS qty_sold,
               SUM(ii.line_total)               AS revenue,
               SUM(ii.cost_price * ii.qty)      AS cogs,
               SUM(ii.line_total) - SUM(ii.cost_price * ii.qty) AS profit
        FROM invoice_items ii
        JOIN invoices i    ON i.id=ii.invoice_id
        JOIN products p    ON p.id=ii.product_id
        LEFT JOIN categories c ON c.id=p.category_id
        WHERE i.invoice_date BETWEEN $1 AND $2
          AND i.status NOT IN ('voided','draft') ${branchCond}
        GROUP BY c.name, c.name_ur ORDER BY revenue DESC
      `, [fromDate, toDate]),

      // Payment mode breakdown
      db.queryAll(`
        SELECT payment_mode,
               COUNT(*) AS count,
               SUM(grand_total) AS total
        FROM invoices
        WHERE invoice_date BETWEEN $1 AND $2
          AND status NOT IN ('voided','draft') ${branchCond}
        GROUP BY payment_mode ORDER BY total DESC
      `, [fromDate, toDate]),

      // Top 10 customers
      db.queryAll(`
        SELECT COALESCE(c.name, i.customer_name, 'Walk-in') AS customer,
               COUNT(DISTINCT i.id) AS invoices,
               SUM(i.grand_total)   AS sales,
               SUM(i.amount_due)    AS outstanding
        FROM invoices i
        LEFT JOIN customers c ON c.id=i.customer_id
        WHERE i.invoice_date BETWEEN $1 AND $2
          AND i.status NOT IN ('voided','draft') ${branchCond}
        GROUP BY 1 ORDER BY sales DESC LIMIT 10
      `, [fromDate, toDate]),
    ]);

    // Aggregate totals
    const totals = summary.reduce((acc, r) => ({
      invoices:     acc.invoices     + parseInt(r.invoices),
      gross_sales:  acc.gross_sales  + parseFloat(r.gross_sales),
      discounts:    acc.discounts    + parseFloat(r.discounts),
      tax:          acc.tax          + parseFloat(r.tax),
      cogs:         acc.cogs         + parseFloat(r.cogs),
      gross_profit: acc.gross_profit + parseFloat(r.gross_profit),
    }), { invoices:0, gross_sales:0, discounts:0, tax:0, cogs:0, gross_profit:0 });
    totals.margin_pct = totals.gross_sales > 0
      ? ((totals.gross_profit / totals.gross_sales) * 100).toFixed(2)
      : 0;

    return ok(res, { totals, summary, byCategory, paymentModes, topCustomers, from: fromDate, to: toDate });
  } catch (err) { next(err); }
});

// ── GET /reports/products ─────────────────────────────────────
router.get('/products', validate.query(dateRangeQuery.extend({
  limit:    z.coerce.number().int().min(1).max(200).default(50),
  category: z.string().uuid().optional(),
})), async (req, res, next) => {
  const { from, to, category, limit } = req.query;
  const fromDate = from || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const toDate   = to   || new Date().toISOString().slice(0, 10);
  const catCond  = category ? `AND p.category_id='${category}'` : '';
  try {
    const rows = await req.tenantDb.queryAll(`
      SELECT p.id, p.sku, p.name, p.name_ur, p.sale_price,
             c.name AS category,
             SUM(ii.qty)                   AS qty_sold,
             SUM(ii.line_total)            AS revenue,
             SUM(ii.cost_price * ii.qty)   AS cogs,
             SUM(ii.line_total) - SUM(ii.cost_price * ii.qty) AS profit,
             ROUND(((SUM(ii.line_total) - SUM(ii.cost_price * ii.qty)) / NULLIF(SUM(ii.line_total),0)) * 100, 2) AS margin_pct,
             MAX(i.invoice_date)           AS last_sold
      FROM invoice_items ii
      JOIN invoices i    ON i.id=ii.invoice_id AND i.status NOT IN ('voided','draft')
                         AND i.invoice_date BETWEEN $1 AND $2
      JOIN products p    ON p.id=ii.product_id ${catCond}
      LEFT JOIN categories c ON c.id=p.category_id
      GROUP BY p.id, p.sku, p.name, p.name_ur, p.sale_price, c.name
      ORDER BY revenue DESC LIMIT $3
    `, [fromDate, toDate, limit]);
    return ok(res, rows);
  } catch (err) { next(err); }
});

// ── GET /reports/profit-loss ──────────────────────────────────
router.get('/profit-loss', validate.query(validate.schemas.dateRange), async (req, res, next) => {
  const { from, to } = req.query;
  const fromDate = from || `${new Date().getFullYear()}-07-01`;   // Pakistan FY start
  const toDate   = to   || new Date().toISOString().slice(0, 10);
  try {
    const db = req.tenantDb;

    const [revenue, cogs, expenses] = await Promise.all([
      // Revenue accounts (4xxx)
      db.queryAll(`
        SELECT a.code, a.name, a.name_ur,
               COALESCE(SUM(vl.credit - vl.debit),0) AS amount
        FROM voucher_lines vl
        JOIN vouchers v ON v.id=vl.voucher_id AND v.status='posted'
                       AND v.voucher_date BETWEEN $1 AND $2
        JOIN accounts a ON a.id=vl.account_id
        JOIN account_types at ON at.id=a.account_type_id AND at.name='Revenue'
        GROUP BY a.code, a.name, a.name_ur HAVING SUM(vl.credit-vl.debit) != 0
        ORDER BY a.code
      `, [fromDate, toDate]),

      // COGS accounts (5xxx)
      db.queryAll(`
        SELECT a.code, a.name, a.name_ur,
               COALESCE(SUM(vl.debit - vl.credit),0) AS amount
        FROM voucher_lines vl
        JOIN vouchers v ON v.id=vl.voucher_id AND v.status='posted'
                       AND v.voucher_date BETWEEN $1 AND $2
        JOIN accounts a ON a.id=vl.account_id AND a.code LIKE '5%'
        GROUP BY a.code, a.name, a.name_ur HAVING SUM(vl.debit-vl.credit) != 0
        ORDER BY a.code
      `, [fromDate, toDate]),

      // Operating expense accounts (6xxx)
      db.queryAll(`
        SELECT a.code, a.name, a.name_ur,
               COALESCE(SUM(vl.debit - vl.credit),0) AS amount
        FROM voucher_lines vl
        JOIN vouchers v ON v.id=vl.voucher_id AND v.status='posted'
                       AND v.voucher_date BETWEEN $1 AND $2
        JOIN accounts a ON a.id=vl.account_id AND a.code LIKE '6%'
        GROUP BY a.code, a.name, a.name_ur HAVING SUM(vl.debit-vl.credit) != 0
        ORDER BY a.code
      `, [fromDate, toDate]),
    ]);

    const totalRevenue  = revenue.reduce((s, r) => s + parseFloat(r.amount), 0);
    const totalCOGS     = cogs.reduce((s, r) => s + parseFloat(r.amount), 0);
    const grossProfit   = totalRevenue - totalCOGS;
    const totalExpenses = expenses.reduce((s, r) => s + parseFloat(r.amount), 0);
    const netProfit     = grossProfit - totalExpenses;

    return ok(res, {
      period:       { from: fromDate, to: toDate },
      revenue:      { items: revenue, total: totalRevenue },
      cogs:         { items: cogs,    total: totalCOGS },
      grossProfit,
      grossMarginPct: totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : 0,
      expenses:     { items: expenses, total: totalExpenses },
      netProfit,
      netMarginPct: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0,
    });
  } catch (err) { next(err); }
});

// ── GET /reports/balance-sheet ────────────────────────────────
router.get('/balance-sheet', async (req, res, next) => {
  try {
    const db = req.tenantDb;
    const rows = await db.queryAll(`
      SELECT at.name AS account_type, at.normal_side,
             a.code, a.name, a.name_ur, a.level,
             a.current_balance
      FROM accounts a
      JOIN account_types at ON at.id=a.account_type_id
      WHERE a.is_posting=TRUE AND a.current_balance != 0
      ORDER BY at.sort_order, a.code
    `);

    const grouped = { Asset:{}, Liability:{}, Equity:{} };
    for (const r of rows) {
      if (!grouped[r.account_type]) continue;
      grouped[r.account_type][r.code] = r;
    }

    const totalAssets      = rows.filter(r=>r.account_type==='Asset').reduce((s,r)=>s+parseFloat(r.current_balance),0);
    const totalLiabilities = rows.filter(r=>r.account_type==='Liability').reduce((s,r)=>s+parseFloat(r.current_balance),0);
    const totalEquity      = rows.filter(r=>r.account_type==='Equity').reduce((s,r)=>s+parseFloat(r.current_balance),0);

    return ok(res, {
      asOf: new Date().toISOString().slice(0,10),
      assets:        { items: rows.filter(r=>r.account_type==='Asset'),      total: totalAssets },
      liabilities:   { items: rows.filter(r=>r.account_type==='Liability'),  total: totalLiabilities },
      equity:        { items: rows.filter(r=>r.account_type==='Equity'),     total: totalEquity },
      balanced:      Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
    });
  } catch (err) { next(err); }
});

// ── GET /reports/stock-aging ──────────────────────────────────
router.get('/stock-aging', async (req, res, next) => {
  try {
    const rows = await req.tenantDb.queryAll(`
      SELECT p.id, p.sku, p.name, p.name_ur, p.sale_price, p.cost_price,
             c.name AS category,
             sl.qty_on_hand, sl.qty_available,
             sl.qty_on_hand * p.cost_price AS stock_value,
             MAX(sm.created_at) AS last_movement,
             CURDATE() - MAX(sm.created_at) AS days_since_movement
      FROM stock_levels sl
      JOIN products p    ON p.id=sl.product_id AND p.is_active=TRUE
      LEFT JOIN categories c ON c.id=p.category_id
      LEFT JOIN stock_movements sm ON sm.product_id=p.id AND sm.movement_type='sale'
      WHERE sl.qty_on_hand > 0
      GROUP BY p.id, p.sku, p.name, p.name_ur, p.sale_price, p.cost_price, c.name,
               sl.qty_on_hand, sl.qty_available
      ORDER BY days_since_movement DESC NULLS FIRST
    `);

    const aged = {
      current:  rows.filter(r => !r.days_since_movement || r.days_since_movement <= 30),
      days30_60:rows.filter(r => r.days_since_movement > 30  && r.days_since_movement <= 60),
      days60_90:rows.filter(r => r.days_since_movement > 60  && r.days_since_movement <= 90),
      over90:   rows.filter(r => r.days_since_movement > 90),
    };

    return ok(res, aged);
  } catch (err) { next(err); }
});

// ── GET /reports/fbr-summary ──────────────────────────────────
router.get('/fbr-summary', hasPermission('reports:fbr'), validate.query(validate.schemas.dateRange), async (req, res, next) => {
  const { from, to } = req.query;
  const fromDate = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
  const toDate   = to   || new Date().toISOString().slice(0, 10);
  try {
    const [statusSummary, failedList, transmitted] = await Promise.all([
      req.tenantDb.queryAll(`
        SELECT i.fbr_status, COUNT(*) AS count, COALESCE(SUM(i.grand_total),0) AS total
        FROM invoices i
        WHERE i.invoice_date BETWEEN $1 AND $2 AND i.status!='voided'
        GROUP BY i.fbr_status
      `, [fromDate, toDate]),

      req.tenantDb.queryAll(`
        SELECT i.invoice_number, i.invoice_date, i.grand_total,
               ft.error_msg, ft.attempt_no, ft.created_at
        FROM invoices i
        JOIN fbr_transmissions ft ON ft.invoice_id=i.id AND ft.status='failed'
        WHERE i.invoice_date BETWEEN $1 AND $2
        ORDER BY ft.created_at DESC LIMIT 20
      `, [fromDate, toDate]),

      req.tenantDb.queryAll(`
        SELECT DATE(sent_at) AS day,
               COUNT(*) AS count, SUM(http_status=200) AS success
        FROM fbr_transmissions
        WHERE sent_at BETWEEN $1stamp AND $2stamp
        GROUP BY 1 ORDER BY 1
      `, [fromDate + ' 00:00', toDate + ' 23:59']),
    ]);

    return ok(res, { period: { from: fromDate, to: toDate }, statusSummary, failedList, transmitted });
  } catch (err) { next(err); }
});

// ── GET /reports/tax-summary ──────────────────────────────────
router.get('/tax-summary', hasPermission('reports:fbr'), validate.query(validate.schemas.dateRange), async (req, res, next) => {
  const { from, to } = req.query;
  const fromDate = from || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0,10);
  const toDate   = to   || new Date().toISOString().slice(0,10);
  try {
    const rows = await req.tenantDb.queryAll(`
      SELECT TO_CHAR(DATE_FORMAT(invoice_date, '%Y-%m-01'), 'Mon YYYY') AS month,
             COUNT(*) AS invoice_count,
             COALESCE(SUM(grand_total - tax_amount),0) AS taxable_sales,
             COALESCE(SUM(tax_amount),0) AS gst_collected,
             COALESCE(SUM(grand_total),0) AS gross_total
      FROM invoices
      WHERE invoice_date BETWEEN $1 AND $2
        AND is_taxable=TRUE AND status NOT IN ('voided','draft')
      GROUP BY DATE_FORMAT(invoice_date, '%Y-%m-01')
      ORDER BY MIN(invoice_date) ASC
    `, [fromDate, toDate]);

    const totals = rows.reduce((acc, r) => ({
      invoice_count:  acc.invoice_count  + parseInt(r.invoice_count),
      taxable_sales:  acc.taxable_sales  + parseFloat(r.taxable_sales),
      gst_collected:  acc.gst_collected  + parseFloat(r.gst_collected),
      gross_total:    acc.gross_total    + parseFloat(r.gross_total),
    }), { invoice_count:0, taxable_sales:0, gst_collected:0, gross_total:0 });

    return ok(res, { rows, totals, from: fromDate, to: toDate });
  } catch (err) { next(err); }
});

module.exports = router;
