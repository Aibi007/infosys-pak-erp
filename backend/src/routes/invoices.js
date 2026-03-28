'use strict';
// ================================================================
// src/routes/invoices.js
// GET  /invoices              — paginated list
// POST /invoices              — create: items → stock → GL voucher → FBR queue
// GET  /invoices/:id          — detail with items + payments
// POST /invoices/:id/payments — add payment to invoice
// POST /invoices/:id/void     — void invoice + reverse stock
// GET  /invoices/:id/print    — print-ready JSON for receipt
// ================================================================
const router = require('express').Router();
const { z }  = require('zod');
const { authenticate, hasPermission } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ok, created, notFound, paginated, badRequest, unprocessable } = require('../utils/response');
const logger = require('../utils/logger');

router.use(authenticate);

// ── Schemas ───────────────────────────────────────────────────
const invoiceItemSchema = z.object({
  productId:    z.string().uuid(),
  variantId:    z.string().uuid().optional().nullable(),
  qty:          z.coerce.number().positive(),
  unitPrice:    z.coerce.number().min(0),
  discountPct:  z.coerce.number().min(0).max(100).default(0),
  taxRate:      z.coerce.number().min(0).max(100).default(0),
});

const createInvoiceSchema = z.object({
  customerId:   z.string().uuid().optional().nullable(),
  customerName: z.string().max(255).optional(),  // walk-in name
  customerPhone:z.string().max(20).optional(),
  invoiceDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  paymentMode:  z.enum(['cash','bank_transfer','cheque','credit','split','easypaisa','jazzcash']).default('cash'),
  discountPct:  z.coerce.number().min(0).max(100).default(0),
  amountPaid:   z.coerce.number().min(0).default(0),
  notes:        z.string().max(1000).optional(),
  items:        z.array(invoiceItemSchema).min(1, 'At least one item required'),
  warehouseId:  z.string().uuid().optional(),
  posSessionId: z.string().uuid().optional(),
});

const paymentSchema = z.object({
  amount:      z.coerce.number().positive(),
  paymentMode: z.enum(['cash','hbl_transfer','mcb_transfer','cheque','easypaisa','jazzcash','other']),
  referenceNo: z.string().max(100).optional(),
  bankName:    z.string().max(100).optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:       z.string().max(500).optional(),
});

// ── GET /invoices ─────────────────────────────────────────────
router.get('/', hasPermission('sales:read'), validate.query(
  validate.schemas.pagination.extend({
    status:     z.string().optional(),
    fbrStatus:  z.string().optional(),
    customerId: z.string().uuid().optional(),
    from:       z.string().optional(),
    to:         z.string().optional(),
  })
), async (req, res, next) => {
  const { page, limit, search, status, fbrStatus, customerId, from, to } = req.query;
  const conds=[]; const params=[];
  const p = (v) => { params.push(v); return `$${params.length}`; };

  if (status)     conds.push(`i.status=${p(status)}`);
  if (fbrStatus)  conds.push(`i.fbr_status=${p(fbrStatus)}`);
  if (customerId) conds.push(`i.customer_id=${p(customerId)}`);
  if (from)       conds.push(`i.invoice_date>=${p(from)}::date`);
  if (to)         conds.push(`i.invoice_date<=${p(to)}::date`);
  if (search)     conds.push(`(i.invoice_number ILIKE ${p('%'+search+'%')} OR c.name ILIKE $${params.length})`);

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  try {
    const result = await req.tenantDb.paginate(`
      SELECT i.id, i.invoice_number, i.invoice_date, i.due_date,
             i.grand_total, i.amount_paid, i.amount_due,
             i.status, i.payment_mode, i.fbr_status, i.fbr_invoice_no,
             COALESCE(c.name, i.customer_name, 'Walk-in') AS customer_name,
             c.phone AS customer_phone
      FROM invoices i
      LEFT JOIN customers c ON c.id=i.customer_id
      ${where}
      ORDER BY i.invoice_date DESC, i.created_at DESC
    `, params, { page, limit });
    return paginated(res, result);
  } catch (err) { next(err); }
});

