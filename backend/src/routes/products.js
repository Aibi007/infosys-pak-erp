'use strict';
// ================================================================
// src/routes/products.js
// GET    /products              — paginated, searched, filtered
// POST   /products              — create product + stock level
// GET    /products/:id          — detail with variants + stock
// PUT    /products/:id          — full update
// PATCH  /products/:id          — partial update (price, status)
// DELETE /products/:id          — soft delete (is_active=false)
// GET    /products/:id/variants — list variants
// POST   /products/:id/variants — add variant
// GET    /products/low-stock    — below reorder level
// GET    /products/search       — fast trigram search
// ================================================================
const router = require('express').Router();
const { z }  = require('zod');
const { authenticate, hasPermission } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ok, created, notFound, paginated, badRequest } = require('../utils/response');

router.use(authenticate);

// ── Schemas ───────────────────────────────────────────────────
const productSchema = z.object({
  sku:           z.string().min(2).max(50),
  name:          z.string().min(1).max(255),
  nameUr:        z.string().max(255).optional(),
  description:   z.string().max(2000).optional(),
  categoryId:    z.string().uuid().optional().nullable(),
  brand:         z.string().max(100).optional(),
  unit:          z.enum(['piece','meter','kg','set','box','dozen']).default('piece'),
  costPrice:     z.coerce.number().min(0),
  salePrice:     z.coerce.number().min(0),
  wholesalePrice:z.coerce.number().min(0).optional().nullable(),
  taxRate:       z.coerce.number().min(0).max(100).default(0),
  isTaxable:     z.boolean().default(false),
  barcode:       z.string().max(100).optional().nullable(),
  reorderLevel:  z.coerce.number().int().min(0).default(10),
  hasVariants:   z.boolean().default(false),
  warehouseId:   z.string().uuid().optional(),
  openingStock:  z.coerce.number().min(0).default(0),
  meta:          z.record(z.any()).optional(),
});

const variantSchema = z.object({
  sku:        z.string().min(2).max(60),
  barcode:    z.string().max(100).optional().nullable(),
  attributes: z.record(z.string()),    // { "Color": "Red", "Size": "M" }
  costPrice:  z.coerce.number().min(0).optional().nullable(),
  salePrice:  z.coerce.number().min(0).optional().nullable(),
  stock:      z.coerce.number().min(0).default(0),
});

const listQuery = validate.schemas.pagination.extend({
  category:  z.string().uuid().optional(),
  status:    z.enum(['active','inactive','all']).default('active'),
  minStock:  z.coerce.number().optional(),
  maxStock:  z.coerce.number().optional(),
  brand:     z.string().max(100).optional(),
  hasStock:  z.coerce.boolean().optional(),
});

