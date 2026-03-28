-- ============================================================
-- Migration 008: Accounting
-- Chart of Accounts · Vouchers · GL Entries · Periods
-- ============================================================

-- ── FISCAL PERIODS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fiscal_periods (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL,        -- 'July 2023 - June 2024'
  start_date  DATE        NOT NULL,
  end_date    DATE        NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','closed','locked')),
  closed_at   TIMESTAMPTZ,
  closed_by   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (start_date, end_date)
);

-- Current fiscal year (Pakistan: July-June)
INSERT INTO fiscal_periods (name, start_date, end_date) VALUES
  ('FY 2023-2024', '2023-07-01', '2024-06-30');

-- ── ACCOUNT TYPES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_types (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL UNIQUE,    -- 'Asset','Liability','Equity','Revenue','Expense'
  name_ur     VARCHAR(50),
  normal_side VARCHAR(10) NOT NULL CHECK (normal_side IN ('debit','credit')),
  sort_order  INT         NOT NULL DEFAULT 0
);

INSERT INTO account_types (name, name_ur, normal_side, sort_order) VALUES
  ('Asset',     'اثاثہ',    'debit',  1),
  ('Liability', 'واجب',     'credit', 2),
  ('Equity',    'حصص',      'credit', 3),
  ('Revenue',   'آمدن',     'credit', 4),
  ('Expense',   'اخراجات', 'debit',  5);

-- ── CHART OF ACCOUNTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID          REFERENCES accounts(id),
  account_type_id UUID          NOT NULL REFERENCES account_types(id),
  code            VARCHAR(20)   NOT NULL UNIQUE,   -- '1000','1001','1010'
  name            VARCHAR(255)  NOT NULL,
  name_ur         VARCHAR(255),
  level           SMALLINT      NOT NULL DEFAULT 1, -- 1=root,2=group,3=ledger,4=sub-ledger
  is_posting      BOOLEAN       NOT NULL DEFAULT TRUE,  -- leaf = can post entries
  is_system       BOOLEAN       NOT NULL DEFAULT FALSE, -- created by system, cannot delete
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  description     TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_code   ON accounts(code);
CREATE INDEX idx_accounts_parent ON accounts(parent_id);
CREATE INDEX idx_accounts_type   ON accounts(account_type_id);

-- Seed: Standard Chart of Accounts for a Pakistani textile retailer
DO $$
DECLARE
  t_asset   UUID; t_liab UUID; t_equity UUID; t_rev UUID; t_exp UUID;
  a1000 UUID; a1100 UUID; a1200 UUID; a1300 UUID;
  a2000 UUID; a3000 UUID; a4000 UUID; a5000 UUID; a6000 UUID;
