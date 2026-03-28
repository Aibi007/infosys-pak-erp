'use strict';
// ================================================================
// src/server.js — Infosys Pak ERP API
// Node.js 18+ · Express 4 · PostgreSQL (schema-per-tenant)
//
// Request lifecycle:
//   requestId → cors → helmet → compression → morgan
//   → rateLimiter → bodyParser
//   → [public routes: /auth]
//   → tenantResolver → authenticate
//   → [protected routes]
//   → errorHandler
// ================================================================
require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const compression  = require('compression');
const morgan       = require('morgan');

const logger             = require('./utils/logger');
const { checkConnection, destroyConnections } = require('../config/database');
const errorHandler       = require('./middleware/errorHandler');
const { tenantResolver } = require('./middleware/tenantResolver');
const rateLimiter        = require('./middleware/rateLimiter');
const requestId          = require('./middleware/requestId');

// ── Route modules ─────────────────────────────────────────────
const authRoutes      = require('./routes/auth');
const usersRoutes     = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes  = require('./routes/settings');

// ── App ───────────────────────────────────────────────────────
const app    = express();
const PREFIX = process.env.API_PREFIX || '/api/v1';

// ── Security headers ─────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy:    false,  // API only — no HTML
  crossOriginEmbedderPolicy:false,
}));

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials:    true,
  methods:        ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Tenant-Slug','X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge:         86400, // 24h preflight cache
}));

// ── Compression + body parsing ────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request ID + structured logging ──────────────────────────
app.use(requestId);
app.use(morgan(
  ':method :url :status :res[content-length] - :response-time ms [:req[x-request-id]]',
  {
    stream: { write: msg => logger.http(msg.trim()) },
    skip:   (req) => req.url === '/health' || req.url === '/ready',
  }
));

// ── Health / readiness probes (no auth) ──────────────────────
app.get('/health', async (_req, res) => {
  const dbOk = await checkConnection().catch(() => false);
  const status = dbOk ? 200 : 503;
  res.status(status).json({
    status:    dbOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version:   process.env.npm_package_version || '1.0.0',
    services:  { database: dbOk ? 'up' : 'down' },
  });
});

app.get('/ready', (_req, res) => res.json({ ready: true }));

// ── Rate limiters ─────────────────────────────────────────────
app.use(`${PREFIX}/auth`, rateLimiter.auth);
app.use(PREFIX,           rateLimiter.api);

// ── Public routes (no tenant context required) ────────────────
app.use(`${PREFIX}/auth`, authRoutes);

// ── Tenant resolver — reads X-Tenant-Slug header / subdomain ─
app.use(tenantResolver);

// ── Protected routes (all require authenticate() inside) ──────
app.use(`${PREFIX}/dashboard`, dashboardRoutes);
app.use(`${PREFIX}/users`,     usersRoutes);
app.use(`${PREFIX}/settings`,  settingsRoutes);

// ── Placeholder stubs for routes built in 12c ─────────────────
// These will be replaced by real route files in Step 12c
const stub = (name) => {
  const r = require('express').Router();
  r.use(require('./middleware/auth').authenticate);
  r.all('*', (_req, res) => res.status(501).json({
    success: false,
    error:   `${name} routes coming in Step 12c`,
  }));
  return r;
};

app.use(`${PREFIX}/products`,        stub('products'));
app.use(`${PREFIX}/customers`,       stub('customers'));
app.use(`${PREFIX}/vendors`,         stub('vendors'));
app.use(`${PREFIX}/invoices`,        stub('invoices'));
app.use(`${PREFIX}/purchase-orders`, stub('purchase-orders'));
app.use(`${PREFIX}/inventory`,       stub('inventory'));
app.use(`${PREFIX}/accounting`,      stub('accounting'));
app.use(`${PREFIX}/hr`,              stub('hr'));
app.use(`${PREFIX}/payroll`,         stub('payroll'));
app.use(`${PREFIX}/leaves`,          stub('leaves'));
app.use(`${PREFIX}/attendance`,      stub('attendance'));
app.use(`${PREFIX}/reports`,         stub('reports'));
app.use(`${PREFIX}/fbr`,             stub('fbr'));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success:    false,
    error:      'Route not found',
    path:       req.path,
    requestId:  req.requestId,
  });
});

// ── Global error handler ──────────────────────────────────────
app.use(errorHandler);

// ── Boot ──────────────────────────────────────────────────────
async function boot() {
  const port = parseInt(process.env.PORT || '4000');

  logger.info('Starting Infosys Pak ERP API...');

  const dbOk = await checkConnection();
  if (!dbOk) {
    logger.error('Cannot connect to database. Exiting.');
    process.exit(1);
  }

  const server = app.listen(port, () => {
    logger.info(`🚀 API running on port ${port}`);
    logger.info(`   Prefix  : ${PREFIX}`);
    logger.info(`   Env     : ${process.env.NODE_ENV || 'development'}`);
    logger.info(`   Docs    : http://localhost:${port}${PREFIX}/docs (Step 12c)`);
  });

  // ── Graceful shutdown ─────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await destroyConnections();
      logger.info('All connections closed. Bye.');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('uncaughtException',  (err) => { logger.error('Uncaught exception',  { error: err.message, stack: err.stack }); process.exit(1); });
  process.on('unhandledRejection', (err) => { logger.error('Unhandled rejection', { error: err?.message }); });
}

if (require.main === module) boot();

module.exports = app; // for supertest