// ── GET /products ─────────────────────────────────────────────
router.get('/', hasPermission('inventory:read'), validate.query(listQuery), async (req, res, next) => {
  const { page, limit, search, category, status, brand, hasStock } = req.query;
  const db = req.tenantDb;
  try {
    const conditions = [];
    const params     = [];

    if (status !== 'all') {
      params.push(status === 'active');
      conditions.push(`p.is_active = $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`p.category_id = $${params.length}`);
    }
    if (brand) {
      params.push(`%${brand}%`);
      conditions.push(`p.brand ILIKE $${params.length}`);
    }
    if (search) {
      params.push(search);
      conditions.push(`(p.name ILIKE $${params.length + 0} || '%'
        OR p.sku ILIKE '%' || $${params.length} || '%'
        OR p.barcode = $${params.length})`);
    }
    if (hasStock === true) {
      conditions.push(`(
        SELECT COALESCE(SUM(sl.qty_available),0) FROM stock_levels sl WHERE sl.product_id = p.id
      ) > 0`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT p.id, p.sku, p.name, p.name_ur, p.brand, p.unit,
             p.cost_price, p.sale_price, p.wholesale_price,
             p.tax_rate, p.is_taxable, p.barcode, p.reorder_level,
             p.has_variants, p.is_active, p.image_url,
             c.name AS category_name,
             COALESCE((
               SELECT SUM(sl.qty_available)
               FROM stock_levels sl WHERE sl.product_id = p.id
             ), 0) AS total_stock
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${where}
      ORDER BY p.name ASC
    `;

    const result = await db.paginate(sql, params, { page, limit });
    return paginated(res, result);
  } catch (err) { next(err); }
});

// ── GET /products/low-stock ───────────────────────────────────
router.get('/low-stock', hasPermission('inventory:read'), async (req, res, next) => {
  try {
    const rows = await req.tenantDb.queryAll(`
      SELECT p.id, p.sku, p.name, p.name_ur, p.reorder_level,
             w.name AS warehouse,
             sl.qty_available, sl.qty_on_hand
      FROM stock_levels sl
      JOIN products p   ON p.id = sl.product_id
      JOIN warehouses w ON w.id = sl.warehouse_id
      WHERE sl.qty_available <= p.reorder_level
        AND p.is_active = TRUE
      ORDER BY sl.qty_available ASC
    `);
    return ok(res, rows);
  } catch (err) { next(err); }
});

// ── GET /products/categories ──────────────────────────────────
router.get('/categories', async (req, res, next) => {
  try {
    const rows = await req.tenantDb.queryAll(
      `SELECT id, name, name_ur, slug, sort_order FROM categories WHERE is_active=TRUE ORDER BY sort_order`
    );
    return ok(res, rows);
  } catch (err) { next(err); }
});

// ── GET /products/:id ─────────────────────────────────────────
router.get('/:id', hasPermission('inventory:read'), async (req, res, next) => {
  try {
    const db = req.tenantDb;
    const product = await db.queryOne(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = $1
    `, [req.params.id]);
    if (!product) return notFound(res, 'Product');

    const [variants, stockLevels] = await Promise.all([
      db.queryAll(
        `SELECT id, sku, barcode, attributes, cost_price, sale_price, is_active
         FROM product_variants WHERE product_id=$1 AND is_active=TRUE ORDER BY sku`,
        [product.id]
      ),
      db.queryAll(`
        SELECT sl.qty_on_hand, sl.qty_reserved, sl.qty_available, sl.avg_cost,
               w.id AS warehouse_id, w.name AS warehouse_name, w.code AS warehouse_code
        FROM stock_levels sl JOIN warehouses w ON w.id=sl.warehouse_id
        WHERE sl.product_id=$1
      `, [product.id]),
    ]);

    return ok(res, { ...product, variants, stockLevels });
  } catch (err) { next(err); }
});

// ── POST /products ────────────────────────────────────────────
router.post('/', hasPermission('inventory:create'), validate(productSchema), async (req, res, next) => {
  const {
    sku, name, nameUr, description, categoryId, brand, unit,
    costPrice, salePrice, wholesalePrice, taxRate, isTaxable,
    barcode, reorderLevel, hasVariants, warehouseId, openingStock, meta,
  } = req.body;
  try {
    const product = await req.tenantDb.transaction(async (txDb) => {
      // Insert product
      const p = await txDb.queryOne(`
        INSERT INTO products
          (sku, name, name_ur, description, category_id, brand, unit,
           cost_price, sale_price, wholesale_price, tax_rate, is_taxable,
           barcode, reorder_level, has_variants, meta)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING id, sku, name
      `, [sku, name, nameUr||null, description||null, categoryId||null, brand||null,
          unit, costPrice, salePrice, wholesalePrice||null, taxRate, isTaxable,
          barcode||null, reorderLevel, hasVariants, JSON.stringify(meta||{})]);

      // Open stock in default warehouse
      if (openingStock > 0 && !hasVariants) {
        // Resolve warehouse
        const wh = warehouseId
          ? await txDb.queryOne(`SELECT id FROM warehouses WHERE id=$1`, [warehouseId])
          : await txDb.queryOne(`SELECT id FROM warehouses WHERE is_default=TRUE LIMIT 1`);
        if (!wh) throw Object.assign(new Error('No warehouse found'), { statusCode: 400 });

        await txDb.execute(`
          INSERT INTO stock_levels (warehouse_id, product_id, qty_on_hand, avg_cost)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (warehouse_id, product_id, variant_id) DO UPDATE
            SET qty_on_hand = stock_levels.qty_on_hand + $3
        `, [wh.id, p.id, openingStock, costPrice]);

        // Record movement
        await txDb.execute(`
          INSERT INTO stock_movements
            (warehouse_id, product_id, movement_type, reference_type, qty, qty_before, qty_after, unit_cost, created_by)
          VALUES ($1,$2,'opening_stock','product',$3,0,$3,$4,$5)
        `, [wh.id, p.id, openingStock, costPrice, req.userId]);
      }

      return p;
    });

    return created(res, product, 'Product created');
  } catch (err) { next(err); }
});

// ── PUT /products/:id ─────────────────────────────────────────
router.put('/:id', hasPermission('inventory:update'), validate(productSchema.partial()), async (req, res, next) => {
  try {
    const fields = {
      name:            req.body.name,
      name_ur:         req.body.nameUr,
      cost_price:      req.body.costPrice,
      sale_price:      req.body.salePrice,
      wholesale_price: req.body.wholesalePrice,
      reorder_level:   req.body.reorderLevel,
      tax_rate:        req.body.taxRate,
      is_taxable:      req.body.isTaxable,
      barcode:         req.body.barcode,
      brand:           req.body.brand,
      category_id:     req.body.categoryId,
    };
    const sets   = [];
    const params = [];
    for (const [col, val] of Object.entries(fields)) {
      if (val !== undefined) {
        params.push(val);
        sets.push(`${col}=$${params.length}`);
      }
    }
    if (!sets.length) return badRequest(res, 'No fields to update');
    sets.push('updated_at=NOW()');
    params.push(req.params.id);

    const updated = await req.tenantDb.queryOne(
      `UPDATE products SET ${sets.join(',')} WHERE id=$${params.length} AND is_active=TRUE RETURNING id, sku, name`,
      params
    );
    if (!updated) return notFound(res, 'Product');
    return ok(res, updated, 'Product updated');
  } catch (err) { next(err); }
});

// ── DELETE /products/:id (soft) ───────────────────────────────
router.delete('/:id', hasPermission('inventory:delete'), async (req, res, next) => {
  try {
    const rows = await req.tenantDb.execute(
      `UPDATE products SET is_active=FALSE, updated_at=NOW() WHERE id=$1 AND is_active=TRUE`,
      [req.params.id]
    );
    if (!rows) return notFound(res, 'Product');
    return ok(res, null, 'Product deactivated');
  } catch (err) { next(err); }
});

// ── GET /products/:id/variants ────────────────────────────────
router.get('/:id/variants', hasPermission('inventory:read'), async (req, res, next) => {
  try {
    const variants = await req.tenantDb.queryAll(`
      SELECT pv.*, sl.qty_available, sl.qty_on_hand
      FROM product_variants pv
      LEFT JOIN stock_levels sl ON sl.variant_id = pv.id
      WHERE pv.product_id=$1 AND pv.is_active=TRUE
    `, [req.params.id]);
    return ok(res, variants);
  } catch (err) { next(err); }
});

// ── POST /products/:id/variants ───────────────────────────────
router.post('/:id/variants', hasPermission('inventory:create'), validate(variantSchema), async (req, res, next) => {
  const { sku, barcode, attributes, costPrice, salePrice, stock } = req.body;
  try {
    const variant = await req.tenantDb.transaction(async (txDb) => {
      const v = await txDb.queryOne(`
        INSERT INTO product_variants (product_id, sku, barcode, attributes, cost_price, sale_price)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, sku
      `, [req.params.id, sku, barcode||null, JSON.stringify(attributes), costPrice||null, salePrice||null]);

      if (stock > 0) {
        const wh = await txDb.queryOne(`SELECT id FROM warehouses WHERE is_default=TRUE LIMIT 1`);
        if (wh) {
          await txDb.execute(`
            INSERT INTO stock_levels (warehouse_id, product_id, variant_id, qty_on_hand)
            VALUES ($1,$2,$3,$4)
          `, [wh.id, req.params.id, v.id, stock]);
        }
      }
      return v;
    });
    return created(res, variant, 'Variant created');
  } catch (err) { next(err); }
});

module.exports = router;
