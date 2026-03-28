-- ============================================================
-- Migration 004: Inventory
-- Tables: categories, products, variants, warehouses,
--         stock_levels, stock_movements, barcode_log
-- ============================================================

-- ── CATEGORIES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID         REFERENCES categories(id),
  name        VARCHAR(100) NOT NULL,
  name_ur     VARCHAR(100),
  slug        VARCHAR(100) NOT NULL UNIQUE,
  sort_order  INT          NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO categories (name, name_ur, slug, sort_order) VALUES
  ('Lawn & Cotton',     'لان و کاٹن',    'lawn-cotton',    1),
  ('Embroidered',       'کشیدہ کاری',   'embroidered',     2),
  ('Ready-to-Wear',     'تیار ملبوسات', 'ready-to-wear',   3),
  ('Unstitched',        'غیر سلا',       'unstitched',      4),
  ('Accessories',       'لوازمات',      'accessories',      5),
  ('Winter Collection', 'سرمائی مجموعہ','winter',          6);

-- ── ATTRIBUTE DEFINITIONS ───────────────────────────────────
-- e.g. Color, Size, Fabric, Season
CREATE TABLE IF NOT EXISTS attribute_types (
  id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name     VARCHAR(50) NOT NULL UNIQUE,   -- 'Color', 'Size', 'Fabric', 'Season'
  name_ur  VARCHAR(50),
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attribute_values (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id  UUID        NOT NULL REFERENCES attribute_types(id) ON DELETE CASCADE,
  value         VARCHAR(100) NOT NULL,
  value_ur      VARCHAR(100),
  hex_code      CHAR(7),                 -- for colors: '#FF6B6B'
  sort_order    INT          NOT NULL DEFAULT 0,
  UNIQUE (attribute_id, value)
);

INSERT INTO attribute_types (name, name_ur, sort_order) VALUES
  ('Color',  'رنگ',    1),
  ('Size',   'سائز',   2),
  ('Fabric', 'کپڑا',   3),
  ('Season', 'موسم',   4);

-- Colors
INSERT INTO attribute_values (attribute_id, value, value_ur, hex_code, sort_order)
SELECT id, v.value, v.value_ur, v.hex, v.sort
FROM attribute_types,
  (VALUES
    ('White',  'سفید',  '#FFFFFF', 1),
    ('Black',  'سیاہ',  '#000000', 2),
    ('Red',    'سرخ',   '#DC2626', 3),
    ('Blue',   'نیلا',  '#2563EB', 4),
    ('Green',  'سبز',   '#16A34A', 5),
    ('Pink',   'گلابی', '#EC4899', 6),
    ('Yellow', 'پیلا',  '#EAB308', 7),
    ('Orange', 'نارنجی','#F97316', 8),
    ('Purple', 'جامنی', '#9333EA', 9),
    ('Brown',  'بھورا', '#92400E', 10),
    ('Grey',   'سرمئی', '#6B7280', 11),
    ('Multi',  'کئی رنگ','NULL',  12)
  ) AS v(value, value_ur, hex, sort)
WHERE attribute_types.name = 'Color';

-- Sizes
INSERT INTO attribute_values (attribute_id, value, value_ur, sort_order)
SELECT id, v.value, v.value_ur, v.sort
FROM attribute_types,
  (VALUES ('XS','ایکس ایس',1),('S','ایس',2),('M','ایم',3),('L','ایل',4),('XL','ایکس ایل',5),('XXL','ڈبل ایکس',6),('Free Size','فری سائز',7)) AS v(value, value_ur, sort)
WHERE attribute_types.name = 'Size';

-- ── PRODUCTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID          REFERENCES branches(id),   -- NULL = all branches
  category_id     UUID          REFERENCES categories(id),
  sku             VARCHAR(50)   NOT NULL UNIQUE,
  name            VARCHAR(255)  NOT NULL,
  name_ur         VARCHAR(255),
  description     TEXT,
  description_ur  TEXT,
  brand           VARCHAR(100),
  unit            VARCHAR(20)   NOT NULL DEFAULT 'piece'  -- 'piece','meter','kg','set'
                    CHECK (unit IN ('piece','meter','kg','set','box','dozen')),
  cost_price      NUMERIC(12,2) NOT NULL DEFAULT 0,        -- purchase cost
  sale_price      NUMERIC(12,2) NOT NULL DEFAULT 0,        -- default retail price
  wholesale_price NUMERIC(12,2),                           -- bulk / wholesale price
  tax_rate        NUMERIC(5,2)  NOT NULL DEFAULT 0,        -- GST %
  is_taxable      BOOLEAN       NOT NULL DEFAULT FALSE,
  barcode         VARCHAR(100)  UNIQUE,                    -- EAN-13 or custom
  reorder_level   INT           NOT NULL DEFAULT 10,
  has_variants    BOOLEAN       NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  image_url       TEXT,
  meta            JSONB         NOT NULL DEFAULT '{}',     -- extra fields, seasons, tags
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_sku       ON products(sku);
CREATE INDEX idx_products_barcode   ON products(barcode);
CREATE INDEX idx_products_category  ON products(category_id);
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_active    ON products(is_active) WHERE is_active = TRUE;

-- ── PRODUCT VARIANTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku          VARCHAR(60)   NOT NULL UNIQUE,          -- 'FA-0001-WHT-M'
  barcode      VARCHAR(100)  UNIQUE,
  attributes   JSONB         NOT NULL DEFAULT '{}',    -- {"Color":"White","Size":"M"}
  cost_price   NUMERIC(12,2),                          -- overrides product if set
  sale_price   NUMERIC(12,2),                          -- overrides product if set
  image_url    TEXT,
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku     ON product_variants(sku);
CREATE INDEX idx_variants_attrs   ON product_variants USING GIN (attributes);

-- ── WAREHOUSES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouses (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   UUID         NOT NULL REFERENCES branches(id),
  name        VARCHAR(100) NOT NULL,
  name_ur     VARCHAR(100),
  code        VARCHAR(20)  NOT NULL UNIQUE,
  address     TEXT,
  is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO warehouses (branch_id, name, name_ur, code, is_default)
SELECT id, 'Main Store', 'مین اسٹور', 'WH-MAIN', TRUE FROM branches WHERE is_main = TRUE;

INSERT INTO warehouses (branch_id, name, name_ur, code)
SELECT id, 'Back Storage', 'پچھلا گودام', 'WH-BACK' FROM branches WHERE is_main = TRUE;

-- ── STOCK LEVELS ────────────────────────────────────────────
-- One row per (variant OR product-without-variants) × warehouse
CREATE TABLE IF NOT EXISTS stock_levels (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id    UUID         NOT NULL REFERENCES warehouses(id),
  product_id      UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id      UUID         REFERENCES product_variants(id) ON DELETE CASCADE,
  qty_on_hand     NUMERIC(12,3) NOT NULL DEFAULT 0,
  qty_reserved    NUMERIC(12,3) NOT NULL DEFAULT 0,  -- in pending orders
  qty_available   NUMERIC(12,3) GENERATED ALWAYS AS (qty_on_hand - qty_reserved) STORED,
  avg_cost        NUMERIC(12,4) NOT NULL DEFAULT 0,  -- running average cost
  last_counted_at TIMESTAMPTZ,
  UNIQUE (warehouse_id, product_id, variant_id)
);

CREATE INDEX idx_stock_warehouse ON stock_levels(warehouse_id);
CREATE INDEX idx_stock_product   ON stock_levels(product_id);
CREATE INDEX idx_stock_variant   ON stock_levels(variant_id);
CREATE INDEX idx_stock_low       ON stock_levels(qty_available) WHERE qty_available <= 10;

-- ── STOCK MOVEMENTS ─────────────────────────────────────────
-- Immutable ledger of every qty change. Source of truth.
CREATE TABLE IF NOT EXISTS stock_movements (
  id              BIGSERIAL    PRIMARY KEY,
  warehouse_id    UUID         NOT NULL REFERENCES warehouses(id),
  product_id      UUID         NOT NULL REFERENCES products(id),
  variant_id      UUID         REFERENCES product_variants(id),
  movement_type   VARCHAR(30)  NOT NULL
                    CHECK (movement_type IN (
                      'purchase_receipt','sale','sale_return','transfer_in',
                      'transfer_out','adjustment_add','adjustment_remove',
                      'opening_stock','damage','expiry'
                    )),
  reference_type  VARCHAR(30),  -- 'grn','invoice','transfer','adjustment'
  reference_id    UUID,
  qty             NUMERIC(12,3) NOT NULL,   -- always positive; type implies direction
  qty_before      NUMERIC(12,3) NOT NULL,
  qty_after       NUMERIC(12,3) NOT NULL,
  unit_cost       NUMERIC(12,4),
  notes           TEXT,
  created_by      UUID          NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movements_product  ON stock_movements(product_id);
CREATE INDEX idx_movements_ref      ON stock_movements(reference_type, reference_id);
CREATE INDEX idx_movements_created  ON stock_movements(created_at DESC);
CREATE INDEX idx_movements_type     ON stock_movements(movement_type);

-- ── STOCK TRANSFERS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_transfers (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  from_warehouse  UUID         NOT NULL REFERENCES warehouses(id),
  to_warehouse    UUID         NOT NULL REFERENCES warehouses(id),
  status          VARCHAR(20)  NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','in_transit','received','cancelled')),
  notes           TEXT,
  created_by      UUID         NOT NULL,
  received_by     UUID,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  received_at     TIMESTAMPTZ,
  CHECK (from_warehouse <> to_warehouse)
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id  UUID         NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id   UUID         NOT NULL REFERENCES products(id),
  variant_id   UUID         REFERENCES product_variants(id),
  qty_sent     NUMERIC(12,3) NOT NULL,
  qty_received NUMERIC(12,3),
  notes        TEXT
);

-- ── UPDATED_AT TRIGGERS ──────────────────────────────────────
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
