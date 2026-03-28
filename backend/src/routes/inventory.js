'use strict';
// ================================================================
// src/routes/inventory.js
// GET  /inventory/stock          — all stock levels (warehouse view)
// POST /inventory/adjust         — manual adjustment
// POST /inventory/transfer       — warehouse-to-warehouse transfer
// GET  /inventory/transfers      — list transfers
// GET  /inventory/transfers/:id  — transfer detail
// PATCH/inventory/transfers/:id/receive — mark received
// GET  /inventory/movements/:productId — movement history
// GET  /inventory/valuation      — stock valuation report
// ================================================================
const router = require('express').Router();
const { z }  = require('zod');
const { authenticate, hasPermission } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ok, created, notFound, paginated, badRequest } = require('../utils/response');

router.use(authenticate);

// ── GET /inventory/stock ──────────────────────────────────────
router.get('/stock', hasPermission('inventory:read'), validate.query(
  validate.schemas.pagination.extend({
    warehouseId: z.string().uuid().optional(),
    category:    z.string().uuid().optional(),
    lowStock:    z.coerce.boolean().optional(),
  })
), async (req, res, next) => {
  const { page, limit, search, warehouseId, category, lowStock } = req.query;
  const conds=[]; const params=[];
  const p = v => { params.push(v); return `$${params.length}`; };

  if (warehouseId) conds.push(`sl.warehouse_id=${p(warehouseId)}`);
  if (category)    conds.push(`p.category_id=${p(category)}`);
  if (search)      conds.push(`(p.name ILIKE ${p('%'+search+'%')} OR p.sku ILIKE $${params.length})`);
  if (lowStock)    conds.push('sl.qty_available <= p.reorder_level');

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  try {
    const result = await req.tenantDb.paginate(`
      SELECT p.id, p.sku, p.name, p.name_ur, p.sale_price, p.cost_price,
             p.reorder_level, p.unit,
             c.name AS category,
             w.id AS warehouse_id, w.name AS warehouse,
             sl.qty_on_hand, sl.qty_reserved, sl.qty_available,
             sl.avg_cost,
             sl.qty_on_hand * sl.avg_cost AS stock_value,
             CASE WHEN sl.qty_available <= 0 THEN 'out_of_stock'
                  WHEN sl.qty_available <= p.reorder_level THEN 'low_stock'
                  ELSE 'in_stock' END AS stock_status
      FROM stock_levels sl
      JOIN products p   ON p.id=sl.product_id
      JOIN warehouses w ON w.id=sl.warehouse_id
      LEFT JOIN categories c ON c.id=p.category_id
      ${where}
      ORDER BY stock_status ASC, p.name ASC
    `, params, { page, limit });
    return paginated(res, result);
  } catch (err) { next(err); }
});

// ── GET /inventory/valuation ──────────────────────────────────
router.get('/valuation', hasPermission('inventory:read'), async (req, res, next) => {
  try {
    const [rows, totals] = await Promise.all([
      req.tenantDb.queryAll(`SELECT * FROM v_stock_valuation ORDER BY category, name`),
      req.tenantDb.queryOne(`
        SELECT COALESCE(SUM(sl.qty_on_hand * sl.avg_cost),0) AS total_cost_value,
               COALESCE(SUM(sl.qty_on_hand * p.sale_price),0) AS total_retail_value,
               COUNT(DISTINCT p.id)  AS product_count,
               COUNT(DISTINCT sl.id) AS sku_count
        FROM stock_levels sl JOIN products p ON p.id=sl.product_id WHERE p.is_active=TRUE
      `),
    ]);
    return ok(res, { rows, totals });
  } catch (err) { next(err); }
});

// ── POST /inventory/adjust ────────────────────────────────────
const adjustSchema = z.object({
  warehouseId: z.string().uuid(),
  productId:   z.string().uuid(),
  variantId:   z.string().uuid().optional().nullable(),
  type:        z.enum(['adjustment_add','adjustment_remove','damage','expiry']),
  qty:         z.coerce.number().positive(),
  notes:       z.string().min(3, 'Notes required for adjustments').max(500),
});

