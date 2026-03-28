-- ============================================================
-- Migration 009: HR & Payroll
-- Employees · Attendance · Payroll Runs · Leave Management
-- ============================================================

-- ── DEPARTMENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  name_ur     VARCHAR(100),
  code        VARCHAR(20)  NOT NULL UNIQUE,
  head_emp_id UUID,                                -- self-ref, set after employees created
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO departments (name, name_ur, code) VALUES
  ('Management', 'انتظام',     'MGMT'),
  ('Sales',      'فروخت',      'SALES'),
  ('Accounts',   'اکاؤنٹس',   'ACCTS'),
  ('Warehouse',  'گودام',      'WH'),
  ('IT',         'آئی ٹی',     'IT'),
  ('HR',         'ایچ آر',     'HR'),
  ('Security',   'سیکیورٹی',  'SEC');

-- ── EMPLOYEE SEQUENCE ────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS employee_number_seq START 1;

CREATE OR REPLACE FUNCTION next_employee_id()
RETURNS TEXT AS $$
  SELECT 'EMP-' || LPAD(nextval('employee_number_seq')::TEXT, 3, '0')
$$ LANGUAGE SQL;

-- ── EMPLOYEES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     VARCHAR(20)   NOT NULL UNIQUE DEFAULT next_employee_id(),
  branch_id       UUID          NOT NULL REFERENCES branches(id),
  department_id   UUID          NOT NULL REFERENCES departments(id),
  user_id         UUID,                             -- references public.users(id), nullable (some staff no login)
  full_name       VARCHAR(255)  NOT NULL,
  full_name_ur    VARCHAR(255),
  designation     VARCHAR(100)  NOT NULL,
  designation_ur  VARCHAR(100),
  gender          VARCHAR(10)   NOT NULL CHECK (gender IN ('male','female','other')),
  dob             DATE,
  cnic            VARCHAR(20)   UNIQUE,
  phone           VARCHAR(20),
  email           VARCHAR(255),
  address         TEXT,
  city            VARCHAR(100),
  joining_date    DATE          NOT NULL,
  leaving_date    DATE,
  status          VARCHAR(20)   NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','on_leave','suspended','resigned','terminated')),
  employment_type VARCHAR(20)   NOT NULL DEFAULT 'permanent'
                    CHECK (employment_type IN ('permanent','contract','probation','part_time')),
  photo_url       TEXT,
  -- Salary (snapshot; actual monthly in payroll_employees)
  basic_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
  meta            JSONB         NOT NULL DEFAULT '{}',
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_dept   ON employees(department_id);
CREATE INDEX idx_employees_branch ON employees(branch_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_cnic   ON employees(cnic);

-- ── SALARY COMPONENTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS salary_components (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  name_ur     VARCHAR(100),
  type        VARCHAR(20)  NOT NULL CHECK (type IN ('allowance','deduction')),
  is_fixed    BOOLEAN      NOT NULL DEFAULT TRUE,   -- fixed amt vs calculated
  is_taxable  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order  INT          NOT NULL DEFAULT 0
);

INSERT INTO salary_components (name, name_ur, type, is_fixed, is_taxable, is_system, sort_order) VALUES
  ('Basic Salary',       'بنیادی تنخواہ',  'allowance', TRUE,  TRUE,  TRUE,  1),
  ('House Allowance',    'گھر الاؤنس',     'allowance', TRUE,  FALSE, FALSE, 2),
  ('Transport Allowance','ٹرانسپورٹ',      'allowance', TRUE,  FALSE, FALSE, 3),
  ('Medical Allowance',  'طبی الاؤنس',     'allowance', TRUE,  FALSE, FALSE, 4),
  ('Performance Bonus',  'کارکردگی بونس',  'allowance', FALSE, TRUE,  FALSE, 5),
  ('Overtime',           'اضافی وقت',      'allowance', FALSE, TRUE,  FALSE, 6),
  ('Income Tax',         'آمدن ٹیکس',      'deduction', FALSE, FALSE, TRUE,  7),
  ('EOBI',               'ای او بی آئی',   'deduction', TRUE,  FALSE, TRUE,  8),
  ('Loan Repayment',     'قرض واپسی',      'deduction', TRUE,  FALSE, FALSE, 9),
  ('Absent Deduction',   'غیر حاضری',      'deduction', FALSE, FALSE, TRUE, 10),
  ('Late Deduction',     'دیر',            'deduction', FALSE, FALSE, TRUE, 11);

-- ── EMPLOYEE SALARY STRUCTURE ────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_salaries (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  component_id    UUID          NOT NULL REFERENCES salary_components(id),
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  effective_from  DATE          NOT NULL DEFAULT CURRENT_DATE,
  effective_to    DATE,
  UNIQUE (employee_id, component_id, effective_from)
);

CREATE INDEX idx_emp_salaries_emp ON employee_salaries(employee_id);

-- ── ATTENDANCE RECORDS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID         NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_date DATE         NOT NULL,
  status          VARCHAR(10)  NOT NULL DEFAULT 'P'
                    CHECK (status IN ('P','A','H','L','HD','LE','WO')),
                    -- P=Present A=Absent H=Holiday L=Late HD=HalfDay LE=Leave WO=WeekOff
  check_in        TIME,
  check_out       TIME,
  minutes_late    INT          NOT NULL DEFAULT 0,
  overtime_mins   INT          NOT NULL DEFAULT 0,
  notes           TEXT,
  marked_by       UUID,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, attendance_date)
);

CREATE INDEX idx_attendance_emp  ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date DESC);