BEGIN
  SELECT id INTO t_asset   FROM account_types WHERE name='Asset';
  SELECT id INTO t_liab    FROM account_types WHERE name='Liability';
  SELECT id INTO t_equity  FROM account_types WHERE name='Equity';
  SELECT id INTO t_rev     FROM account_types WHERE name='Revenue';
  SELECT id INTO t_exp     FROM account_types WHERE name='Expense';

  -- ASSETS (1000s)
  INSERT INTO accounts (code,name,name_ur,account_type_id,level,is_posting,is_system)
    VALUES ('1000','Current Assets','موجودہ اثاثے',t_asset,1,FALSE,TRUE) RETURNING id INTO a1000;
  INSERT INTO accounts (code,name,name_ur,account_type_id,parent_id,level,is_posting,is_system) VALUES
    ('1001','Cash in Hand',        'نقد ہاتھ میں',    t_asset,a1000,3,TRUE,TRUE),
    ('1010','HBL Bank Account',    'ایچ بی ایل بینک', t_asset,a1000,3,TRUE,TRUE),
    ('1011','MCB Bank Account',    'ایم سی بی بینک',  t_asset,a1000,3,TRUE,TRUE),
    ('1020','Petty Cash',          'پیٹی کیش',        t_asset,a1000,3,TRUE,TRUE);

  INSERT INTO accounts (code,name,name_ur,account_type_id,parent_id,level,is_posting,is_system)
    VALUES ('1100','Accounts Receivable','وصولیاں',t_asset,a1000,2,FALSE,TRUE) RETURNING id INTO a1100;
  INSERT INTO accounts (code,name,name_ur,account_type_id,parent_id,level,is_posting,is_system) VALUES
    ('1101','Trade Receivables',   'تجارتی وصولیاں',  t_asset,a1100,3,TRUE,TRUE),
    ('1102','Advance to Vendors',  'سپلائر ایڈوانس',  t_asset,a1100,3,TRUE,TRUE);

  INSERT INTO accounts (code,name,name_ur,account_type_id,parent_id,level,is_posting,is_system)
    VALUES ('1200','Inventory',    'انوینٹری',         t_asset,a1000,2,FALSE,TRUE) RETURNING id INTO a1200;
  INSERT INTO accounts (code,name,name_ur,account_type_id,parent_id,level,is_posting,is_system) VALUES
    ('1201','Finished Goods',      'تیار مال',         t_asset,a1200,3,TRUE,TRUE),
    ('1202','Raw Materials',       'خام مال',          t_asset,a1200,3,TRUE,TRUE);

  INSERT INTO accounts (code,name,name_ur,account_type_id,parent_id,level,is_posting,is_system)
    VALUES ('1300','Fixed Assets', 'مستقل اثاثے',      t_asset,NULL,1,FALSE,TRUE) RETURNING id INTO a1300;
  INSERT INTO accounts (code,name,name_ur,account_type_id,parent_id,level,is_posting,is_system) VALUES
    ('1301','Furniture & Fixtures','فرنیچر',           t_asset,a1300,3,TRUE,TRUE),
    ('1302','Computer Equipment',  'کمپیوٹر',          t_asset,a1300,3,TRUE,TRUE),
    ('1303','Vehicles',            'گاڑیاں',           t_asset,a1300,3,TRUE,TRUE);

  -- LIABILITIES (2000s)
  INSERT INTO accounts (code,name,name_ur,account_type_id,level,is_posting,is_system)
    VALUES ('2000','Current Liabilities','موجودہ واجبات',t_liab,1,FALSE,TRUE) RETURNING id INTO a2000;
  INSERT INTO accounts (code,name,name_ur,account_type_id,parent_id,level,is_posting,is_system) VALUES
    ('2001','Accounts Payable',    'ادائیگیاں',        t_liab,a2000,3,TRUE,TRUE),
    ('2010','Sales Tax Payable',   'سیلز ٹیکس',        t_liab,a2000,3,TRUE,TRUE),
    ('2011','EOBI Payable',        'ای او بی آئی',     t_liab,a2000,3,TRUE,TRUE),
    ('2020','Salary Payable',      'تنخواہ واجب',      t_liab,a2000,3,TRUE,TRUE),
    ('2030','Short-term Loans',    'قلیل مدتی قرض',   t_liab,a2000,3,TRUE,TRUE);

  -- EQUITY (3000s)
  INSERT INTO accounts (code,name,name_ur,account_type_id,level,is_posting,is_system)
    VALUES ('3000','Equity','حصص',t_equity,1,FALSE,TRUE) RETURNING id INTO a3000;
  INSERT INTO accounts (code,name,name_ur,account_type_id,parent_id,level,is_posting,is_system) VALUES
    ('3001','Owner Capital',       'سرمایہ',           t_equity,a3000,3,TRUE,TRUE),
    ('3002','Retained Earnings',   'محفوظ آمدن',       t_equity,a3000,3,TRUE,TRUE),
    ('3003','Current Year Profit', 'سالانہ منافع',     t_equity,a3000,3,TRUE,TRUE);

  -- REVENUE (4000s)
  INSERT INTO accounts (code,name,name_ur,account_type_id,level,is_posting,is_system)
    VALUES ('4000','Revenue','آمدن',t_rev,1,FALSE,TRUE) RETURNING id INTO a4000;
  INSERT INTO accounts (code,name,name_ur,account_type_id,parent_id,level,is_posting,is_system) VALUES
    ('4001','Sales Revenue',       'فروخت آمدن',       t_rev,a4000,3,TRUE,TRUE),
    ('4002','Wholesale Revenue',   'تھوک آمدن',        t_rev,a4000,3,TRUE,TRUE),
    ('4003','Sales Returns',       'فروخت واپسی',      t_rev,a4000,3,TRUE,TRUE),
    ('4004','Discount Allowed',    'رعایت',            t_rev,a4000,3,TRUE,TRUE);

  -- EXPENSES (5000s + 6000s)
  INSERT INTO accounts (code,name,name_ur,account_type_id,level,is_posting,is_system)
    VALUES ('5000','Cost of Goods Sold','فروختہ مال کی لاگت',t_exp,1,FALSE,TRUE) RETURNING id INTO a5000;
  INSERT INTO accounts (code,name,name_ur,account_type_id,parent_id,level,is_posting,is_system) VALUES
    ('5001','Purchases',           'خریداری',          t_exp,a5000,3,TRUE,TRUE),
    ('5002','Purchase Returns',    'خریداری واپسی',    t_exp,a5000,3,TRUE,TRUE),
    ('5003','Freight Inward',      'مال برداری',       t_exp,a5000,3,TRUE,TRUE);

  INSERT INTO accounts (code,name,name_ur,account_type_id,level,is_posting,is_system)
    VALUES ('6000','Operating Expenses','آپریٹنگ اخراجات',t_exp,1,FALSE,TRUE) RETURNING id INTO a6000;
  INSERT INTO accounts (code,name,name_ur,account_type_id,parent_id,level,is_posting,is_system) VALUES
    ('6001','Salaries & Wages',    'تنخواہ و اجرت',   t_exp,a6000,3,TRUE,TRUE),
    ('6002','Rent',                'کرایہ',            t_exp,a6000,3,TRUE,TRUE),
    ('6003','Utilities',           'یوٹیلیٹیز',        t_exp,a6000,3,TRUE,TRUE),
    ('6004','Telephone',           'ٹیلیفون',          t_exp,a6000,3,TRUE,TRUE),
    ('6005','Transport',           'ٹرانسپورٹ',        t_exp,a6000,3,TRUE,TRUE),
    ('6006','Repairs',             'مرمت',             t_exp,a6000,3,TRUE,TRUE),
    ('6007','Depreciation',        'تنزل',             t_exp,a6000,3,TRUE,TRUE),
    ('6008','Miscellaneous',       'متفرق',            t_exp,a6000,3,TRUE,TRUE),
    ('6009','EOBI Contribution',   'ای او بی آئی',     t_exp,a6000,3,TRUE,TRUE),
    ('6010','Bank Charges',        'بینک اخراجات',     t_exp,a6000,3,TRUE,TRUE);