router.post('/adjust', hasPermission('inventory:adjust'), validate(adjustSchema), async (req, res, next) => {
  const { warehouseId, productId, variantId, type, qty, notes } = req.body;
  const isAdd = ['adjustment_add'].includes(type);
  try {
    await req.tenantDb.transaction(async (txDb) => {
      const before = await txDb.queryOne(`
        SELECT qty_on_hand FROM stock_levels
        WHERE warehouse_id=$1 AND product_id=$2
          AND (variant_id=$3 OR (variant_id IS NULL AND $3::uuid IS NULL))
      `, [warehouseId, productId, variantId||null]);

      if (!before) throw Object.assign(new Error('Stock level record not found'), { statusCode: 404 });
      const beforeQty = parseFloat(before.qty_on_hand);
      const afterQty  = isAdd ? beforeQty + qty : beforeQty - qty;
      if (afterQty < 0) throw Object.assign(new Error('Adjustment would result in negative stock'), { statusCode: 422 });

      await txDb.execute(`
        UPDATE stock_levels SET qty_on_hand=$1
        WHERE warehouse_id=$2 AND product_id=$3
          AND (variant_id=$4 OR (variant_id IS NULL AND $4::uuid IS NULL))
      `, [afterQty, warehouseId, productId, variantId||null]);

      await txDb.execute(`
        INSERT INTO stock_movements
          (warehouse_id, product_id, variant_id, movement_type, qty, qty_before, qty_after, notes, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [warehouseId, productId, variantId||null, type, qty, beforeQty, afterQty, notes, req.userId]);
    });
    return ok(res, null, 'Stock adjusted');
  } catch (err) { next(err); }
});

// ── POST /inventory/transfer ──────────────────────────────────
const transferSchema = z.object({
  fromWarehouseId: z.string().uuid(),
  toWarehouseId:   z.string().uuid(),
  notes:           z.string().max(500).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional().nullable(),
    qty:       z.coerce.number().positive(),
  })).min(1),
});

router.post('/transfer', hasPermission('inventory:transfer'), validate(transferSchema), async (req, res, next) => {
  const { fromWarehouseId, toWarehouseId, notes, items } = req.body;
  if (fromWarehouseId === toWarehouseId) return badRequest(res, 'Source and destination warehouses must differ');
  try {
    const transfer = await req.tenantDb.transaction(async (txDb) => {
      const t = await txDb.queryOne(`
        INSERT INTO stock_transfers (from_warehouse, to_warehouse, status, notes, created_by)
        VALUES ($1,$2,'in_transit',$3,$4) RETURNING id
      `, [fromWarehouseId, toWarehouseId, notes||null, req.userId]);

      for (const item of items) {
        // Check source stock
        const src = await txDb.queryOne(`
          SELECT qty_on_hand, qty_available FROM stock_levels
          WHERE warehouse_id=$1 AND product_id=$2
            AND (variant_id=$3 OR (variant_id IS NULL AND $3::uuid IS NULL))
        `, [fromWarehouseId, item.productId, item.variantId||null]);
        if (!src || parseFloat(src.qty_available) < item.qty) {
          throw Object.assign(new Error(`Insufficient stock in source warehouse`), { statusCode: 422 });
        }

        await txDb.execute(`
          INSERT INTO stock_transfer_items (transfer_id, product_id, variant_id, qty_sent)
          VALUES ($1,$2,$3,$4)
        `, [t.id, item.productId, item.variantId||null, item.qty]);

        // Immediately deduct from source, add to destination
        await txDb.execute(`
          UPDATE stock_levels SET qty_on_hand=qty_on_hand-$1
          WHERE warehouse_id=$2 AND product_id=$3
            AND (variant_id=$4 OR (variant_id IS NULL AND $4::uuid IS NULL))
        `, [item.qty, fromWarehouseId, item.productId, item.variantId||null]);

        // Upsert destination stock level
        await txDb.execute(`
          INSERT INTO stock_levels (warehouse_id, product_id, variant_id, qty_on_hand)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (warehouse_id, product_id, variant_id) DO UPDATE
            SET qty_on_hand = stock_levels.qty_on_hand + $4
        `, [toWarehouseId, item.productId, item.variantId||null, item.qty]);

        // Movements
        await txDb.execute(`
          INSERT INTO stock_movements (warehouse_id,product_id,variant_id,movement_type,reference_type,reference_id,qty,qty_before,qty_after,created_by)
          SELECT $1,$2,$3,'transfer_out','transfer',$4,$5,qty_on_hand+$5,qty_on_hand,$6 FROM stock_levels
          WHERE warehouse_id=$1 AND product_id=$2
        `, [fromWarehouseId, item.productId, item.variantId||null, t.id, item.qty, req.userId]);
      }

      // Mark as received immediately (simple mode — use PATCH for multi-step)
      await txDb.execute(
        `UPDATE stock_transfers SET status='received', received_by=$1, received_at=NOW() WHERE id=$2`,
        [req.userId, t.id]
      );

      return t;
    });
    return created(res, { transferId: transfer.id }, 'Transfer completed');
  } catch (err) { next(err); }
});

// ── GET /inventory/movements/:productId ──────────────────────
router.get('/movements/:productId', hasPermission('inventory:read'), async (req, res, next) => {
  const { page=1, limit=50 } = req.query;
  try {
    const result = await req.tenantDb.paginate(`
      SELECT sm.*, w.name AS warehouse_name, p.name AS product_name
      FROM stock_movements sm
      JOIN warehouses w ON w.id=sm.warehouse_id
      JOIN products p   ON p.id=sm.product_id
      WHERE sm.product_id=$1
      ORDER BY sm.created_at DESC
    `, [req.params.productId], { page: parseInt(page), limit: parseInt(limit) });
    return paginated(res, result);
  } catch (err) { next(err); }
});

module.exports = router;