// ── GET /invoices/:id ─────────────────────────────────────────
router.get('/:id', hasPermission('sales:read'), async (req, res, next) => {
  try {
    const db = req.tenantDb;
    const [invoice, items, payments] = await Promise.all([
      db.queryOne(`
        SELECT i.*, COALESCE(c.name, i.customer_name, 'Walk-in') AS customer_name,
               c.phone AS customer_phone, c.address AS customer_address
        FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id
        WHERE i.id=$1
      `, [req.params.id]),
      db.queryAll(
        `SELECT * FROM invoice_items WHERE invoice_id=$1 ORDER BY sort_order`,
        [req.params.id]
      ),
      db.queryAll(
        `SELECT * FROM invoice_payments WHERE invoice_id=$1 ORDER BY created_at`,
        [req.params.id]
      ),
    ]);
    if (!invoice) return notFound(res, 'Invoice');
    return ok(res, { ...invoice, items, payments });
  } catch (err) { next(err); }
});

// ── POST /invoices — THE MAIN ONE ─────────────────────────────
// Creates invoice + items + deducts stock + posts GL + queues FBR
router.post('/', hasPermission('sales:create'), validate(createInvoiceSchema), async (req, res, next) => {
  const {
    customerId, customerName, customerPhone,
    invoiceDate, dueDate, paymentMode,
    discountPct, amountPaid, notes, items, warehouseId, posSessionId,
  } = req.body;

  try {
    const result = await req.tenantDb.transaction(async (txDb) => {

      // 1. Resolve warehouse
      const wh = warehouseId
        ? await txDb.queryOne(`SELECT id FROM warehouses WHERE id=$1`, [warehouseId])
        : await txDb.queryOne(`SELECT id FROM warehouses WHERE is_default=TRUE LIMIT 1`);
      if (!wh) throw Object.assign(new Error('No default warehouse found'), { statusCode: 400 });

      // 2. Resolve fiscal period
      const period = await txDb.queryOne(
        `SELECT id FROM fiscal_periods WHERE status='open'
         AND $1::date BETWEEN start_date AND end_date LIMIT 1`,
        [invoiceDate || new Date().toISOString().slice(0, 10)]
      );
      if (!period) throw Object.assign(new Error('No open fiscal period for this date'), { statusCode: 422 });

      // 3. Validate + enrich each item
      let subtotal = 0;
      let totalTax = 0;
      const enrichedItems = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // Load product snapshot
        const product = await txDb.queryOne(
          `SELECT id, name, sku, cost_price, sale_price, tax_rate FROM products WHERE id=$1 AND is_active=TRUE`,
          [item.productId]
        );
        if (!product) throw Object.assign(new Error(`Product ${item.productId} not found`), { statusCode: 422 });

        // Check stock availability
        const stockRow = await txDb.queryOne(`
          SELECT qty_available FROM stock_levels
          WHERE warehouse_id=$1 AND product_id=$2
            AND (variant_id=$3 OR (variant_id IS NULL AND $3::uuid IS NULL))
        `, [wh.id, item.productId, item.variantId || null]);

        const available = parseFloat(stockRow?.qty_available || 0);
        if (available < item.qty) {
          throw Object.assign(
            new Error(`Insufficient stock for ${product.name}: available ${available}, requested ${item.qty}`),
            { statusCode: 422 }
          );
        }

        // Load variant snapshot
        let variantLabel = null;
        if (item.variantId) {
          const variant = await txDb.queryOne(
            `SELECT sku, attributes FROM product_variants WHERE id=$1`, [item.variantId]
          );
          if (variant) {
            variantLabel = Object.values(variant.attributes).join(' / ');
          }
        }

        // Line calculation
        const discAmt  = (item.unitPrice * item.qty) * (item.discountPct / 100);
        const taxable  = (item.unitPrice * item.qty) - discAmt;
        const taxAmt   = taxable * (item.taxRate / 100);
        const lineTotal= taxable + taxAmt;

        subtotal += item.unitPrice * item.qty;
        totalTax += taxAmt;

        enrichedItems.push({
          ...item, product, variantLabel, discAmt, taxAmt, lineTotal,
          sortOrder: i,
        });
      }

      // 4. Header totals
      const headerDisc  = subtotal * (discountPct / 100);
      const grandTotal  = subtotal - headerDisc + totalTax;

      // 5. Insert invoice header
      const daysCredit = customerId
        ? (await txDb.queryOne(`SELECT payment_terms FROM customers WHERE id=$1`, [customerId]))?.payment_terms || 0
        : 0;
      const dueDateResolved = dueDate || (daysCredit > 0
        ? new Date(Date.now() + daysCredit * 86400000).toISOString().slice(0,10)
        : null);

      const invoice = await txDb.queryOne(`
        INSERT INTO invoices
          (customer_id, customer_name, customer_phone, invoice_date, due_date,
           payment_mode, subtotal, discount_pct, discount_amount, tax_amount,
           grand_total, amount_paid, status, fbr_status, notes, cashier_id, pos_session_id)
        VALUES ($1,$2,$3,COALESCE($4::date,CURRENT_DATE),$5::date,
                $6,$7,$8,$9,$10,$11,$12,
                CASE WHEN $12>=$11 THEN 'paid'
                     WHEN $12>0    THEN 'partially_paid'
                     ELSE 'confirmed' END,
                'pending',$13,$14,$15)
        RETURNING id, invoice_number, grand_total, amount_due, status, fbr_status
      `, [
        customerId||null, customerName||null, customerPhone||null,
        invoiceDate||null, dueDateResolved,
        paymentMode, subtotal, discountPct, headerDisc, totalTax,
        grandTotal, amountPaid,
        notes||null, req.userId, posSessionId||null,
      ]);

      // 6. Insert invoice items + deduct stock
      for (const item of enrichedItems) {
        // Insert line
        await txDb.execute(`
          INSERT INTO invoice_items
            (invoice_id, product_id, variant_id, product_name, variant_label, sku,
             qty, unit_price, discount_pct, discount_amount, tax_rate, tax_amount,
             line_total, cost_price, sort_order)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        `, [
          invoice.id, item.productId, item.variantId||null,
          item.product.name, item.variantLabel, item.product.sku,
          item.qty, item.unitPrice, item.discountPct, item.discAmt,
          item.taxRate, item.taxAmt, item.lineTotal, item.product.cost_price,
          item.sortOrder,
        ]);

        // Deduct stock
        const beforeRow = await txDb.queryOne(`
          UPDATE stock_levels
          SET qty_on_hand=qty_on_hand-$1, updated_at=NOW()
          WHERE warehouse_id=$2 AND product_id=$3
            AND (variant_id=$4 OR (variant_id IS NULL AND $4::uuid IS NULL))
          RETURNING qty_on_hand+$1 AS before_qty, qty_on_hand AS after_qty
        `, [item.qty, wh.id, item.productId, item.variantId||null]);

        // Record movement
        await txDb.execute(`
          INSERT INTO stock_movements
            (warehouse_id, product_id, variant_id, movement_type, reference_type, reference_id,
             qty, qty_before, qty_after, unit_cost, created_by)
          VALUES ($1,$2,$3,'sale','invoice',$4,$5,$6,$7,$8,$9)
        `, [
          wh.id, item.productId, item.variantId||null,
          invoice.id, item.qty,
          parseFloat(beforeRow?.before_qty||0),
          parseFloat(beforeRow?.after_qty||0),
          item.product.cost_price, req.userId,
        ]);
      }

      // 7. Record opening payment if any
      if (amountPaid > 0) {
        await txDb.execute(`
          INSERT INTO invoice_payments (invoice_id, amount, payment_mode, created_by)
          VALUES ($1,$2,$3,$4)
        `, [invoice.id, amountPaid, paymentMode, req.userId]);
      }

      // 8. Post GL voucher (Sales Voucher)
      // DR: Cash/Bank/Receivable | CR: Sales Revenue | CR: Tax Payable
      const glVoucher = await txDb.queryOne(`
        INSERT INTO vouchers (voucher_type_id, voucher_number, voucher_date, period_id,
          status, narration, reference_type, reference_id, total_debit, total_credit, created_by)
        SELECT id, 'SV-'||nextval('invoice_number_seq'), COALESCE($1::date,CURRENT_DATE), $2,
               'posted', 'Sales Invoice '||$3, 'invoice', $4, $5, $5, $6
        FROM voucher_types WHERE code='SV'
        RETURNING id
      `, [invoiceDate||null, period.id, invoice.invoice_number, invoice.id, grandTotal, req.userId]);

      if (glVoucher) {
        // CR Sales Revenue (4001)
        await txDb.execute(`
          INSERT INTO voucher_lines (voucher_id, account_id, debit, credit, narration)
          SELECT $1, id, 0, $2, 'Sales' FROM accounts WHERE code='4001'
        `, [glVoucher.id, grandTotal - totalTax]);

        // CR Tax Payable (2010) — if any
        if (totalTax > 0) {
          await txDb.execute(`
            INSERT INTO voucher_lines (voucher_id, account_id, debit, credit, narration)
            SELECT $1, id, 0, $2, 'GST' FROM accounts WHERE code='2010'
          `, [glVoucher.id, totalTax]);
        }

        // DR Cash (1001) or Trade Receivable (1101)
        const drAccount = ['cash','easypaisa','jazzcash'].includes(paymentMode) ? '1001' : '1101';
        await txDb.execute(`
          INSERT INTO voucher_lines (voucher_id, account_id, debit, credit, narration)
          SELECT $1, id, $2, 0, 'Receipt' FROM accounts WHERE code=$3
        `, [glVoucher.id, grandTotal, drAccount]);
      }

      // 9. Update customer balance + stats
      if (customerId) {
        await txDb.execute(`
          UPDATE customers
          SET current_balance = current_balance + $1 - $2,
              total_sales     = total_sales + $1,
              last_invoice_at = NOW(),
              updated_at      = NOW()
          WHERE id=$3
        `, [grandTotal, amountPaid, customerId]);
      }

      // 10. Queue FBR transmission
      await txDb.execute(`
        INSERT INTO fbr_transmissions (invoice_id, status) VALUES ($1,'pending')
      `, [invoice.id]);

      logger.info('Invoice created', {
        invoiceId: invoice.id,
        invoiceNo: invoice.invoice_number,
        total:     grandTotal,
        userId:    req.userId,
        tenantSlug:req.tenantSlug,
      });

      return invoice;
    });

    return created(res, result, `Invoice ${result.invoice_number} created`);
  } catch (err) { next(err); }
});

