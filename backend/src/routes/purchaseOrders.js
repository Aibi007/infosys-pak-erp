'use strict';
// ================================================================
// src/routes/purchaseOrders.js
// GET  /purchase-orders           — list POs
// POST /purchase-orders           — create PO
// GET  /purchase-orders/:id       — detail + items
// POST /purchase-orders/:id/approve — approve PO
// POST /purchase-orders/:id/grn   — goods receipt (updates stock)
// POST /purchase-orders/:id/pay   — vendor payment
// GET  /purchase-orders/ap-aging  — AP aging report
// ================================================================
const router = require('express').Router();
const { z }  = require('zod');
const { authenticate, hasPermission, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ok, created, notFound, paginated, badRequest, unprocessable } = require('../utils/response');

router.use(authenticate);

// ── Schemas ───────────────────────────────────────────────────
const poItemSchema = z.object({
  productId:   z.string().uuid(),
  variantId:   z.string().uuid().optional().nullable(),
  productName: z.string().max(255).optional(),
  sku:         z.string().max(60).optional(),
  qtyOrdered:  z.coerce.number().positive(),
  unitCost:    z.coerce.number().min(0),
  taxRate:     z.coerce.number().min(0).max(100).default(0),
});

const createPOSchema = z.object({
  vendorId:     z.string().uuid(),
  poDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  paymentTerms: z.coerce.number().int().min(0).default(30),
  notes:        z.string().max(1000).optional(),
  items:        z.array(poItemSchema).min(1),
});

const grnItemSchema = z.object({
  poItemId:    z.string().uuid().optional(),
  productId:   z.string().uuid(),
  variantId:   z.string().uuid().optional().nullable(),
  qtyReceived: z.coerce.number().positive(),
  qtyAccepted: z.coerce.number().min(0),
  qtyRejected: z.coerce.number().min(0).default(0),
  unitCost:    z.coerce.number().min(0),
  rejectReason:z.string().max(300).optional(),
});

const grnSchema = z.object({
  warehouseId:     z.string().uuid(),
  vendorInvoiceNo: z.string().max(50).optional(),
  notes:           z.string().max(500).optional(),
  items:           z.array(grnItemSchema).min(1),
});

// ── GET /ap-aging ─────────────────────────────────────────────
router.get('/ap-aging', hasPermission('reports:read'), async (req, res, next) => {
  try {
    const rows = await req.tenantDb.queryAll(`SELECT * FROM v_ap_aging ORDER BY days_90_plus DESC`);
    const totals = rows.reduce((acc, r) => ({
      current_amt:  acc.current_amt  + parseFloat(r.current_amt  || 0),
      days_1_30:    acc.days_1_30    + parseFloat(r.days_1_30    || 0),
      days_31_60:   acc.days_31_60   + parseFloat(r.days_31_60   || 0),
      days_61_90:   acc.days_61_90   + parseFloat(r.days_61_90   || 0),
      days_90_plus: acc.days_90_plus + parseFloat(r.days_90_plus || 0),
    }), { current_amt:0, days_1_30:0, days_31_60:0, days_61_90:0, days_90_plus:0 });
    return ok(res, { rows, totals });
  } catch (err) { next(err); }
});

// ── GET /purchase-orders ──────────────────────────────────────
router.get('/', hasPermission('procurement:read'), validate.query(
  validate.schemas.pagination.extend({
    status:   z.string().optional(),
    vendorId: z.string().uuid().optional(),
    from:     z.string().optional(),
    to:       z.string().optional(),
  })
), async (req, res, next) => {
  const { page, limit, status, vendorId, from, to } = req.query;
  const conds=[]; const params=[];
  const p = v => { params.push(v); return `$${params.length}`; };
  if (status)   conds.push(`po.status=${p(status)}`);
  if (vendorId) conds.push(`po.vendor_id=${p(vendorId)}`);
  if (from)     conds.push(`po.po_date>=${p(from)}`);
  if (to)       conds.push(`po.po_date<=${p(to)}`);
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  try {
    const result = await req.tenantDb.paginate(`
      SELECT po.id, po.po_number, po.po_date, po.expected_date,
             po.status, po.grand_total, po.amount_paid, po.amount_due,
             po.payment_terms,
             v.name AS vendor_name, v.code AS vendor_code
      FROM purchase_orders po JOIN vendors v ON v.id=po.vendor_id
      ${where}
      ORDER BY po.po_date DESC, po.created_at DESC
    `, params, { page, limit });
    return paginated(res, result);
  } catch (err) { next(err); }
});

