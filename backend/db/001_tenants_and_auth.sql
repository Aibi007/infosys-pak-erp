-- ============================================================
-- INFOSYS PAK ERP — DATABASE SCHEMA
-- Migration 001: Tenants, Auth, Users, Roles
-- Strategy: schema-per-tenant isolation
--   public schema  → super-admin tables (tenants, billing)
--   {tenant_slug}  → all business data for that tenant
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram indexes for fast ILIKE search
CREATE EXTENSION IF NOT EXISTS "btree_gin";  -- composite GIN indexes

-- ============================================================
-- PUBLIC SCHEMA — Super-Admin / Platform Level
-- ============================================================

-- ── PLANS ───────────────────────────────────────────────────
CREATE TABLE public.plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(50)  NOT NULL UNIQUE,           -- 'starter','growth','enterprise'
  display_name  VARCHAR(100) NOT NULL,
  max_users     INT          NOT NULL DEFAULT 5,
  max_branches  INT          NOT NULL DEFAULT 1,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_annual  NUMERIC(10,2) NOT NULL DEFAULT 0,
  features      JSONB        NOT NULL DEFAULT '{}',     -- {"fbr":true,"urdu":true,"api":false}
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO public.plans (name, display_name, max_users, max_branches, price_monthly, price_annual, features) VALUES
  ('starter',    'Starter',    3,   1,  2999,  29990,  '{"fbr":true,"urdu":true,"api":false,"multi_branch":false,"advanced_reports":false}'),
  ('growth',     'Growth',     10,  3,  5999,  59990,  '{"fbr":true,"urdu":true,"api":true, "multi_branch":true, "advanced_reports":true }'),
  ('enterprise', 'Enterprise', 999, 99, 14999, 149990, '{"fbr":true,"urdu":true,"api":true, "multi_branch":true, "advanced_reports":true,"white_label":true}');

-- ── TENANTS ─────────────────────────────────────────────────
CREATE TABLE public.tenants (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(63)  NOT NULL UNIQUE,           -- schema name, e.g. 'albaraka_textiles'
  company_name    VARCHAR(255) NOT NULL,
  company_name_ur VARCHAR(255),                           -- اردو نام
  ntn             VARCHAR(20)  UNIQUE,                    -- National Tax Number
  strn            VARCHAR(20)  UNIQUE,                    -- Sales Tax Registration
  phone           VARCHAR(20),
  email           VARCHAR(255),
  address         TEXT,
  city            VARCHAR(100),
  logo_url        TEXT,
  plan_id         UUID         NOT NULL REFERENCES public.plans(id),
  status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','trial','cancelled')),
  trial_ends_at   TIMESTAMPTZ,
  subscribed_at   TIMESTAMPTZ,
  billing_cycle   VARCHAR(10)  NOT NULL DEFAULT 'monthly'
                    CHECK (billing_cycle IN ('monthly','annual')),
  next_billing_at TIMESTAMPTZ,
  settings        JSONB        NOT NULL DEFAULT '{}',     -- {"lang":"en","currency":"PKR","date_format":"DD/MM/YYYY"}
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug   ON public.tenants(slug);
CREATE INDEX idx_tenants_status ON public.tenants(status);

-- ── GLOBAL USERS (platform-level login) ─────────────────────
-- Each user belongs to exactly one tenant.
-- Super-admins have tenant_id = NULL.
CREATE TABLE public.users (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         REFERENCES public.tenants(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   TEXT         NOT NULL,                  -- bcrypt
  full_name       VARCHAR(255) NOT NULL,
  full_name_ur    VARCHAR(255),
  is_super_admin  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  login_attempts  INT          NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant  ON public.users(tenant_id);
CREATE INDEX idx_users_email   ON public.users(email);

-- ── REFRESH TOKENS ──────────────────────────────────────────
CREATE TABLE public.refresh_tokens (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash  TEXT         NOT NULL UNIQUE,               -- SHA-256 of raw token
  device_info TEXT,
  ip_address  INET,
  expires_at  TIMESTAMPTZ  NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user    ON public.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON public.refresh_tokens(expires_at);

-- ── AUDIT LOG (platform) ────────────────────────────────────
CREATE TABLE public.audit_log (
  id          BIGSERIAL    PRIMARY KEY,
  tenant_id   UUID         REFERENCES public.tenants(id),
  user_id     UUID         REFERENCES public.users(id),
  action      VARCHAR(100) NOT NULL,                      -- 'tenant.created','plan.changed'
  entity_type VARCHAR(50),
  entity_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant    ON public.audit_log(tenant_id);
CREATE INDEX idx_audit_user      ON public.audit_log(user_id);
CREATE INDEX idx_audit_action    ON public.audit_log(action);
CREATE INDEX idx_audit_created   ON public.audit_log(created_at DESC);

-- ── TRIGGER: updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
