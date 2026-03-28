-- ============================================================
-- Migration 002: Tenant Schema Provisioner + RBAC
-- Run once per new tenant: creates their private schema
-- and seeds roles/permissions into it.
-- ============================================================

-- ── TENANT SCHEMA PROVISIONER ───────────────────────────────
-- Called by the API after a tenant signs up.
-- Usage: SELECT provision_tenant_schema('albaraka_textiles');

CREATE OR REPLACE FUNCTION public.provision_tenant_schema(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
  -- Create isolated schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_slug);

  -- Grant app user access
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO erp_app', p_slug);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO erp_app', p_slug);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I
    GRANT USAGE, SELECT ON SEQUENCES TO erp_app', p_slug);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RBAC TABLES (live inside each tenant schema)
-- We define them here as templates; the migration runner
-- executes this file once per schema after provisioning.
-- ============================================================

-- In the actual runner, replace {{schema}} with the tenant slug.
-- Example run: psql -v schema=albaraka_textiles -f 002_rbac.sql

-- ── ROLES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50)  NOT NULL UNIQUE,       -- 'super_admin','admin','manager','cashier','viewer'
  display_name VARCHAR(100) NOT NULL,
  display_ur  VARCHAR(100),                       -- Urdu label
  description TEXT,
  is_system   BOOLEAN      NOT NULL DEFAULT FALSE, -- system roles can't be deleted
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Default roles seeded per tenant
INSERT INTO roles (name, display_name, display_ur, description, is_system) VALUES
  ('owner',    'Owner',          'مالک',           'Full access to everything',                        TRUE),
  ('admin',    'Administrator',  'ایڈمنسٹریٹر',   'All modules except tenant billing',               TRUE),
  ('manager',  'Branch Manager', 'برانچ مینیجر',  'Sales, inventory, reports; cannot edit settings', TRUE),
  ('cashier',  'Cashier',        'کیشئر',          'POS, receipts, basic sales only',                 TRUE),
  ('accountant','Accountant',    'اکاؤنٹنٹ',       'Accounting, payroll, reports; read-only inventory',TRUE),
  ('viewer',   'Viewer',         'مشاہدہ کنندہ',   'Read-only access to all modules',                 TRUE);

-- ── PERMISSIONS ─────────────────────────────────────────────
-- Granular permission strings: module:action
CREATE TABLE IF NOT EXISTS permissions (
  id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  module  VARCHAR(50) NOT NULL,   -- 'pos','inventory','accounting','hr','reports','settings'
  action  VARCHAR(50) NOT NULL,   -- 'read','create','update','delete','approve','export'
  name    VARCHAR(100) GENERATED ALWAYS AS (module || ':' || action) STORED UNIQUE,
  description TEXT
);

INSERT INTO permissions (module, action, description) VALUES
  -- POS
  ('pos',         'read',    'View POS terminal'),
  ('pos',         'create',  'Create new sales / invoices'),
  ('pos',         'refund',  'Process returns and refunds'),
  ('pos',         'discount','Apply manual discounts'),
  -- Inventory
  ('inventory',   'read',    'View products and stock'),
  ('inventory',   'create',  'Add new products'),
  ('inventory',   'update',  'Edit product details'),
  ('inventory',   'delete',  'Delete / archive products'),
  ('inventory',   'transfer','Transfer stock between branches'),
  ('inventory',   'adjust',  'Manual stock adjustments'),
  -- Procurement
  ('procurement', 'read',    'View purchase orders'),
  ('procurement', 'create',  'Create purchase orders'),
  ('procurement', 'approve', 'Approve purchase orders'),
  ('procurement', 'receive', 'Record goods receipt'),
  -- Sales / Ledger
  ('sales',       'read',    'View invoices and customers'),
  ('sales',       'create',  'Create invoices'),
  ('sales',       'update',  'Edit draft invoices'),
  ('sales',       'delete',  'Void invoices'),
  ('sales',       'export',  'Export sales data'),
  -- Accounting
  ('accounting',  'read',    'View chart of accounts, ledger'),
  ('accounting',  'create',  'Post vouchers and journal entries'),
  ('accounting',  'update',  'Edit draft vouchers'),
  ('accounting',  'close',   'Period closing and trial balance'),
  ('accounting',  'export',  'Export financial statements'),
  -- HR
  ('hr',          'read',    'View employees and attendance'),
  ('hr',          'create',  'Add employees'),
  ('hr',          'update',  'Edit employee records'),
  ('hr',          'payroll', 'Process and approve payroll'),
  ('hr',          'delete',  'Deactivate employees'),
  -- Reports
  ('reports',     'read',    'View standard reports'),
  ('reports',     'export',  'Export reports to Excel / PDF'),
  ('reports',     'fbr',     'Access FBR reports and sync'),
  -- Settings
  ('settings',    'read',    'View settings'),
  ('settings',    'update',  'Change system settings'),
  ('settings',    'users',   'Manage users and roles'),
  -- Customers / Vendors
  ('customers',   'read',    'View customers'),
  ('customers',   'create',  'Add customers'),
  ('customers',   'update',  'Edit customers'),
  ('customers',   'delete',  'Delete / merge customers'),
  ('vendors',     'read',    'View vendors'),
  ('vendors',     'create',  'Add vendors'),
  ('vendors',     'update',  'Edit vendors');

-- ── ROLE ↔ PERMISSION MAPPING ───────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- owner & admin → all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name IN ('owner', 'admin');

-- manager → everything except settings:users, hr:payroll, hr:delete, accounting:close
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'manager'
  AND p.name NOT IN ('settings:users','hr:payroll','hr:delete','accounting:close');

-- cashier → pos:*, sales:read/create, customers:read/create, inventory:read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'cashier'
  AND (p.module = 'pos'
    OR p.name IN ('sales:read','sales:create','customers:read','customers:create','inventory:read'));

-- accountant → accounting:*, hr:read/payroll, reports:*, sales:read/export, inventory:read, vendors:*
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'accountant'
  AND (p.module = 'accounting'
    OR p.name IN ('hr:read','hr:payroll','reports:read','reports:export','reports:fbr',
                  'sales:read','sales:export','inventory:read','vendors:read','vendors:create','vendors:update'));

-- viewer → only :read and :export permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'viewer'
  AND p.action IN ('read','export');

-- ── TENANT USERS (role assignment) ──────────────────────────
-- Links public.users to a role within this tenant's schema
CREATE TABLE IF NOT EXISTS tenant_users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,               -- references public.users(id)
  role_id     UUID        NOT NULL REFERENCES roles(id),
  branch_id   UUID,                               -- NULL = all branches; set = single branch
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  invited_by  UUID,                               -- user_id of inviter
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at   TIMESTAMPTZ,
  UNIQUE (user_id)                                -- one role per user per tenant
);

CREATE INDEX idx_tenant_users_user   ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_role   ON tenant_users(role_id);
CREATE INDEX idx_tenant_users_branch ON tenant_users(branch_id);
