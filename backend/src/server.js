'use strict';
require('dotenv').config();

const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const compression = require('compression');
const morgan      = require('morgan');
const bcrypt      = require('bcryptjs');
const fs          = require('fs');
const path        = require('path');

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

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestId);
app.use(morgan(':method :url :status - :response-time ms', {
  stream: { write: msg => logger.http(msg.trim()) },
  skip: (req) => req.url === '/health',
}));

// Health check
app.get('/health', async (_req, res) => {
  const dbOk = await checkConnection().catch(() => false);
  res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'healthy' : 'degraded', timestamp: new Date().toISOString() });
});
app.get('/ready', (_req, res) => res.json({ ready: true }));

// Rate limiters
app.use(`${PREFIX}/auth`, rateLimiter.auth);
app.use(PREFIX, rateLimiter.api);

// Public routes
app.use(`${PREFIX}/auth`, authRoutes);

// Tenant resolver
app.use(tenantResolver);

// Protected routes
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

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: req.path });
});

app.use(errorHandler);

// Database setup on boot
async function setupDatabase() {
  logger.info('[BOOT] Ensuring super admin exists...');
  try {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@erp.pk';
    const adminPass  = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123';
    const hash = await bcrypt.hash(adminPass, 12);

    // Check if the admin exists in the 'super_admins' table
    const adminResult = await db.raw('SELECT id FROM super_admins WHERE email = ?', [adminEmail]);
    const adminExists = adminResult[0] && adminResult[0].length > 0;

    if (adminExists) {
      await db.raw('UPDATE super_admins SET password_hash = ?, is_active = TRUE WHERE email = ?', [hash, adminEmail]);
      logger.info(`[BOOT] Super admin password updated: ${adminEmail}`);
    } else {
      await db.raw(
        "INSERT INTO super_admins (email, password_hash, name, is_active) VALUES (?, ?, 'Super Admin', TRUE)",
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

  process.on('SIGTERM', async () => { await destroyConnections(); process.exit(0); });
  process.on('SIGINT',  async () => { await destroyConnections(); process.exit(0); });
}

boot();
module.exports = app;
