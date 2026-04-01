'use strict';
// ================================================================
// src/services/fbrSyncJob.js
// Background cron: every 5 minutes, sync pending FBR invoices
// across all active tenants.
// ================================================================
const cron   = require('node-cron');
const https  = require('https');
const { publicDb, getTenantDB } = require('../../config/database');
const logger = require('../utils/logger');

let isRunning = false;

// FBR API call helper (minimal — same logic as fbr route)
async function callFBR(endpoint, payload, config) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url  = new URL((config.api_endpoint || 'https://esp.fbr.gov.pk:8244/ESP/api') + endpoint);
    const req  = https.request({
      hostname: url.hostname, port: url.port || 8244,
      path: url.pathname, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Basic ${Buffer.from(`${config.user_id_fbr}:${config.password_enc}`).toString('base64')}`,
      },
      timeout: 10_000, rejectUnauthorized: false,
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: { raw: d } }); }
      });
    });
    req.on('timeout', () => reject(new Error('timeout')));
    req.on('error',   reject);
    req.write(body); req.end();
  });
}

async function syncTenant(slug) {
  const db = getTenantDB(slug);

  const config = await db.queryOne(`SELECT * FROM fbr_config WHERE is_active=TRUE LIMIT 1`);
  if (!config) return;

  // Find up to 20 pending invoices
  const pending = await db.queryAll(`
    SELECT i.id, i.invoice_number, i.invoice_date, i.grand_total,
           i.tax_amount, i.discount_amount, i.payment_mode,
           i.customer_name, i.customer_phone
    FROM invoices i
    WHERE i.fbr_status IN ('pending','failed')
      AND i.status NOT IN ('voided','draft')
      AND NOT EXISTS (
        SELECT 1 FROM fbr_transmissions ft WHERE ft.invoice_id=i.id AND ft.attempt_no >= 5
      )
    ORDER BY i.invoice_date ASC LIMIT 20
  `);

  if (!pending.length) return;

  logger.info(`FBR sync job: ${pending.length} invoice(s) for tenant ${slug}`);

  for (const inv of pending) {
    const items = await db.queryAll(
      `SELECT * FROM invoice_items WHERE invoice_id=$1 ORDER BY sort_order`, [inv.id]
    );

    const payload = {
      InvoiceNumber: inv.invoice_number,
      POSID: config.pos_id,
      USIN:  config.integration_id,
      DateTime: new Date(inv.invoice_date).toISOString(),
      BuyerName: inv.customer_name || 'Walk-in',
      BuyerPhoneNumber: inv.customer_phone || '',
      TotalSaleValue: parseFloat(inv.grand_total),
      TotalTaxCharged: parseFloat(inv.tax_amount || 0),
      Discount: parseFloat(inv.discount_amount || 0),
      PaymentMode: inv.payment_mode === 'cash' ? 1 : 2,
      InvoiceType: 1,
      Items: items.map((item, i) => ({
        SerialNo: i + 1, ItemCode: item.sku, ItemName: item.product_name,
        Quantity: parseFloat(item.qty), TaxRate: parseFloat(item.tax_rate || 0),
        SaleValue: parseFloat(item.line_total), TaxCharged: parseFloat(item.tax_amount || 0),
        Discount: parseFloat(item.discount_amount || 0), FurtherTax: 0, InvoiceType: 1,
        PCTCode: '9999.9999',
      })),
    };

    let fbrRes, success = false;
    try {
      fbrRes  = await callFBR('/PostInvoice', payload, config);
      success = fbrRes.status === 200 && fbrRes.body?.Code === 100;
    } catch (err) {
      fbrRes  = { status: 0, body: { error: err.message } };
    }

    const newStatus   = success ? 'success' : 'failed';
    const fbrInvoiceNo= fbrRes.body?.InvoiceNumber || null;

    await db.execute(`
      INSERT INTO fbr_transmissions
        (invoice_id, status, request_payload, response_body, http_status, sent_at, attempt_no)
      SELECT $1,$2,$3,$4,$5,NOW(),
             COALESCE((SELECT MAX(attempt_no) FROM fbr_transmissions WHERE invoice_id=$1),0)+1
    `, [inv.id, newStatus, JSON.stringify(payload), JSON.stringify(fbrRes.body), fbrRes.status]);

    await db.execute(
      `UPDATE invoices SET fbr_status=$1, fbr_invoice_no=$2 WHERE id=$3`,
      [newStatus, fbrInvoiceNo, inv.id]
    );

    if (success) {
      logger.info(`FBR ✓ ${inv.invoice_number} → FBR#${fbrInvoiceNo}`);
    } else {
      logger.warn(`FBR ✗ ${inv.invoice_number}`, { status: fbrRes.status, body: fbrRes.body });
    }
  }

  // Update last sync timestamp in config
  await db.execute(`UPDATE fbr_config SET last_sync_at=NOW() WHERE id=$1`, [config.id]);
}

// ── Main job ──────────────────────────────────────────────────
async function runFBRSync() {
  if (isRunning) return; // prevent overlap
  isRunning = true;
  try {
    const tenants = await publicDb.queryAll(
      `SELECT slug FROM tenants WHERE status='active'`
    );
    for (const { slug } of tenants) {
      try { await syncTenant(slug); }
      catch (err) { logger.error(`FBR sync error for tenant ${slug}`, { error: err.message }); }
    }
  } finally {
    isRunning = false;
  }
}

// ── Schedule: every 5 minutes ─────────────────────────────────
function startFBRSyncJob() {
  if (process.env.NODE_ENV === 'test') return; // don't run during tests

  cron.schedule('*/5 * * * *', async () => {
    try { await runFBRSync(); }
    catch (err) { logger.error('FBR sync job crashed', { error: err.message }); }
  });

  logger.info('FBR auto-sync job scheduled (every 5 minutes)');
}

module.exports = { startFBRSyncJob, runFBRSync };
