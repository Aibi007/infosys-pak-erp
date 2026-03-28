-- ============================================================
-- Migration 005: Customers, Vendors, Pricing Tiers
-- ============================================================

-- ── CUSTOMER TYPES / TIERS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_tiers (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(50)  NOT NULL UNIQUE,  -- 'Retail','Wholesale','Distributor','VIP'
  name_ur         VARCHAR(50),
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  credit_days     INT          NOT NULL DEFAULT 0,
  min_order_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order      INT          NOT NULL DEFAULT 0
);

INSERT INTO customer_tiers (name, name_ur, discount_pct, credit_days, sort_order) VALUES
  ('Walk-in',     'واک ان',       0,    0,  1),
  ('Retail',      'خردہ',        2,   15,  2),
  ('Wholesale',   'تھوک',         5,   30,  3),
  ('Distributor', 'ڈسٹریبیوٹر',  8,   45,  4),
  ('VIP',         'وی آئی پی',   10,  60,  5);

-- ── CUSTOMERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID          REFERENCES branches(id),  -- NULL = shared across branches
  code            VARCHAR(20)   NOT NULL UNIQUE,          -- 'CUS-001'
  name            VARCHAR(255)  NOT NULL,
  name_ur         VARCHAR(255),
  contact_person  VARCHAR(255),
  phone           VARCHAR(20),
  whatsapp        VARCHAR(20),
  email           VARCHAR(255),
  cnic            VARCHAR(20)   UNIQUE,
  ntn             VARCHAR(20),
  address         TEXT,
  city            VARCHAR(100),
  tier_id         UUID          REFERENCES customer_tiers(id),
  credit_limit    NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_terms   INT           NOT NULL DEFAULT 0,       -- net days
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,       -- positive = owes us
  total_sales     NUMERIC(14,2) NOT NULL DEFAULT 0,       -- lifetime
  rating          SMALLINT      NOT NULL DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
  status          VARCHAR(20)   NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','blacklisted')),
  notes           TEXT,
  meta            JSONB         NOT NULL DEFAULT '{}',
  last_invoice_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_code    ON customers(code);
CREATE INDEX idx_customers_phone   ON customers(phone);
CREATE INDEX idx_customers_cnic    ON customers(cnic);
CREATE INDEX idx_customers_status  ON customers(status);
CREATE INDEX idx_customers_balance ON customers(current_balance) WHERE current_balance > 0;
CREATE INDEX idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);

-- Customer code sequence
CREATE SEQUENCE IF NOT EXISTS customer_code_seq START 1;

CREATE OR REPLACE FUNCTION next_customer_code()
RETURNS TEXT AS $$
  SELECT 'CUS-' || LPAD(nextval('customer_code_seq')::TEXT, 3, '0')
$$ LANGUAGE SQL;

-- ── VENDORS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(20)   NOT NULL UNIQUE,          -- 'VND-001'
  name            VARCHAR(255)  NOT NULL,
  name_ur         VARCHAR(255),
  contact_person  VARCHAR(255),
  phone           VARCHAR(20),
  email           VARCHAR(255),
  ntn             VARCHAR(20),
  strn            VARCHAR(20),
  address         TEXT,
  city            VARCHAR(100),
  vendor_type     VARCHAR(50)   NOT NULL DEFAULT 'supplier'
                    CHECK (vendor_type IN ('manufacturer','brand','mill','supplier','importer')),
  payment_terms   INT           NOT NULL DEFAULT 30,
  credit_limit    NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,       -- positive = we owe them
  total_purchases NUMERIC(14,2) NOT NULL DEFAULT 0,
  rating          SMALLINT      NOT NULL DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
  status          VARCHAR(20)   NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','blacklisted')),
  bank_name       VARCHAR(100),
  bank_account    VARCHAR(50),
  iban            VARCHAR(50),
  notes           TEXT,
  meta            JSONB         NOT NULL DEFAULT '{}',
  last_purchase_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendors_code   ON vendors(code);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_name_trgm ON vendors USING GIN (name gin_trgm_ops);

CREATE SEQUENCE IF NOT EXISTS vendor_code_seq START 1;

CREATE OR REPLACE FUNCTION next_vendor_code()
RETURNS TEXT AS $$
  SELECT 'VND-' || LPAD(nextval('vendor_code_seq')::TEXT, 3, '0')
$$ LANGUAGE SQL;

-- ── PRICE LISTS ─────────────────────────────────────────────
-- Allows override prices per product/variant per tier or per customer
CREATE TABLE IF NOT EXISTS price_lists (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100)  NOT NULL,
  tier_id     UUID          REFERENCES customer_tiers(id),
  customer_id UUID          REFERENCES customers(id),     -- NULL = applies to whole tier
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  valid_from  DATE,
  valid_to    DATE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CHECK (tier_id IS NOT NULL OR customer_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS price_list_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID          NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  product_id    UUID          NOT NULL REFERENCES products(id),
  variant_id    UUID          REFERENCES product_variants(id),
  price         NUMERIC(12,2) NOT NULL,
  discount_pct  NUMERIC(5,2),
  UNIQUE (price_list_id, product_id, variant_id)
);

-- ── UPDATED_AT TRIGGERS ──────────────────────────────────────
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