// ── POST /invoices/:id/payments ───────────────────────────────
router.post('/:id/payments', hasPermission('sales:create'), validate(paymentSchema), async (req, res, next) => {
  const { amount, paymentMode, referenceNo, bankName, paymentDate, notes } = req.body;
  try {
    await req.tenantDb.transaction(async (txDb) => {
      const invoice = await txDb.queryOne(
        `SELECT id, customer_id, grand_total, amount_paid FROM invoices WHERE id=$1 AND status!='voided'`,
        [req.params.id]
      );
      if (!invoice) throw Object.assign(new Error('Invoice not found or voided'), { statusCode: 404 });
      if (parseFloat(invoice.amount_paid) + amount > parseFloat(invoice.grand_total) * 1.001) {
        throw Object.assign(new Error('Payment exceeds invoice total'), { statusCode: 422 });
      }

      await txDb.execute(`
        INSERT INTO invoice_payments (invoice_id, amount, payment_mode, reference_no, bank_name, payment_date, notes, created_by)
        VALUES ($1,$2,$3,$4,$5,COALESCE($6::date,CURRENT_DATE),$7,$8)
      `, [req.params.id, amount, paymentMode, referenceNo||null, bankName||null, paymentDate||null, notes||null, req.userId]);

      await txDb.execute(`SELECT recalc_invoice_totals($1)`, [req.params.id]);

      if (invoice.customer_id) {
        await txDb.execute(
          `UPDATE customers SET current_balance=current_balance-$1 WHERE id=$2`,
          [amount, invoice.customer_id]
        );
      }
    });
    return ok(res, null, 'Payment recorded');
  } catch (err) { next(err); }
});

