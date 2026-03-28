#!/bin/bash
# ================================================================
# scripts/provision-tenant.sh
# Interactively provisions a new tenant (company) in the ERP.
# Usage: bash scripts/provision-tenant.sh
#   or:  TENANT_SLUG=albaraka bash scripts/provision-tenant.sh
# ================================================================
set -euo pipefail

COMPOSE="docker compose"

# ── Prompt for inputs if not in env ──────────────────────────
SLUG="${TENANT_SLUG:-}"
if [[ -z "$SLUG" ]]; then
  read -rp "Company slug (lowercase, underscores, e.g. albaraka_textiles): " SLUG
fi

COMPANY="${TENANT_COMPANY:-}"
if [[ -z "$COMPANY" ]]; then
  read -rp "Company name (English): " COMPANY
fi

COMPANY_UR="${TENANT_COMPANY_UR:-}"
if [[ -z "$COMPANY_UR" ]]; then
  read -rp "Company name (Urdu, optional): " COMPANY_UR
fi

ADMIN_EMAIL="${TENANT_ADMIN_EMAIL:-}"
if [[ -z "$ADMIN_EMAIL" ]]; then
  read -rp "Admin email: " ADMIN_EMAIL
fi

ADMIN_PASS="${TENANT_ADMIN_PASS:-}"
if [[ -z "$ADMIN_PASS" ]]; then
  read -rsp "Admin password (min 8 chars): " ADMIN_PASS
  echo
fi

PLAN="${TENANT_PLAN:-starter}"
NTN="${TENANT_NTN:-}"
STRN="${TENANT_STRN:-}"

# ── Validate slug format ──────────────────────────────────────
if ! [[ "$SLUG" =~ ^[a-z0-9_]{2,63}$ ]]; then
  echo "ERROR: Slug must be lowercase letters, numbers, and underscores (2-63 chars)"
  exit 1
fi

echo ""
echo "=== Provisioning tenant ==="
echo "  Slug    : $SLUG"
echo "  Company : $COMPANY"
echo "  Email   : $ADMIN_EMAIL"
echo "  Plan    : $PLAN"
echo ""
read -rp "Confirm? (y/N): " CONFIRM
[[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]] && echo "Cancelled." && exit 0

# ── 1. Run DB migrations for tenant schema ────────────────────
echo "Creating tenant schema..."
$COMPOSE exec -T api node migrate.js --tenant "$SLUG"

# ── 2. Insert tenant record + admin user via psql ─────────────
echo "Inserting tenant record..."
$COMPOSE exec -T postgres psql -U erp_app -d infosys_pak <<EOSQL
DO \$\$
DECLARE
  v_plan_id  UUID;
  v_tenant_id UUID;
  v_user_id  UUID;
  v_role_id  UUID;
  v_hash     TEXT;
BEGIN
  -- Plan
  SELECT id INTO v_plan_id FROM plans WHERE slug = '$PLAN';
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan % not found', '$PLAN';
  END IF;

  -- Tenant
  INSERT INTO tenants (slug, company_name, company_name_ur, ntn, strn, plan_id, status)
  VALUES ('$SLUG', '$COMPANY', NULLIF('$COMPANY_UR',''), NULLIF('$NTN',''), NULLIF('$STRN',''), v_plan_id, 'active')
  RETURNING id INTO v_tenant_id;

  RAISE NOTICE 'Tenant created: %', v_tenant_id;

  -- Hash password (bcrypt rounds=12 approximated with pgcrypto)
  v_hash := crypt('$ADMIN_PASS', gen_salt('bf', 12));

  -- Admin user
  INSERT INTO users (tenant_id, email, password_hash, full_name, is_active)
  VALUES (v_tenant_id, '$ADMIN_EMAIL', v_hash, '$COMPANY Admin', TRUE)
  RETURNING id INTO v_user_id;

  -- Assign owner role in tenant schema
  SET search_path = '$SLUG', public;
  SELECT id INTO v_role_id FROM roles WHERE name = 'owner';
  INSERT INTO tenant_users (user_id, role_id, joined_at) VALUES (v_user_id, v_role_id, NOW());

  -- Default branch
  INSERT INTO branches (name, code, is_main) VALUES ('Main Branch', 'MAIN', TRUE);

  RESET search_path;
  RAISE NOTICE 'Admin user created: %', v_user_id;
END \$\$;
EOSQL

echo ""
echo "✅ Tenant '$SLUG' provisioned successfully!"
echo ""
echo "   Login URL   : https://api.erp.pk/api/v1/auth/login"
echo "   Tenant Slug : $SLUG"
echo "   Admin Email : $ADMIN_EMAIL"
echo ""
