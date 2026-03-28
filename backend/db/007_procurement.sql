-- ============================================================
-- Migration 007: Procurement — Purchase Orders, GRN, AP
-- ============================================================

-- ── PO SEQUENCE ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;

CREATE OR REPLACE FUNCTION next_po_number()
RETURNS TEXT AS $$
  SELECT 'PO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('po_number_seq')::TEXT, 3, '0')
$$ LANGUAGE SQL;

-- ── PURCHASE ORDERS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number         VARCHAR(30)   NOT NULL UNIQUE DEFAULT next_po_number(),
  branch_id         UUID          NOT NULL REFERENCES branches(id),
  vendor_id         UUID          NOT NULL REFERENCES vendors(id),
  po_date           DATE          NOT NULL DEFAULT CURRENT_DATE,
  expected_date     DATE,
  status            VARCHAR(20)   NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','submitted','approved','partial','received','cancelled')),
  payment_terms     INT           NOT NULL DEFAULT 30,        -- net days
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid       NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_due        NUMERIC(12,2) GENERATED ALWAYS AS (grand_total - amount_paid) STORED,
  notes             TEXT,
  approved_by       UUID,
  approved_at       TIMESTAMPTZ,
  created_by        UUID          NOT NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_po_vendor  ON purchase_orders(vendor_id);
CREATE INDEX idx_po_status  ON purchase_orders(status);
CREATE INDEX idx_po_date    ON purchase_orders(po_date DESC);

-- ── PURCHASE ORDER ITEMS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id      UUID          NOT NULL REFERENCES products(id),
  variant_id      UUID          REFERENCES product_variants(id),
  product_name    VARCHAR(255)  NOT NULL,
  sku             VARCHAR(60)   NOT NULL,
  qty_ordered     NUMERIC(12,3) NOT NULL,
  qty_received    NUMERIC(12,3) NOT NULL DEFAULT 0,
  qty_pending     NUMERIC(12,3) GENERATED ALWAYS AS (qty_ordered - qty_received) STORED,
  unit_cost       NUMERIC(12,2) NOT NULL,
  tax_rate        NUMERIC(5,2)  NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total      NUMERIC(12,2) NOT NULL,
  sort_order      INT           NOT NULL DEFAULT 0
);

CREATE INDEX idx_po_items_po      ON purchase_order_items(po_id);
CREATE INDEX idx_po_items_product ON purchase_order_items(product_id);

-- ── GOODS RECEIPT NOTES ─────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS grn_number_seq START 1;

CREATE TABLE IF NOT EXISTS grn (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number      VARCHAR(30)   NOT NULL UNIQUE,
  po_id           UUID          REFERENCES purchase_orders(id),
  branch_id       UUID          NOT NULL REFERENCES branches(id),
  warehouse_id    UUID          NOT NULL REFERENCES warehouses(id),
  vendor_id       UUID          NOT NULL REFERENCES vendors(id),
  grn_date        DATE          NOT NULL DEFAULT CURRENT_DATE,
  status          VARCHAR(20)   NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','verified','posted','rejected')),
  vendor_invoice_no VARCHAR(50),                             -- vendor's own invoice number
  notes           TEXT,
  created_by      UUID          NOT NULL,
  verified_by     UUID,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grn_po     ON grn(po_id);
CREATE INDEX idx_grn_vendor ON grn(vendor_id);
CREATE INDEX idx_grn_status ON grn(status);

-- ── GRN ITEMS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grn_items (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id          UUID          NOT NULL REFERENCES grn(id) ON DELETE CASCADE,
  po_item_id      UUID          REFERENCES purchase_order_items(id),
  product_id      UUID          NOT NULL REFERENCES products(id),
  variant_id      UUID          REFERENCES product_variants(id),
  qty_received    NUMERIC(12,3) NOT NULL,
  qty_accepted    NUMERIC(12,3) NOT NULL,
  qty_rejected    NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit_cost       NUMERIC(12,2) NOT NULL,
  reject_reason   TEXT
);

CREATE INDEX idx_grn_items_grn     ON grn_items(grn_id);
CREATE INDEX idx_grn_items_product ON grn_items(product_id);

-- ── VENDOR PAYMENTS (AP) ─────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS ap_payment_seq START 1;

CREATE TABLE IF NOT EXISTS vendor_payments (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number  VARCHAR(30)   NOT NULL UNIQUE,
  po_id           UUID          REFERENCES purchase_orders(id),
  vendor_id       UUID          NOT NULL REFERENCES vendors(id),
  payment_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
  amount          NUMERIC(12,2) NOT NULL,
  payment_type    VARCHAR(20)   NOT NULL DEFAULT 'payment'
                    CHECK (payment_type IN ('advance','payment','debit_note','discount','adjustment')),
  payment_mode    VARCHAR(30)   NOT NULL
                    CHECK (payment_mode IN ('cash','hbl_transfer','mcb_transfer','cheque','easypaisa','other')),
  reference_no    VARCHAR(100),
  bank_name       VARCHAR(100),
  notes           TEXT,
  created_by      UUID          NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vp_vendor ON vendor_payments(vendor_id);
CREATE INDEX idx_vp_po     ON vendor_payments(po_id);
CREATE INDEX idx_vp_date   ON vendor_payments(payment_date DESC);

-- ── DEBIT NOTES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debit_notes (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  dn_number       VARCHAR(30)   NOT NULL UNIQUE,
  po_id           UUID          REFERENCES purchase_orders(id),
  vendor_id       UUID          NOT NULL REFERENCES vendors(id),
  dn_date         DATE          NOT NULL DEFAULT CURRENT_DATE,
  amount          NUMERIC(12,2) NOT NULL,
  reason          TEXT,
  status          VARCHAR(20)   NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','confirmed','applied')),
  created_by      UUID          NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── TRIGGERS ────────────────────────────────────────────────
CREATE TRIGGER trg_po_updated_at
  BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_grn_updated_at
  BEFORE UPDATE ON grn FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── FUNCTION: update PO status after GRN posting ─────────────
CREATE OR REPLACE FUNCTION update_po_receipt_status(p_po_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_ordered   NUMERIC;
  v_total_received  NUMERIC;
BEGIN
  SELECT
    SUM(qty_ordered),
    SUM(qty_received)
  INTO v_total_ordered, v_total_received
  FROM purchase_order_items WHERE po_id = p_po_id;

  UPDATE purchase_orders SET status =
    CASE
      WHEN v_total_received >= v_total_ordered THEN 'received'
      WHEN v_total_received > 0               THEN 'partial'
      ELSE status
    END
  WHERE id = p_po_id AND status NOT IN ('cancelled');
END;
$$ LANGUAGE plpgsql;
