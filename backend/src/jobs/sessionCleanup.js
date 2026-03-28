'use strict';
// ================================================================
// src/jobs/sessionCleanup.js
// Runs nightly to purge:
//   - Expired/revoked refresh tokens older than 30 days
//   - Old audit log entries (configurable retention)
//   - Draft invoices older than 7 days
//   - Draft vouchers older than 30 days
// ================================================================
const cron   = require('node-cron');
const logger = require('../utils/logger');
const { publicDb, getTenantDB } = require('../../config/database');

async function runCleanup() {
  logger.info('Session cleanup job starting...');
  let totalPurged = 0;

  try {
    // 1. Expired refresh tokens
    const tokensDeleted = await publicDb.execute(
      `DELETE FROM refresh_tokens
       WHERE (revoked_at IS NOT NULL OR expires_at < NOW())
         AND created_at < NOW() - INTERVAL '30 days'`
    );
    totalPurged += tokensDeleted;
    logger.debug(`Purged ${tokensDeleted} expired refresh tokens`);

    // 2. Per-tenant cleanup
    const tenants = await publicDb.queryAll(
      `SELECT slug FROM tenants WHERE status IN ('active','trial')`
    );

    for (const t of tenants) {
      const db = getTenantDB(t.slug);
      try {
        // Draft invoices > 7 days old
        const draftInvoices = await db.execute(
          `DELETE FROM invoices
           WHERE status='draft' AND created_at < NOW() - INTERVAL '7 days'`
        );

        // Draft vouchers > 30 days
        const draftVouchers = await db.execute(
          `DELETE FROM vouchers
           WHERE status='draft' AND created_at < NOW() - INTERVAL '30 days'`
        );

        // Old FBR success transmissions > 90 days (keep failed/pending)
        const oldFBR = await db.execute(
          `DELETE FROM fbr_transmissions
           WHERE status='success' AND created_at < NOW() - INTERVAL '90 days'`
        );

        totalPurged += draftInvoices + draftVouchers + oldFBR;
      } catch (err) {
        logger.error('Tenant cleanup error', { slug: t.slug, error: err.message });
      }
    }

    logger.info(`Session cleanup complete. Total records purged: ${totalPurged}`);
  } catch (err) {
    logger.error('Session cleanup job error', { error: err.message });
  }
}

// ── Schedule: 3am PKT daily ──────────────────────────────────
cron.schedule('0 22 * * *', runCleanup, {
  scheduled: true,
  timezone: 'Asia/Karachi',
});

logger.info('Session cleanup job scheduled (daily 3am PKT)');

module.exports = { runCleanup };
