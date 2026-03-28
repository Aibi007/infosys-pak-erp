-- ============================================================
-- Migration 006: Sales — Invoices, Payments, Receipts
-- ============================================================

-- ── INVOICE SEQUENCE ────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 8001;

CREATE OR REPLACE FUNCTION next_invoice_number()
RETURNS TEXT AS $$
  SELECT 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 5, '0')
$$ LANGUAGE SQL;

-- ── INVOICES (Sales) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number    VARCHAR(30)   NOT NULL UNIQUE DEFAULT next_invoice_number(),
  branch_id         UUID          NOT NULL REFERENCES branches(id),
  customer_id       UUID          REFERENCES customers(id),   -- NULL = walk-in
  customer_name     VARCHAR(255),                             -- snapshot for walk-in
  customer_phone    VARCHAR(20),
  invoice_date      DATE          NOT NULL DEFAULT CURRENT_DATE,
  due_date          DATE,
  status            VARCHAR(20)   NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','confirmed','partially_paid','paid','voided','refunded')),
  payment_mode      VARCHAR(30)   DEFAULT 'cash'
                      CHECK (payment_mode IN ('cash','bank_transfer','cheque','credit','split','easypaisa','jazzcash')),
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,         -- before discount + tax
  discount_pct      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid       NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_due        NUMERIC(12,2) GENERATED ALWAYS AS (grand_total - amount_paid) STORED,
  notes             TEXT,
  notes_ur          TEXT,
  -- FBR fields
  fbr_invoice_no    BIGINT,
  fbr_qr_code       TEXT,
  fbr_status        VARCHAR(20)   NOT NULL DEFAULT 'pending'
                      CHECK (fbr_status IN ('not_applicable','pending','sent','success','failed')),
  -- Meta
  cashier_id        UUID          NOT NULL,                   -- user who created
  pos_session_id    UUID,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  voided_at         TIMESTAMPTZ,
  voided_by         UUID,
  void_reason       TEXT
);

CREATE INDEX idx_invoices_number      ON invoices(invoice_number);
CREATE INDEX idx_invoices_customer    ON invoices(customer_id);
CREATE INDEX idx_invoices_date        ON invoices(invoice_date DESC);
CREATE INDEX idx_invoices_status      ON invoices(status);
CREATE INDEX idx_invoices_fbr_status  ON invoices(fbr_status);
CREATE INDEX idx_invoices_due         ON invoices(amount_due) WHERE amount_due > 0;
CREATE INDEX idx_invoices_branch      ON invoices(branch_id);

-- ── INVOICE ITEMS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id      UUID          NOT NULL REFERENCES products(id),
  variant_id      UUID          REFERENCES product_variants(id),
  product_name    VARCHAR(255)  NOT NULL,                     -- snapshot
  variant_label   VARCHAR(100),                               -- snapshot e.g. "Red / M"
  sku             VARCHAR(60)   NOT NULL,
  qty             NUMERIC(12,3) NOT NULL,
  unit_price      NUMERIC(12,2) NOT NULL,
  discount_pct    NUMERIC(5,2)  NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(5,2)  NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total      NUMERIC(12,2) NOT NULL,                     -- after discount + tax
  cost_price      NUMERIC(12,2) NOT NULL DEFAULT 0,           -- for margin calc
  sort_order      INT           NOT NULL DEFAULT 0
);

CREATE INDEX idx_inv_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_inv_items_product ON invoice_items(product_id);

-- ── INVOICE PAYMENTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_payments (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_date  DATE          NOT NULL DEFAULT CURRENT_DATE,
  amount        NUMERIC(12,2) NOT NULL,
  payment_mode  VARCHAR(30)   NOT NULL
                  CHECK (payment_mode IN ('cash','hbl_transfer','mcb_transfer','cheque','easypaisa','jazzcash','other')),
  reference_no  VARCHAR(100),           -- cheque no, transaction ID
  bank_name     VARCHAR(100),
  notes         TEXT,
  created_by    UUID          NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX idx_payments_date    ON invoice_payments(payment_date DESC);

-- ── SALES RETURNS (Credit Notes) ────────────────────────────
CREATE SEQUENCE IF NOT EXISTS credit_note_seq START 1;

CREATE TABLE IF NOT EXISTS credit_notes (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  cn_number       VARCHAR(30)   NOT NULL UNIQUE,
  invoice_id      UUID          NOT NULL REFERENCES invoices(id),
  customer_id     UUID          REFERENCES customers(id),
  return_date     DATE          NOT NULL DEFAULT CURRENT_DATE,
  status          VARCHAR(20)   NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','confirmed','applied','refunded')),
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason          TEXT,
  created_by      UUID          NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_note_items (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id  UUID          NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  invoice_item_id UUID          REFERENCES invoice_items(id),
  product_id      UUID          NOT NULL REFERENCES products(id),
  variant_id      UUID          REFERENCES product_variants(id),
  qty_returned    NUMERIC(12,3) NOT NULL,
  unit_price      NUMERIC(12,2) NOT NULL,
  return_to_stock BOOLEAN       NOT NULL DEFAULT TRUE
);

-- ── POS SESSIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_sessions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID          NOT NULL REFERENCES branches(id),
  cashier_id      UUID          NOT NULL,
  opened_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  opening_cash    NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_cash   NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_cash    NUMERIC(12,2),
  cash_difference NUMERIC(12,2) GENERATED ALWAYS AS (closing_cash - expected_cash) STORED,
  total_sales     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_returns   NUMERIC(12,2) NOT NULL DEFAULT 0,
  invoice_count   INT           NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','closed'))
);

-- ── TRIGGER: invoice updated_at ──────────────────────────────
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── FUNCTION: update invoice totals after item insert/update ─
CREATE OR REPLACE FUNCTION recalc_invoice_totals(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_subtotal      NUMERIC(12,2);
  v_discount      NUMERIC(12,2);
  v_tax           NUMERIC(12,2);
  v_grand         NUMERIC(12,2);
  v_paid          NUMERIC(12,2);
  v_status        VARCHAR(20);
BEGIN
  SELECT
    COALESCE(SUM(qty * unit_price), 0),
    COALESCE(SUM(discount_amount), 0),
    COALESCE(SUM(tax_amount), 0),
    COALESCE(SUM(line_total), 0)
  INTO v_subtotal, v_discount, v_tax, v_grand
  FROM invoice_items WHERE invoice_id = p_invoice_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM invoice_payments WHERE invoice_id = p_invoice_id;

  v_status := CASE
    WHEN v_paid >= v_grand THEN 'paid'
    WHEN v_paid > 0        THEN 'partially_paid'
    ELSE 'confirmed'
  END;

  UPDATE invoices SET
    subtotal       = v_subtotal,
    discount_amount= v_discount,
    tax_amount     = v_tax,
    grand_total    = v_grand,
    amount_paid    = v_paid,
    status         = CASE WHEN status = 'voided' THEN 'voided' ELSE v_status END
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;