// ── POST /purchase-orders ─────────────────────────────────────
router.post('/', hasPermission('procurement:create'), validate(createPOSchema), async (req, res, next) => {
  const { vendorId, poDate, expectedDate, paymentTerms, notes, items } = req.body;
  try {
    const po = await req.tenantDb.transaction(async (txDb) => {
      // Verify vendor
      const vendor = await txDb.queryOne(`SELECT id, name FROM vendors WHERE id=$1 AND status='active'`, [vendorId]);
      if (!vendor) throw Object.assign(new Error('Vendor not found or inactive'), { statusCode: 404 });

      // Enrich items with product info
      let subtotal = 0, totalTax = 0;
      const enriched = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const product = await txDb.queryOne(`SELECT id, name, sku FROM products WHERE id=$1`, [item.productId]);
        if (!product) throw Object.assign(new Error(`Product ${item.productId} not found`), { statusCode: 422 });
        const tax = item.qtyOrdered * item.unitCost * (item.taxRate / 100);
        const line = item.qtyOrdered * item.unitCost + tax;
        subtotal += item.qtyOrdered * item.unitCost;
        totalTax += tax;
        enriched.push({ ...item, product, taxAmt: tax, lineTotal: line, sortOrder: i });
      }
      const grandTotal = subtotal + totalTax;

      const po = await txDb.queryOne(`
        INSERT INTO purchase_orders
          (vendor_id, po_date, expected_date, status, payment_terms, subtotal, tax_amount, grand_total, notes, created_by)
        VALUES ($1,COALESCE($2,CURDATE()),$3,'draft',$4,$5,$6,$7,$8,$9)
      `, [vendorId, poDate||null, expectedDate||null, paymentTerms, subtotal, totalTax, grandTotal, notes||null, req.userId]);

      for (const item of enriched) {
        await txDb.execute(`
          INSERT INTO purchase_order_items
            (po_id, product_id, variant_id, product_name, sku, qty_ordered, unit_cost, tax_rate, tax_amount, line_total, sort_order)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `, [po.id, item.productId, item.variantId||null, item.product.name, item.product.sku,
            item.qtyOrdered, item.unitCost, item.taxRate, item.taxAmt, item.lineTotal, item.sortOrder]);
      }
      return po;
    });
    return created(res, po, `Purchase Order ${po.po_number} created`);
  } catch (err) { next(err); }
});

// ── GET /purchase-orders/:id ──────────────────────────────────
router.get('/:id', hasPermission('procurement:read'), async (req, res, next) => {
  try {
    const db = req.tenantDb;
    const [po, items, payments] = await Promise.all([
      db.queryOne(`
        SELECT po.*, v.name AS vendor_name, v.phone AS vendor_phone
        FROM purchase_orders po JOIN vendors v ON v.id=po.vendor_id WHERE po.id=$1
      `, [req.params.id]),
      db.queryAll(`SELECT * FROM purchase_order_items WHERE po_id=$1 ORDER BY sort_order`, [req.params.id]),
      db.queryAll(`SELECT * FROM vendor_payments WHERE po_id=$1 ORDER BY payment_date DESC`, [req.params.id]),
    ]);
    if (!po) return notFound(res, 'Purchase Order');
    return ok(res, { ...po, items, payments });
  } catch (err) { next(err); }
});

// ── POST /purchase-orders/:id/approve ────────────────────────
router.post('/:id/approve', hasPermission('procurement:approve'), async (req, res, next) => {
  try {
    const po = await req.tenantDb.queryOne(`SELECT id, status FROM purchase_orders WHERE id=$1`, [req.params.id]);
    if (!po) return notFound(res, 'Purchase Order');
    if (po.status !== 'draft') return badRequest(res, `PO is ${po.status} and cannot be approved`);
    await req.tenantDb.execute(
      `UPDATE purchase_orders SET status='approved', approved_by=$1, approved_at=NOW() WHERE id=$2`,
      [req.userId, req.params.id]
    );
    return ok(res, null, 'Purchase Order approved');
  } catch (err) { next(err); }
});

