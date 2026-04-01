
'use strict';
require('dotenv').config();
// Trivial change to force redeployment

// Ensure a JWT secret is set, otherwise auth will fail
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET env variable is missing. Generating a volatile secret for this session. For production, this MUST be a static value.');
  process.env.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
}

const express     = require('express');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');
const bcrypt      = require('bcryptjs');

const logger             = require('./utils/logger');
const { db, checkConnection, destroyConnections } = require('../config/database');
const errorHandler       = require('./middleware/errorHandler');
const { tenantResolver } = require('./middleware/tenantResolver');
const rateLimiter        = require('./middleware/rateLimiter');
const requestId          = require('./middleware/requestId');

const authRoutes      = require('./routes/auth');
const usersRoutes     = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes  = require('./routes/settings');
const productsRoutes  = require('./routes/products');
const customersRoutes = require('./routes/customers');
const invoicesRoutes  = require('./routes/invoices');
const inventoryRoutes = require('./routes/inventory');
const vendorsRoutes   = require('./routes/vendors');
const purchaseRoutes  = require('./routes/purchaseOrders');
const hrRoutes        = require('./routes/hr');
const payrollRoutes   = require('./routes/payroll');
const accountingRoutes= require('./routes/accounting');
const reportsRoutes   = require('./routes/reports');
const fbrRoutes       = require('./routes/fbr');

const app    = express();
const PREFIX = process.env.API_PREFIX || '/api/v1';

// -------------------------------------------------------------------
// MIDDLEWARE STACK
// NOTE: Order is critical!
// -------------------------------------------------------------------

// 1. Custom CORS Middleware (Highest Priority)
// Must run first to handle pre-flight OPTIONS requests and send CORS
// headers before any other middleware can interfere.
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://infosys-pak-erp-eight.vercel.app'
  ];
  const origin = req.headers.origin;

  // Dynamically set origin based on what the browser is sending
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // For other cases (like Postman), you can have a fallback
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-Slug, X-Request-ID, apikey');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Immediately respond to pre-flight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // Use return to end execution here
  }

  next();
});

// 2. Security headers (Helmet)
app.use(helmet({ contentSecurityPolicy: false })); // CSP handled by frontend if needed

// 3. Request ID injection
app.use(requestId);

// 4. Logging (Morgan)
app.use(morgan(':method :url :status - :response-time ms', {
  stream: { write: msg => logger.http(msg.trim()) },
  skip: (req) => req.url === '/health', // Don't log health checks
}));

// 5. Body parsers and Compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// -------------------------------------------------------------------
// PUBLIC ROUTES & HEALTH CHECKS
// -------------------------------------------------------------------

app.get('/', (_req, res) => {
  res.status(200).json({ message: 'API is running.' });
});

app.get('/health', async (_req, res) => {
  const dbOk = await checkConnection().catch(() => false);
  res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'healthy' : 'degraded', timestamp: new Date().toISOString() });
});
app.get('/ready', (_req, res) => res.json({ ready: true }));

// -------------------------------------------------------------------
// API ROUTING
// -------------------------------------------------------------------

// Rate limiters
app.use(`${PREFIX}/auth`, rateLimiter.auth);
app.use(PREFIX, rateLimiter.api);

// Public routes
app.use(`${PREFIX}/auth`, authRoutes);

// Tenant resolver (middleware to identify which tenant DB to use)
app.use(tenantResolver);

// Protected routes (all require a valid JWT and tenant context)
app.use(`${PREFIX}/dashboard`,      dashboardRoutes);
app.use(`${PREFIX}/users`,          usersRoutes);
app.use(`${PREFIX}/settings`,       settingsRoutes);
app.use(`${PREFIX}/products`,       productsRoutes);
app.use(`${PREFIX}/customers`,      customersRoutes);
app.use(`${PREFIX}/invoices`,       invoicesRoutes);
app.use(`${PREFIX}/inventory`,      inventoryRoutes);
app.use(`${PREFIX}/vendors`,        vendorsRoutes);
app.use(`${PREFIX}/purchase-orders`,purchaseRoutes);
app.use(`${PREFIX}/hr`,             hrRoutes);
app.use(`${PREFIX}/payroll`,        payrollRoutes);
app.use(`${PREFIX}/accounting`,     accountingRoutes);
app.use(`${PREFIX}/reports`,        reportsRoutes);
app.use(`${PREFIX}/fbr`,            fbrRoutes);

// -------------------------------------------------------------------
// ERROR HANDLING
// -------------------------------------------------------------------

// 404 Handler for routes not found
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: req.path });
});

// Global error handler
app.use(errorHandler);

// -------------------------------------------------------------------
// DATABASE & SERVER BOOTSTRAP
// -------------------------------------------------------------------

async function setupDatabase() {
  logger.info('[BOOT] Ensuring super admin exists...');
  try {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@erp.pk';
    const adminPass  = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123';
    const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hash = await bcrypt.hash(adminPass, BCRYPT_ROUNDS);

    const adminResult = await db.raw('SELECT id FROM users WHERE email = ? AND is_super_admin = TRUE', [adminEmail]);
    const adminExists = adminResult[0] && adminResult[0].length > 0;

    if (adminExists) {
      await db.raw(
        'UPDATE users SET password_hash = ?, is_active = TRUE WHERE id = ?',
        [hash, adminResult[0][0].id]
      );
      logger.info(`[BOOT] Super admin password updated: ${adminEmail}`);
    } else {
      await db.raw(
        "INSERT INTO users (email, password_hash, full_name, is_active, is_super_admin, tenant_id) VALUES (?, ?, 'Super Admin', TRUE, TRUE, NULL)",
        [adminEmail, hash]
      );
      logger.info(`[BOOT] Super admin created: ${adminEmail}`);
    }
  } catch (err) {
    logger.error(`[BOOT] DB setup error: ${err.message}`);
  }
}

async function boot() {
  const port = parseInt(process.env.PORT || '4000');
  logger.info('Starting Infosys Pak ERP API...');
  const dbOk = await checkConnection();
  if (!dbOk) { logger.error('Database connection failed. Exiting.'); process.exit(1); }

  await setupDatabase();

  app.listen(port, '0.0.0.0', () => {
    logger.info(`🚀 API running on port ${port} | Env: ${process.env.NODE_ENV}`);
    logger.info(`   Routes: products, customers, invoices, inventory, hr, payroll, accounting`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => { logger.info('SIGTERM received'); await destroyConnections(); process.exit(0); });
  process.on('SIGINT',  async () => { logger.info('SIGINT received'); await destroyConnections(); process.exit(0); });
}

boot();

module.exports = app;
