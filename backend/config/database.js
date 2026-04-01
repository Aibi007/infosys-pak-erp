'use strict';
require('dotenv').config();
const knex   = require('knex');
const logger = require('../src/utils/logger');

const isProduction = process.env.NODE_ENV === 'production';

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

  function extractRows(res) {
    if (res && res.rows) return res.rows;
    if (Array.isArray(res) && Array.isArray(res[0])) return res[0];
    return [];
  }

  k.query = async (text, params) => {
    const res = await k.raw(text, params || []);
    return extractRows(res);
  };

  k.queryOne = async (text, params) => {
    const res = await k.raw(text, params || []);
    const rows = extractRows(res);
    return rows[0];
  };

  k.queryAll = async (text, params) => {
    const res = await k.raw(text, params || []);
    return extractRows(res);
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
      k.raw(dataSql,  params || [])
    ]);

    const total = parseInt(extractRows(countRes)[0].count, 10);
    return {
      data: extractRows(dataRes),
      pagination: {
        total, page: parseInt(page), limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  };

  return k;
}

const db = patchDb(knex(baseConfig));

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
    logger.error('❌ Database connection failed:', err);
    return false;
  }
}

async function destroyConnections() {
  await db.destroy();
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