// ── POST /invoices/:id/void ───────────────────────────────────
router.post('/:id/void', hasPermission('sales:delete'), async (req, res, next) => {
  const { reason } = req.body;
  if (!reason) return badRequest(res, 'Void reason is required');
  try {
    await req.tenantDb.transaction(async (txDb) => {
      const invoice = await txDb.queryOne(
        `SELECT * FROM invoices WHERE id=$1 AND status NOT IN ('voided','draft')`,
        [req.params.id]
      );
      if (!invoice) return notFound(res, 'Invoice');

      // Reverse stock
      const items = await txDb.queryAll(
        `SELECT product_id, variant_id, qty FROM invoice_items WHERE invoice_id=$1`,
        [req.params.id]
      );
      const wh = await txDb.queryOne(`SELECT id FROM warehouses WHERE is_default=TRUE LIMIT 1`);
      for (const item of items) {
        await txDb.execute(`
          UPDATE stock_levels SET qty_on_hand=qty_on_hand+$1
          WHERE warehouse_id=$2 AND product_id=$3
            AND (variant_id=$4 OR (variant_id IS NULL AND $4::uuid IS NULL))
        `, [item.qty, wh.id, item.product_id, item.variant_id||null]);
      }

      // Mark voided
      await txDb.execute(`
        UPDATE invoices SET status='voided', voided_at=NOW(), voided_by=$1, void_reason=$2
        WHERE id=$3
      `, [req.userId, reason, req.params.id]);

      // Reverse customer balance
      if (invoice.customer_id) {
        await txDb.execute(`
          UPDATE customers SET current_balance=current_balance-$1 WHERE id=$2
        `, [invoice.amount_due, invoice.customer_id]);
      }
    });
    return ok(res, null, 'Invoice voided');
  } catch (err) { next(err); }
});

// ── GET /invoices/:id/print ───────────────────────────────────
router.get('/:id/print', hasPermission('sales:read'), async (req, res, next) => {
  try {
    const db = req.tenantDb;
    const [invoice, items, company, fbr] = await Promise.all([
      db.queryOne(`
        SELECT i.*, COALESCE(c.name, i.customer_name) AS customer_name,
               c.phone, c.address, c.cnic, c.ntn
        FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id WHERE i.id=$1
      `, [req.params.id]),
      db.queryAll(`SELECT * FROM invoice_items WHERE invoice_id=$1 ORDER BY sort_order`, [req.params.id]),
      db.queryAll(`SELECT key, value FROM system_settings WHERE key LIKE 'company.%'`),
      db.queryOne(`SELECT fbr_invoice_no, fbr_qr_code FROM invoices WHERE id=$1`, [req.params.id]),
    ]);
    if (!invoice) return notFound(res, 'Invoice');

    const settings = Object.fromEntries(company.map(r => [r.key.replace('company.',''), r.value]));
    return ok(res, { invoice, items, company: settings, fbr });
  } catch (err) { next(err); }
});

module.exports = router;
