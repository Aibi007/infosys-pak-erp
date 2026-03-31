'use strict';
// ================================================================
// src/jobs/fbrSync.js
// Scheduled FBR transmission processor.
// Runs every 5 minutes — picks up all pending/retry transmissions
// across all active tenants and sends to PRAL ESP API.
//
// Also retries failed transmissions with exponential backoff:
//   attempt 1: immediate
//   attempt 2: 5 min delay
//   attempt 3: 30 min delay
// After 3 failures: status → 'failed' (manual retry required)
// ================================================================
const cron    = require('node-cron');
const logger  = require('../utils/logger');
const { publicDb } = require('../../config/database');
const { processPendingTransmissions } = require('../services/fbrService');

let isRunning = false;

async function runFBRSync() {
  if (isRunning) {
    logger.debug('FBR sync already running, skipping...');
    return;
  }
  isRunning = true;

  try {
    const tenants = await publicDb.queryAll(
      `SELECT slug FROM tenants WHERE status='active'`
    );

    if (tenants.length === 0) return;

    logger.debug(`FBR sync: checking ${tenants.length} tenants`);

    for (const t of tenants) {
      try {
        await processPendingTransmissions(t.slug);
      } catch (err) {
        logger.error('FBR sync failed for tenant', { slug: t.slug, error: err.message });
      }
    }
  } catch (err) {
    logger.error('FBR sync job error', { error: err.message });
  } finally {
    isRunning = false;
  }
}

// ── Schedule: every 5 minutes ────────────────────────────────
cron.schedule('*/5 * * * *', runFBRSync, {
  scheduled: true,
  timezone: 'Asia/Karachi',
});

// ── Daily retry of all-failed transmissions (2am PKT) ─────────
cron.schedule('0 21 * * *', async () => {
  // 21:00 UTC = 02:00 PKT (UTC+5)
  try {
    logger.info('FBR: daily retry of failed transmissions');
    const tenants = await publicDb.queryAll(`SELECT slug FROM tenants WHERE status='active'`);
    for (const t of tenants) {
      const db = require('../../config/database').getTenantDB(t.slug);
      await db.execute(
        `UPDATE fbr_transmissions SET status='pending', attempt_no=0
         WHERE status='failed' AND attempt_no >= 3
           AND created_at > NOW() - INTERVAL '7 days'`
      );
      await db.execute(
        `UPDATE invoices SET fbr_status='pending' WHERE id IN (
           SELECT invoice_id FROM fbr_transmissions WHERE status='pending'
         ) AND status NOT IN ('voided')`
      );
    }
    await runFBRSync();
    logger.info('FBR: daily retry complete');
  } catch (err) {
    logger.error('FBR daily retry error', { error: err.message });
  }
}, { timezone: 'Asia/Karachi' });

logger.info('FBR sync job scheduled (every 5 minutes)');

module.exports = { runFBRSync };
