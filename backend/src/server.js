'use strict';
require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const compression  = require('compression');
const morgan       = require('morgan');
const bcrypt       = require('bcryptjs');
const fs           = require('fs');
const path         = require('path');

const logger             = require('./utils/logger');
const { db, checkConnection, destroyConnections } = require('../config/database');
const errorHandler       = require('./middleware/errorHandler');
const { tenantResolver } = require('./middleware/tenantResolver');
const rateLimiter        = require('./middleware/rateLimiter');
const requestId          = require('./middleware/requestId');

// ── Route modules ─────────────────────────────────────────────
const authRoutes      = require('./routes/auth');
const usersRoutes     = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes  = require('./routes/settings');

const app    = express();
const PREFIX = process.env.API_PREFIX || '/api/v1';

app.use(helmet({ contentSecurityPolicy: false }));
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
// Is hissay ko update karein:
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  // Yahan 'apikey' shamil kar diya hai:
  allowedHeaders: ['Content-Type','Authorization','X-Tenant-Slug','X-Request-ID','apikey'], 
}));


app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestId);
app.use(morgan(':method :url :status - :response-time ms', { stream: { write: msg => logger.http(msg.trim()) } }));

app.get('/health', async (_req, res) => {
  const dbOk = await checkConnection().catch(() => false);
  res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'healthy' : 'degraded', services: { database: dbOk ? 'up' : 'down' } });
});

app.use(`${PREFIX}/auth`, authRoutes);
app.use(tenantResolver);
app.use(`${PREFIX}/dashboard`, dashboardRoutes);
app.use(`${PREFIX}/users`,     usersRoutes);
app.use(`${PREFIX}/settings`,  settingsRoutes);

app.use(errorHandler);

// ── Database Setup — Auto Migrate & Seed ─────────────────────
async function setupDatabase() {
  logger.info('[BOOT] Checking database schema...');
  try {
    // 1. Check if users table exists
    const hasUsers = await db.raw("SELECT to_regclass('public.users')").then(r => r.rows[0].to_regclass);
    
    if (!hasUsers) {
      logger.info('[BOOT] Tables missing. Starting migration...');
      const sqlPath = path.join(__dirname, '../db/001_tenants_and_auth.sql');
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await db.raw(sql);
        logger.info('[BOOT] Migration successful.');
      } else {
        logger.error('[BOOT] Migration SQL file not found!');
      }
    } else {
      logger.info('[BOOT] Users table already exists.');
    }

    // 2. FORCE check/create Admin
    const adminEmail = 'admin@erp.pk';
    const admin = await db.queryOne("SELECT id, is_super_admin FROM public.users WHERE email = ?", [adminEmail]);
    
    if (!admin) {
      logger.info('[BOOT] Admin not found. Creating now...');
      const hash = await bcrypt.hash('Admin@123', 12);
      await db.raw(
        "INSERT INTO public.users (id, email, password_hash, full_name, is_super_admin, is_active) VALUES (gen_random_uuid(), ?, ?, 'Super Admin', TRUE, TRUE)",
        [adminEmail, hash]
      );
      logger.info('[BOOT] ✅ SUCCESS: Super Admin created: admin@erp.pk / Admin@123');
    } else {
      logger.info(`[BOOT] Admin already exists (ID: ${admin.id}, Super: ${admin.is_super_admin})`);
    }
  } catch (err) {
    logger.error(`[BOOT] ❌ Database setup error: ${err.message}`);
    console.error(err);
  }
}


async function boot() {
  const port = parseInt(process.env.PORT || '4000');
  const dbOk = await checkConnection();
  if (!dbOk) { logger.error('Database connection failed. Exiting.'); process.exit(1); }

  await setupDatabase();

  app.listen(port, '0.0.0.0', () => {
    logger.info(`🚀 API running on port ${port}`);
  });
}

boot();