END;
$$;

-- ── VOUCHER TYPES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voucher_types (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code      VARCHAR(10) NOT NULL UNIQUE,    -- 'CRV','CPV','BRV','BPV','JV'
  name      VARCHAR(50) NOT NULL,
  name_ur   VARCHAR(50),
  prefix    VARCHAR(5)  NOT NULL,
  sort_order INT        NOT NULL DEFAULT 0
);

INSERT INTO voucher_types (code, name, name_ur, prefix, sort_order) VALUES
  ('CRV', 'Cash Receipt Voucher',   'نقد وصولی',     'CRV', 1),
  ('CPV', 'Cash Payment Voucher',   'نقد ادائیگی',   'CPV', 2),
  ('BRV', 'Bank Receipt Voucher',   'بینک وصولی',    'BRV', 3),
  ('BPV', 'Bank Payment Voucher',   'بینک ادائیگی',  'BPV', 4),
  ('JV',  'Journal Voucher',        'جرنل',          'JV',  5),
  ('SV',  'Sales Voucher',          'فروخت',         'SV',  6),
  ('PV',  'Purchase Voucher',       'خریداری',       'PV',  7);

-- ── VOUCHERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vouchers (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_type_id UUID          NOT NULL REFERENCES voucher_types(id),
  voucher_number  VARCHAR(30)   NOT NULL UNIQUE,
  voucher_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
  period_id       UUID          NOT NULL REFERENCES fiscal_periods(id),
  status          VARCHAR(20)   NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','posted','reversed')),
  narration       TEXT,
  narration_ur    TEXT,
  reference_type  VARCHAR(30),   -- 'invoice','grn','payroll','manual'
  reference_id    UUID,
  total_debit     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_credit    NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_balanced     BOOLEAN GENERATED ALWAYS AS (total_debit = total_credit) STORED,
  created_by      UUID          NOT NULL,
  posted_by       UUID,
  posted_at       TIMESTAMPTZ,
  reversed_by     UUID,
  reversed_at     TIMESTAMPTZ,
  reversal_of     UUID          REFERENCES vouchers(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vouchers_date   ON vouchers(voucher_date DESC);
CREATE INDEX idx_vouchers_period ON vouchers(period_id);
CREATE INDEX idx_vouchers_ref    ON vouchers(reference_type, reference_id);
CREATE INDEX idx_vouchers_status ON vouchers(status);

-- ── VOUCHER LINES (General Ledger entries) ───────────────────
CREATE TABLE IF NOT EXISTS voucher_lines (
  id              BIGSERIAL     PRIMARY KEY,
  voucher_id      UUID          NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  account_id      UUID          NOT NULL REFERENCES accounts(id),
  debit           NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit          NUMERIC(14,2) NOT NULL DEFAULT 0,
  narration       TEXT,
  cost_center     VARCHAR(50),  -- optional department/branch tagging
  sort_order      INT           NOT NULL DEFAULT 0,
  CHECK (debit = 0 OR credit = 0),         -- only one side per line
  CHECK (debit >= 0 AND credit >= 0)
);

CREATE INDEX idx_vlines_voucher ON voucher_lines(voucher_id);
CREATE INDEX idx_vlines_account ON voucher_lines(account_id);

-- ── FUNCTION: post voucher & update account balances ─────────
CREATE OR REPLACE FUNCTION post_voucher(p_voucher_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_debit   NUMERIC(14,2);
  v_credit  NUMERIC(14,2);
BEGIN
  -- Validate balance
  SELECT SUM(debit), SUM(credit)
  INTO v_debit, v_credit
  FROM voucher_lines WHERE voucher_id = p_voucher_id;

  IF v_debit <> v_credit THEN
    RAISE EXCEPTION 'Voucher is not balanced: DR=% CR=%', v_debit, v_credit;
  END IF;

  -- Update account balances
  UPDATE accounts a
  SET current_balance = current_balance +
    (SELECT SUM(vl.debit) - SUM(vl.credit) FROM voucher_lines vl WHERE vl.voucher_id = p_voucher_id AND vl.account_id = a.id)
  WHERE id IN (SELECT DISTINCT account_id FROM voucher_lines WHERE voucher_id = p_voucher_id);

  -- Mark posted
  UPDATE vouchers SET
    status     = 'posted',
    posted_by  = p_user_id,
    posted_at  = NOW(),
    total_debit  = v_debit,
    total_credit = v_credit
  WHERE id = p_voucher_id;
END;
$$ LANGUAGE plpgsql;

-- ── UPDATED_AT trigger for accounts ─────────────────────────
CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
