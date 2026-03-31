'use strict';
require('dotenv').config();
const knex   = require('knex');
const logger = require('../src/utils/logger');

// ── Connection config ───────────────────────────────────────────

const isProduction = process.env.NODE_ENV === 'production';

// In production (like on Railway), a direct connection string is used,
// but with SSL enabled. For local development, the connection string is enough.
const connection = {
  connectionString: process.env.DATABASE_URL,
  ...(isProduction && { ssl: { rejectUnauthorized: false } }),
};

const baseConfig = {
  client: 'pg',
  connection: connection,
  pool: {
    min:            parseInt(process.env.DB_POOL_MIN) || 2,
    max:            parseInt(process.env.DB_POOL_MAX) || 20,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis:    600000,
    reapIntervalMillis:   1000,
  },
  migrations: {
    directory: './migrations',
    tableName:  'knex_migrations',
  },
  seeds: {
    directory: './seeds',
  },
  debug: !isProduction,
};


function patchDb(k) {

  k.query = async (text, params) => {
    const res = await k.raw(text, params || []);
    return res.rows;
  };
  k.queryOne = async (text, params) => {
    const res = await k.raw(text, params || []);
    return res.rows[0];
  };
  k.queryAll = async (text, params) => {
    const res = await k.raw(text, params || []);
    return res.rows;
  };
  k.execute = async (text, params) => {
    return await k.raw(text, params || []);
  };
  k.paginate = async (sql, params, { page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;
    const countSql = `SELECT COUNT(*) AS count FROM (${sql}) AS count_query`;
    const dataSql  = `${sql} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    const [countRes, dataRes] = await Promise.all([
      k.raw(countSql, params || []),
      k.raw(dataSql, params || [])
    ]);

    const total = parseInt(countRes.rows[0].count, 10);
    return {
      data: dataRes.rows,
      pagination: {
        total, page: parseInt(page), limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  };
  return k;
}

const db = patchDb(knex(baseConfig));

const tenantConnections = new Map();

function getTenantDb(tenantSlug) {
  if (!tenantSlug) throw new Error('Tenant slug required');
  return db;
}

async function checkConnection() {
  try {
    await db.raw('SELECT 1');
    logger.info('✅ Database connected successfully');
    return true;
  } catch (err) {
    // Log the full error object for detailed diagnostics
    logger.error('❌ Database connection failed:', err);
    return false;
  }
}

async function destroyConnections() {
  await db.destroy();
  tenantConnections.clear();
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