// ── POST /purchase-orders/:id/grn ─────────────────────────────
router.post('/:id/grn', hasPermission('procurement:receive'), validate(grnSchema), async (req, res, next) => {
  const { warehouseId, vendorInvoiceNo, notes, items } = req.body;
  try {
    const grn = await req.tenantDb.transaction(async (txDb) => {
      const po = await txDb.queryOne(`SELECT * FROM purchase_orders WHERE id=$1`, [req.params.id]);
      if (!po) throw Object.assign(new Error('PO not found'), { statusCode: 404 });
      if (!['approved','partial'].includes(po.status)) {
        throw Object.assign(new Error('PO must be approved before receiving'), { statusCode: 422 });
      }

      // Create GRN header
      const grnNo = `GRN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const g = await txDb.queryOne(`
        INSERT INTO grn (grn_number, po_id, branch_id, warehouse_id, vendor_id, vendor_invoice_no, notes, status, created_by)
        SELECT $1,$2,branch_id,$3,vendor_id,$4,$5,'posted',$6 FROM purchase_orders WHERE id=$2
      `, [grnNo, req.params.id, warehouseId, vendorInvoiceNo||null, notes||null, req.userId]);

      for (const item of items) {
        await txDb.execute(`
          INSERT INTO grn_items (grn_id, po_item_id, product_id, variant_id, qty_received, qty_accepted, qty_rejected, unit_cost, reject_reason)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `, [g.id, item.poItemId||null, item.productId, item.variantId||null,
            item.qtyReceived, item.qtyAccepted, item.qtyRejected, item.unitCost, item.rejectReason||null]);

        if (item.qtyAccepted > 0) {
          // Add to stock — upsert
          await txDb.execute(`
            INSERT INTO stock_levels (warehouse_id, product_id, variant_id, qty_on_hand, avg_cost)
            VALUES ($1,$2,$3,$4,$5)
            ON DUPLICATE KEY UPDATE qty_on_hand = stock_levels.qty_on_hand + $4,
                  avg_cost    = (stock_levels.qty_on_hand * stock_levels.avg_cost + $4 * $5)
                                / (stock_levels.qty_on_hand + $4)
          `, [warehouseId, item.productId, item.variantId||null, item.qtyAccepted, item.unitCost]);

          await txDb.execute(`
            INSERT INTO stock_movements (warehouse_id,product_id,variant_id,movement_type,reference_type,reference_id,qty,qty_before,qty_after,unit_cost,created_by)
            SELECT $1,$2,$3,'purchase_receipt','grn',$4,$5,qty_on_hand-$5,qty_on_hand,$6,$7
            FROM stock_levels WHERE warehouse_id=$1 AND product_id=$2
          `, [warehouseId, item.productId, item.variantId||null, g.id, item.qtyAccepted, item.unitCost, req.userId]);
        }

        // Update PO item qty received
        if (item.poItemId) {
          await txDb.execute(
            `UPDATE purchase_order_items SET qty_received=qty_received+$1 WHERE id=$2`,
            [item.qtyAccepted, item.poItemId]
          );
        }
      }

      // Update vendor balance
      const totalCost = items.reduce((s,i) => s + i.qtyAccepted * i.unitCost, 0);
      await txDb.execute(
        `UPDATE vendors SET current_balance=current_balance+$1, total_purchases=total_purchases+$1, last_purchase_at=NOW() WHERE id=$2`,
        [totalCost, po.vendor_id]
      );

      // Update PO status
      await txDb.execute(`CALL update_po_receipt_status($1)`, [req.params.id]);

      return g;
    });
    return created(res, grn, `GRN ${grn.grn_number} posted — stock updated`);
  } catch (err) { next(err); }
});

// ── POST /purchase-orders/:id/pay ─────────────────────────────
router.post('/:id/pay', hasPermission('accounting:create'), validate(z.object({
  amount:      z.coerce.number().positive(),
  paymentMode: z.enum(['cash','hbl_transfer','mcb_transfer','cheque','easypaisa','other']),
  referenceNo: z.string().max(100).optional(),
  notes:       z.string().max(500).optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})), async (req, res, next) => {
  const { amount, paymentMode, referenceNo, notes, paymentDate } = req.body;
  try {
    await req.tenantDb.transaction(async (txDb) => {
      const po = await txDb.queryOne(`SELECT id, vendor_id, amount_due FROM purchase_orders WHERE id=$1`, [req.params.id]);
      if (!po) throw Object.assign(new Error('PO not found'), { statusCode: 404 });
      if (amount > parseFloat(po.amount_due) * 1.001) {
        throw Object.assign(new Error('Payment exceeds amount due'), { statusCode: 422 });
      }

      const pNo = `VP-${Date.now().toString().slice(-6)}`;
      await txDb.execute(`
        INSERT INTO vendor_payments (payment_number,po_id,vendor_id,amount,payment_type,payment_mode,reference_no,notes,payment_date,created_by)
        VALUES ($1,$2,$3,$4,'payment',$5,$6,$7,COALESCE($8,CURDATE()),$9)
      `, [pNo, req.params.id, po.vendor_id, amount, paymentMode, referenceNo||null, notes||null, paymentDate||null, req.userId]);

      await txDb.execute(
        `UPDATE purchase_orders SET amount_paid=amount_paid+$1 WHERE id=$2`, [amount, req.params.id]
      );
      await txDb.execute(
        `UPDATE vendors SET current_balance=current_balance-$1 WHERE id=$2`, [amount, po.vendor_id]
      );
    });
    return ok(res, null, 'Vendor payment recorded');
  } catch (err) { next(err); }
});

module.exports = router;