-- ── LEAVE TYPES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_types (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(50)  NOT NULL UNIQUE,
  name_ur       VARCHAR(50),
  annual_quota  INT          NOT NULL DEFAULT 0,
  is_paid       BOOLEAN      NOT NULL DEFAULT TRUE,
  carry_forward BOOLEAN      NOT NULL DEFAULT FALSE,
  max_carry     INT          NOT NULL DEFAULT 0,
  sort_order    INT          NOT NULL DEFAULT 0
);

INSERT INTO leave_types (name, name_ur, annual_quota, is_paid, carry_forward, sort_order) VALUES
  ('Annual Leave',    'سالانہ چھٹی',  21, TRUE,  TRUE,  10,  1),
  ('Sick Leave',      'بیماری چھٹی',  10, TRUE,  FALSE,  0,  2),
  ('Casual Leave',    'اتفاقی چھٹی',  10, TRUE,  FALSE,  0,  3),
  ('Maternity Leave', 'زچگی چھٹی',    90, TRUE,  FALSE,  0,  4),
  ('Paternity Leave', 'ابوت چھٹی',     7, TRUE,  FALSE,  0,  5),
  ('Unpaid Leave',    'بلا تنخواہ',    0,  FALSE, FALSE,  0,  6);

-- ── LEAVE BALANCES (per employee per year) ───────────────────
CREATE TABLE IF NOT EXISTS leave_balances (
  id              UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID   NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id   UUID   NOT NULL REFERENCES leave_types(id),
  year            INT    NOT NULL,
  quota           INT    NOT NULL DEFAULT 0,
  used            INT    NOT NULL DEFAULT 0,
  pending         INT    NOT NULL DEFAULT 0,    -- applied but not yet approved
  carried_forward INT    NOT NULL DEFAULT 0,
  available       INT    GENERATED ALWAYS AS (quota + carried_forward - used - pending) STORED,
  UNIQUE (employee_id, leave_type_id, year)
);

CREATE INDEX idx_leave_bal_emp ON leave_balances(employee_id);

-- ── LEAVE REQUESTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID         NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id   UUID         NOT NULL REFERENCES leave_types(id),
  from_date       DATE         NOT NULL,
  to_date         DATE         NOT NULL,
  total_days      INT          NOT NULL,
  reason          TEXT,
  reason_ur       TEXT,
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','withdrawn','cancelled')),
  applied_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  CHECK (to_date >= from_date)
);

CREATE INDEX idx_leave_req_emp    ON leave_requests(employee_id);
CREATE INDEX idx_leave_req_status ON leave_requests(status);
CREATE INDEX idx_leave_req_dates  ON leave_requests(from_date, to_date);

-- ── PAYROLL RUNS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_runs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  month           INT          NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            INT          NOT NULL,
  branch_id       UUID         NOT NULL REFERENCES branches(id),
  status          VARCHAR(20)  NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','processing','approved','paid','cancelled')),
  total_gross     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net       NUMERIC(14,2) NOT NULL DEFAULT 0,
  employee_count  INT           NOT NULL DEFAULT 0,
  processed_by    UUID,
  processed_at    TIMESTAMPTZ,
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (month, year, branch_id)
);

-- ── PAYROLL DETAILS (per employee per run) ───────────────────
CREATE TABLE IF NOT EXISTS payroll_details (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id      UUID          NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id         UUID          NOT NULL REFERENCES employees(id),
  -- Attendance summary
  days_present        INT           NOT NULL DEFAULT 0,
  days_absent         INT           NOT NULL DEFAULT 0,
  days_late           INT           NOT NULL DEFAULT 0,
  days_half           INT           NOT NULL DEFAULT 0,
  days_leave          INT           NOT NULL DEFAULT 0,
  overtime_hours      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  -- Earnings
  basic_salary        NUMERIC(12,2) NOT NULL DEFAULT 0,
  house_allowance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  medical_allowance   NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowances    NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_earnings      NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Deductions
  absent_deduction    NUMERIC(12,2) NOT NULL DEFAULT 0,
  late_deduction      NUMERIC(12,2) NOT NULL DEFAULT 0,
  income_tax          NUMERIC(12,2) NOT NULL DEFAULT 0,
  eobi_deduction      NUMERIC(12,2) NOT NULL DEFAULT 0,
  loan_deduction      NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deductions    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions    NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Net
  net_pay             NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_mode        VARCHAR(30)   NOT NULL DEFAULT 'bank_transfer',
  paid_at             TIMESTAMPTZ,
  UNIQUE (payroll_run_id, employee_id)
);

CREATE INDEX idx_payroll_details_run ON payroll_details(payroll_run_id);
CREATE INDEX idx_payroll_details_emp ON payroll_details(employee_id);

-- ── PAYSLIP VIEW ─────────────────────────────────────────────
CREATE OR REPLACE VIEW v_payslips AS
SELECT
  pd.id,
  pr.month, pr.year,
  e.employee_id, e.full_name, e.full_name_ur, e.designation,
  d.name AS department, d.name_ur AS department_ur,
  pd.days_present, pd.days_absent, pd.days_late,
  pd.basic_salary, pd.house_allowance, pd.transport_allowance,
  pd.medical_allowance, pd.overtime_amount,
  pd.gross_earnings,
  pd.absent_deduction, pd.late_deduction,
  pd.income_tax, pd.eobi_deduction, pd.loan_deduction,
  pd.total_deductions, pd.net_pay,
  pr.status AS payroll_status
FROM payroll_details pd
JOIN payroll_runs pr ON pr.id = pd.payroll_run_id
JOIN employees e     ON e.id = pd.employee_id
JOIN departments d   ON d.id = e.department_id;

-- ── UPDATED_AT TRIGGERS ──────────────────────────────────────
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_payroll_runs_updated_at
  BEFORE UPDATE ON payroll_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
