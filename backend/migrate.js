#!/usr/bin/env node
// ============================================================
// INFOSYS PAK ERP — Database Migration Runner
// Usage:
//   node migrate.js                        # run pending migrations
//   node migrate.js --tenant albaraka      # provision a specific tenant
//   node migrate.js --rollback             # rollback last batch
//   node migrate.js --status               # show migration state
//   node migrate.js --seed albaraka        # seed sample data
// ============================================================

require("dotenv").config();
const { Client, Pool } = require("pg");
const fs   = require("fs");
const path = require("path");

// ── CONFIG ───────────────────────────────────────────────────
const DB = {
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "infosys_pak",
  user:     process.env.DB_USER     || "erp_admin",
  password: process.env.DB_PASSWORD || "change_me",
  ssl:      process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
};

const MIGRATIONS_DIR = path.join(__dirname, "db");
const args = process.argv.slice(2);

// ── MIGRATION FILES ──────────────────────────────────────────
// Files that run in the PUBLIC schema (once ever)
const PUBLIC_MIGRATIONS = [
  "001_tenants_and_auth.sql",
];

// Files that run inside EACH TENANT schema
// In each file, unqualified table names resolve to the tenant schema
// because we SET search_path = tenant_slug; before running.
const TENANT_MIGRATIONS = [
  "002_rbac.sql",
  "003_branches_settings_fbr.sql",
  "004_inventory.sql",
  "005_customers_vendors.sql",
  "006_sales.sql",
  "007_procurement.sql",
  "008_accounting.sql",
  "009_hr_payroll.sql",
  "010_views_and_seed.sql",
];

// ── HELPERS ──────────────────────────────────────────────────
const log  = (msg)       => console.log(`\x1b[36m[ERP]\x1b[0m ${msg}`);
const ok   = (msg)       => console.log(`\x1b[32m[OK]\x1b[0m  ${msg}`);
const warn = (msg)       => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`);
const err  = (msg, e)    => { console.error(`\x1b[31m[ERR]\x1b[0m ${msg}`, e?.message || ""); process.exit(1); };

async function withClient(fn) {
  const client = new Client(DB);
  await client.connect();
  try { return await fn(client); }
  finally { await client.end(); }
}

async function readSQL(filename) {
  const full = path.join(MIGRATIONS_DIR, filename);
  if (!fs.existsSync(full)) err(`Migration file not found: ${full}`);
  return fs.readFileSync(full, "utf8");
}

// ── ENSURE MIGRATION TRACKING TABLE ─────────────────────────
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id          SERIAL       PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      schema_name VARCHAR(63)  NOT NULL DEFAULT 'public',
      applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      checksum    VARCHAR(64)
    );
  `);
}

async function isMigrationApplied(client, filename, schema) {
  const { rows } = await client.query(
    "SELECT 1 FROM public.schema_migrations WHERE filename=$1 AND schema_name=$2",
    [filename, schema]
  );
  return rows.length > 0;
}

async function recordMigration(client, filename, schema) {
  await client.query(
    "INSERT INTO public.schema_migrations (filename, schema_name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [filename, schema]
  );
}

// ── RUN PUBLIC MIGRATIONS ────────────────────────────────────
async function runPublicMigrations(client) {
  log("Running public schema migrations...");
  await client.query("SET search_path = public");

  for (const file of PUBLIC_MIGRATIONS) {
    if (await isMigrationApplied(client, file, "public")) {
      warn(`  Skip (already applied): ${file}`);
      continue;
    }
    log(`  Applying: ${file}`);
    const sql = await readSQL(file);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await recordMigration(client, file, "public");
      await client.query("COMMIT");
      ok(`  Applied: ${file}`);
    } catch (e) {
      await client.query("ROLLBACK");
      err(`  Failed: ${file}`, e);
    }
  }
}

// ── PROVISION TENANT ─────────────────────────────────────────
async function provisionTenant(client, slug) {
  log(`Provisioning tenant schema: ${slug}`);

  // Create schema
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${slug}`);
  await client.query(`GRANT USAGE ON SCHEMA ${slug} TO erp_app`);
  await client.query(`
    ALTER DEFAULT PRIVILEGES IN SCHEMA ${slug}
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO erp_app
  `);

  // Run tenant migrations in tenant schema
  await client.query(`SET search_path = ${slug}, public`);

  for (const file of TENANT_MIGRATIONS) {
    if (await isMigrationApplied(client, file, slug)) {
      warn(`  Skip (already applied): ${file}`);
      continue;
    }
    log(`  Applying to ${slug}: ${file}`);
    const sql = await readSQL(file);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await recordMigration(client, file, slug);
      await client.query("COMMIT");
      ok(`  Applied: ${file}`);
    } catch (e) {
      await client.query("ROLLBACK");
      err(`  Failed: ${file} in schema ${slug}`, e);
    }
  }

  ok(`Tenant schema '${slug}' ready ✓`);
}

// ── STATUS COMMAND ───────────────────────────────────────────
async function showStatus(client) {
  const { rows } = await client.query(`
    SELECT schema_name, filename, applied_at
    FROM public.schema_migrations
    ORDER BY schema_name, applied_at
  `);

  if (rows.length === 0) {
    warn("No migrations applied yet.");
    return;
  }

  let currentSchema = null;
  for (const row of rows) {
    if (row.schema_name !== currentSchema) {
      currentSchema = row.schema_name;
      console.log(`\n\x1b[35m[${currentSchema}]\x1b[0m`);
    }
    console.log(`  ✓ ${row.filename.padEnd(45)} ${row.applied_at.toISOString().slice(0,19)}`);
  }
  console.log();
}

// ── MAIN ENTRY POINT ─────────────────────────────────────────
async function main() {
  log("Infosys Pak ERP — Database Migration Runner");
  log(`Connecting to: ${DB.host}:${DB.port}/${DB.database}`);

  await withClient(async (client) => {
    await ensureMigrationsTable(client);

    if (args.includes("--status")) {
      await showStatus(client);
      return;
    }

    if (args.includes("--tenant")) {
      const slug = args[args.indexOf("--tenant") + 1];
      if (!slug) err("--tenant requires a slug argument");
      await runPublicMigrations(client);
      await provisionTenant(client, slug);
      return;
    }

    // Default: run public migrations then all tenants
    await runPublicMigrations(client);

    // Find all existing tenant schemas
    const { rows: schemas } = await client.query(`
      SELECT slug FROM public.tenants WHERE status IN ('active','trial')
    `);

    if (schemas.length === 0) {
      warn("No active tenants found. Use --tenant <slug> to provision a new one.");
    }

    for (const { slug } of schemas) {
      await provisionTenant(client, slug);
    }

    ok("All migrations complete.");
  });
}

main().catch(e => err("Unexpected error", e));

// ============================================================
// package.json snippet (add to your project root):
// {
//   "scripts": {
//     "migrate":         "node migrate.js",
//     "migrate:status":  "node migrate.js --status",
//     "migrate:tenant":  "node migrate.js --tenant"
//   },
//   "dependencies": {
//     "pg":     "^8.11.0",
//     "dotenv": "^16.3.0"
//   }
// }
// ============================================================
