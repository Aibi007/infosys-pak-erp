'use strict';
// ================================================================
// src/routes/dashboard.js
// GET /api/v1/dashboard        — current-day KPIs + recent invoices
// GET /api/v1/dashboard/trends — 6-month sales trend
// ================================================================
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { ok }           = require('../utils/response');

router.use(authenticate);

// ── GET /dashboard ────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  const branchId = req.query.branchId || null;
  try {
    const db = req.tenantDb;

    // Run all KPI queries in parallel
    const [
      salesRow, invoiceRow, receivablesRow, payablesRow,
      fbrRow,   lowStockRow, recentInvoices, topProducts,
    ] = await Promise.all([

      // Today's sales
      db.queryOne(`
        SELECT COALESCE(SUM(grand_total),0) AS total, COUNT(*) AS count
        FROM invoices
        WHERE invoice_date = CURRENT_DATE
          AND status NOT IN ('voided','draft')
          ${branchId ? 'AND branch_id = $1' : ''}
      `, branchId ? [branchId] : []),

      // This month invoices
      db.queryOne(`
        SELECT COALESCE(SUM(grand_total),0) AS month_sales,
               COALESCE(SUM(grand_total - amount_paid),0) AS month_outstanding
        FROM invoices
        WHERE DATE_TRUNC('month', invoice_date) = DATE_TRUNC('month', CURRENT_DATE)
          AND status NOT IN ('voided','draft')
      `, []),

      // Receivables
      db.queryOne(`SELECT COALESCE(SUM(current_balance),0) AS total FROM customers WHERE status='active'`, []),
      db.queryOne(`SELECT COALESCE(SUM(current_balance),0) AS total FROM vendors  WHERE status='active'`, []),

      // FBR failures
      db.queryOne(`SELECT COUNT(*) AS count FROM invoices WHERE fbr_status='failed'`, []),

      // Low stock
      db.queryOne(`
        SELECT COUNT(*) AS count
        FROM stock_levels sl
        JOIN products p ON p.id = sl.product_id
        WHERE sl.qty_available <= p.reorder_level AND p.is_active = TRUE
      `, []),

      // Recent invoices (last 8)
      db.queryAll(`
        SELECT i.invoice_number, i.invoice_date, i.grand_total,
               i.amount_due, i.status, i.fbr_status,
               COALESCE(c.name, i.customer_name, 'Walk-in') AS customer_name
        FROM invoices i
        LEFT JOIN customers c ON c.id = i.customer_id
        WHERE i.status NOT IN ('draft')
        ORDER BY i.created_at DESC LIMIT 8
      `, []),

      // Top 5 products this month
      db.queryAll(`
        SELECT p.name, p.sku,
               SUM(ii.qty) AS qty_sold,
               SUM(ii.line_total) AS revenue
        FROM invoice_items ii
        JOIN invoices inv ON inv.id = ii.invoice_id
        JOIN products p   ON p.id  = ii.product_id
        WHERE DATE_TRUNC('month', inv.invoice_date) = DATE_TRUNC('month', CURRENT_DATE)
          AND inv.status NOT IN ('voided','draft')
        GROUP BY p.id, p.name, p.sku
        ORDER BY revenue DESC LIMIT 5
      `, []),
    ]);

    return ok(res, {
      kpis: {
        todaySales:     parseFloat(salesRow.total),
        todayInvoices:  parseInt(salesRow.count),
        monthSales:     parseFloat(invoiceRow.month_sales),
        monthOutstanding: parseFloat(invoiceRow.month_outstanding),
        receivables:    parseFloat(receivablesRow.total),
        payables:       parseFloat(payablesRow.total),
        fbrFailed:      parseInt(fbrRow.count),
        lowStockItems:  parseInt(lowStockRow.count),
      },
      recentInvoices,
      topProducts,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});

// ── GET /dashboard/trends ─────────────────────────────────────
router.get('/trends', async (req, res, next) => {
  try {
    const db = req.tenantDb;

    const [monthlySales, dailySales, deptPayroll] = await Promise.all([
      // 6-month sales trend
      db.queryAll(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', invoice_date), 'Mon YYYY') AS month,
          DATE_TRUNC('month', invoice_date) AS month_date,
          COALESCE(SUM(grand_total),0)                           AS sales,
          COALESCE(SUM(grand_total - amount_paid),0)             AS outstanding,
          COUNT(*)                                               AS invoices
        FROM invoices
        WHERE invoice_date >= CURRENT_DATE - INTERVAL '6 months'
          AND status NOT IN ('voided','draft')
        GROUP BY DATE_TRUNC('month', invoice_date)
        ORDER BY month_date ASC
      `, []),

      // Last 30 days daily
      db.queryAll(`
        SELECT
          invoice_date AS day,
          TO_CHAR(invoice_date, 'DD Mon') AS label,
          COALESCE(SUM(grand_total),0)    AS sales,
          COUNT(*)                        AS invoices
        FROM invoices
        WHERE invoice_date >= CURRENT_DATE - 29
          AND status NOT IN ('voided','draft')
        GROUP BY invoice_date
        ORDER BY invoice_date ASC
      `, []),

      // Payroll by department
      db.queryAll(`
        SELECT d.name AS department, SUM(pd.net_pay) AS total_payroll
        FROM payroll_details pd
        JOIN employees e ON e.id = pd.employee_id
        JOIN departments d ON d.id = e.department_id
        JOIN payroll_runs pr ON pr.id = pd.payroll_run_id
        WHERE pr.year = EXTRACT(YEAR FROM CURRENT_DATE)
          AND pr.month = EXTRACT(MONTH FROM CURRENT_DATE)
        GROUP BY d.name
        ORDER BY total_payroll DESC
      `, []),
    ]);

    return ok(res, { monthlySales, dailySales, deptPayroll });
  } catch (err) { next(err); }
});

module.exports = router;
