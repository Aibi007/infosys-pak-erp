// ================================================================
// config/database.js — Knex + PostgreSQL connection pool
// Supports schema-per-tenant multi-tenancy
// ================================================================

'use strict';
require('dotenv').config();
const knex   = require('knex');
const logger = require('../src/utils/logger');

// ── Connection config ────────────────────────────────────────────
const baseConfig = {
  client: 'pg',
  connection: process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL !== 'false' && process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME     || 'infosys_erp',
        user:     process.env.DB_USER     || 'erp_user',
        password: process.env.DB_PASSWORD || '',
        ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      },
  pool: {
    min:            parseInt(process.env.DB_POOL_MIN) || 2,
    max:            parseInt(process.env.DB_POOL_MAX) || 20,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis:    600000,
    reapIntervalMillis:   1000,
    afterCreate: (conn, done) => {
      // Set statement timeout to 30 seconds
      conn.query('SET statement_timeout = 30000', (err) => done(err, conn));
    },
  },
  migrations: {
    directory: './migrations',
    tableName:  'knex_migrations',
  },
  seeds: {
    directory: './seeds',
  },
  debug: process.env.NODE_ENV === 'development',
};

// Helper to patch knex instances with legacy raw query methods
function patchDb(k) {
  k.query = async (text, params) => {
    const res = await k.raw(text, params || []);
    return res.rows;
  };
  k.queryOne = async (text, params) => {
    const res = await k.raw(text, params || []);
    return res.rows[0];
  };
  return k;
}

// Root connection (public schema) — for tenant management
const db = patchDb(knex(baseConfig));

// ── Multi-tenant connection factory ─────────────────────────────
// Returns a Knex instance scoped to a specific tenant's schema
const tenantConnections = new Map();

function getTenantDb(tenantSlug) {
  if (!tenantSlug) throw new Error('Tenant slug required');
  const sanitised = tenantSlug.replace(/[^a-z0-9_]/gi, '').toLowerCase();
  if (!sanitised) throw new Error('Invalid tenant slug');

  if (tenantConnections.has(sanitised)) {
    return tenantConnections.get(sanitised);
  }

  const tenantDb = patchDb(knex({
    ...baseConfig,
    // Knex searchPath sets the PostgreSQL search_path per connection
    searchPath: [sanitised, 'public'],
    pool: {
      ...baseConfig.pool,
      afterCreate: (conn, done) => {
        conn.query(
          `SET search_path TO ${sanitised}, public; SET statement_timeout = 30000;`,
          (err) => done(err, conn)
        );
      },
    },
  }));

  tenantConnections.set(sanitised, tenantDb);
  logger.debug(`Tenant DB connection created for schema: ${sanitised}`);
  return tenantDb;
}

// ── Health check ─────────────────────────────────────────────────
async function checkConnection() {
  try {
    await db.raw('SELECT 1');
    logger.info('✅ Database connected successfully');
    return true;
  } catch (err) {
    logger.error('❌ Database connection failed:', err.message);
    return false;
  }
}

// ── Graceful shutdown ────────────────────────────────────────────
async function destroyConnections() {
  await db.destroy();
  for (const [, conn] of tenantConnections) {
    await conn.destroy();
  }
  logger.info('Database connections closed');
}

module.exports = { 
  db, 
  publicDb: db, 
  getTenantDb, 
  getTenantDB: getTenantDb, 
  checkConnection, 
  destroyConnections, 
  baseConfig 
};
