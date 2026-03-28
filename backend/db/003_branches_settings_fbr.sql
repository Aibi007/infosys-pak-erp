-- ============================================================
-- Migration 003: Branches, Settings, FBR Config
-- Runs inside each tenant schema
-- ============================================================

-- ── BRANCHES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  name_ur      VARCHAR(255),
  code         VARCHAR(20)  NOT NULL UNIQUE,         -- 'LHR-01', 'KHI-01'
  address      TEXT,
  city         VARCHAR(100),
  phone        VARCHAR(20),
  email        VARCHAR(255),
  is_main      BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  settings     JSONB        NOT NULL DEFAULT '{}',   -- branch-level overrides
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed: main branch
INSERT INTO branches (name, name_ur, code, city, is_main) VALUES
  ('Main Branch - Lahore', 'مین برانچ - لاہور', 'LHR-01', 'Lahore', TRUE);

-- ── SYSTEM SETTINGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT         NOT NULL,
  value_type  VARCHAR(20)  NOT NULL DEFAULT 'string'
                CHECK (value_type IN ('string','integer','boolean','json')),
  description TEXT,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_by  UUID
);

INSERT INTO system_settings (key, value, value_type, description) VALUES
  ('company.name',         'Al-Baraka Textiles',        'string',  'Company display name'),
  ('company.name_ur',      'البرکہ ٹیکسٹائلز',          'string',  'Company name in Urdu'),
  ('company.ntn',          '1234567-8',                 'string',  'National Tax Number'),
  ('company.strn',         '12-34-5678-901-23',         'string',  'Sales Tax Registration Number'),
  ('company.address',      '12-B, Ferozepur Road, Lahore','string','Registered address'),
  ('company.phone',        '042-35710001',              'string',  'Main phone'),
  ('company.email',        'info@albaraka.pk',          'string',  'Main email'),
  ('system.lang',          'en',                        'string',  'Default UI language (en|ur)'),
  ('system.currency',      'PKR',                       'string',  'Currency code'),
  ('system.date_format',   'DD/MM/YYYY',                'string',  'Date format'),
  ('system.fiscal_year',   '07',                        'string',  'Fiscal year start month (07=July)'),
  ('system.tax_rate',      '17',                        'string',  'Default GST % (0 for most textile)'),
  ('pos.receipt_width',    '80',                        'integer', 'Thermal printer width mm'),
  ('pos.auto_fbr_sync',    'true',                      'boolean', 'Auto-sync invoices to FBR'),
  ('pos.cash_drawer',      'false',                     'boolean', 'Cash drawer connected'),
  ('pos.barcode_scanner',  'true',                      'boolean', 'Barcode scanner connected'),
  ('inventory.low_stock',  '10',                        'integer', 'Low stock alert threshold'),
  ('inventory.method',     'FIFO',                      'string',  'Costing method (FIFO|LIFO|AVG)'),
  ('hr.eobi_rate',         '1066',                      'integer', 'EOBI monthly contribution PKR'),
  ('hr.working_days',      '26',                        'integer', 'Working days per month'),
  ('hr.overtime_rate',     '1.5',                       'string',  'Overtime multiplier');

-- ── FBR CONFIGURATION ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS fbr_config (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID         NOT NULL REFERENCES branches(id),
  pos_id          VARCHAR(50)  NOT NULL,              -- FBR-assigned POS ID
  integration_id  VARCHAR(100) NOT NULL,              -- PRAL integration ID
  user_id_fbr     VARCHAR(100) NOT NULL,              -- FBR PRAL username
  password_enc    TEXT         NOT NULL,              -- AES-256 encrypted
  api_endpoint    TEXT         NOT NULL DEFAULT 'https://esp.fbr.gov.pk:8244/ESP/api',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  last_sync_at    TIMESTAMPTZ,
  last_invoice_no BIGINT       NOT NULL DEFAULT 0,    -- FBR sequential invoice counter
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (branch_id)
);

-- ── FBR TRANSMISSION LOG ────────────────────────────────────
CREATE TABLE IF NOT EXISTS fbr_transmissions (
  id              BIGSERIAL    PRIMARY KEY,
  invoice_id      UUID         NOT NULL,              -- references sales.invoices
  fbr_invoice_no  BIGINT,                             -- assigned by FBR on success
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sent','success','failed','retry')),
  request_payload JSONB,
  response_body   JSONB,
  http_status     INT,
  error_msg       TEXT,
  attempt_no      INT          NOT NULL DEFAULT 1,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fbr_trans_invoice ON fbr_transmissions(invoice_id);
CREATE INDEX idx_fbr_trans_status  ON fbr_transmissions(status);

-- ── UPDATED_AT TRIGGERS ──────────────────────────────────────
CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_fbr_config_updated_at
  BEFORE UPDATE ON fbr_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
