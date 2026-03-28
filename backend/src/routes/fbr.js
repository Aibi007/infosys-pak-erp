'use strict';
// ================================================================
// src/routes/fbr.js
// POST /fbr/sync/:invoiceId  — submit single invoice to FBR PRAL
// POST /fbr/retry-failed     — batch retry all failed transmissions
// GET  /fbr/status           — queue depth + last sync stats
// GET  /fbr/config           — FBR config for branch
// PUT  /fbr/config           — update FBR config
// ================================================================
const router  = require('express').Router();
const https   = require('https');
const { z }   = require('zod');
const { authenticate, hasPermission } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ok, created, notFound, badRequest, serverError } = require('../utils/response');
const logger  = require('../utils/logger');

router.use(authenticate);

// ── FBR API caller ────────────────────────────────────────────
async function callFBRApi(endpoint, payload, config) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url  = new URL(config.api_endpoint + endpoint);

    const options = {
      hostname: url.hostname,
      port:     url.port || 8244,
      path:     url.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization':  `Basic ${Buffer.from(`${config.user_id_fbr}:${config.password_enc}`).toString('base64')}`,
      },
      timeout: parseInt(process.env.FBR_TIMEOUT_MS || '10000'),
      rejectUnauthorized: false, // FBR uses self-signed cert
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: { raw: data } });
        }
      });
    });
    req.on('timeout', () => reject(new Error('FBR API timeout')));
    req.on('error',   (e) => reject(e));
    req.write(body);
    req.end();
  });
}

// ── Build FBR payload from invoice ───────────────────────────
function buildFBRPayload(invoice, items, config) {
  return {
    InvoiceNumber:    invoice.invoice_number,
    POSID:            config.pos_id,
    USIN:             config.integration_id,
    DateTime:         new Date(invoice.invoice_date).toISOString(),
    BuyerNTN:         invoice.customer_ntn || '',
    BuyerCNIC:        invoice.customer_cnic || '',
    BuyerName:        invoice.customer_name || 'Walk-in',
    BuyerPhoneNumber: invoice.customer_phone || '',
    TotalSaleValue:   parseFloat(invoice.grand_total),
    TotalQuantity:    items.reduce((s, i) => s + parseFloat(i.qty), 0),
    TotalTaxCharged:  parseFloat(invoice.tax_amount),
    Discount:         parseFloat(invoice.discount_amount || 0),
    FurtherTax:       0,
    PaymentMode:      invoice.payment_mode === 'cash' ? 1 : 2,
    InvoiceType:      1,
    Items: items.map((item, idx) => ({
      ItemCode:     item.sku,
      ItemName:     item.product_name,
      Quantity:     parseFloat(item.qty),
      PCTCode:      '9999.9999',
      TaxRate:      parseFloat(item.tax_rate || 0),
      SaleValue:    parseFloat(item.unit_price * item.qty),
      TaxCharged:   parseFloat(item.tax_amount || 0),
      Discount:     parseFloat(item.discount_amount || 0),
      FurtherTax:   0,
      InvoiceType:  1,
      SerialNo:     idx + 1,
    })),
  };
}

// ── POST /fbr/sync/:invoiceId ─────────────────────────────────
router.post('/sync/:invoiceId', hasPermission('reports:fbr'), async (req, res, next) => {
  const { invoiceId } = req.params;
  try {
    const db = req.tenantDb;

    // Load invoice with customer join
    const invoice = await db.queryOne(`
      SELECT i.*, c.ntn AS customer_ntn, c.cnic AS customer_cnic
      FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id
      WHERE i.id=$1 AND i.status NOT IN ('voided','draft')
    `, [invoiceId]);
    if (!invoice) return notFound(res, 'Invoice');

    if (invoice.fbr_status === 'success') {
      return badRequest(res, `Invoice already successfully transmitted (FBR #${invoice.fbr_invoice_no})`);
    }

    // Load items
    const items = await db.queryAll(
      `SELECT * FROM invoice_items WHERE invoice_id=$1 ORDER BY sort_order`, [invoiceId]
    );

    // Load FBR config
    const config = await db.queryOne(`SELECT * FROM fbr_config WHERE is_active=TRUE LIMIT 1`);
    if (!config) return badRequest(res, 'FBR not configured for this tenant. Set up FBR config first.');

    // Get or create transmission record
    const existing = await db.queryOne(
      `SELECT id, attempt_no FROM fbr_transmissions WHERE invoice_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [invoiceId]
    );
    const attemptNo = (existing?.attempt_no || 0) + 1;

    // Build and send payload
    const payload  = buildFBRPayload(invoice, items, config);
    const txnId    = existing?.id || (await db.queryOne(
      `INSERT INTO fbr_transmissions (invoice_id, status) VALUES ($1,'pending') RETURNING id`, [invoiceId]
    ))?.id;

    // Update status to 'sent'
    await db.execute(
      `UPDATE fbr_transmissions SET status='sent', request_payload=$1, sent_at=NOW(), attempt_no=$2 WHERE id=$3`,
      [JSON.stringify(payload), attemptNo, txnId]
    );
    await db.execute(`UPDATE invoices SET fbr_status='sent' WHERE id=$1`, [invoiceId]);

    // Call FBR PRAL API
    let fbrResponse, fbrSuccess = false, fbrInvoiceNo = null;
    try {
      fbrResponse  = await callFBRApi('/PostInvoice', payload, config);
      fbrSuccess   = fbrResponse.status === 200 && fbrResponse.body?.Code === 100;
      fbrInvoiceNo = fbrResponse.body?.InvoiceNumber || null;
    } catch (fbrErr) {
      fbrResponse  = { status: 0, body: { error: fbrErr.message } };
    }

    // Update transmission result
    const newStatus = fbrSuccess ? 'success' : 'failed';
    await db.execute(`
      UPDATE fbr_transmissions
      SET status=$1, response_body=$2, http_status=$3,
          error_msg=$4, fbr_invoice_no=$5
      WHERE id=$6
    `, [
      newStatus, JSON.stringify(fbrResponse.body), fbrResponse.status,
      fbrSuccess ? null : JSON.stringify(fbrResponse.body).slice(0, 300),
      fbrInvoiceNo, txnId,
    ]);

    // Update invoice
    await db.execute(`
      UPDATE invoices
      SET fbr_status=$1, fbr_invoice_no=$2, fbr_qr_code=$3
      WHERE id=$4
    `, [
      newStatus, fbrInvoiceNo,
      fbrSuccess ? `https://invoice.fbr.gov.pk/verify/${invoice.invoice_number}` : null,
      invoiceId,
    ]);

    logger.info('FBR sync', {
      invoiceId, invoiceNo: invoice.invoice_number,
      fbrSuccess, fbrInvoiceNo, httpStatus: fbrResponse.status,
      tenantSlug: req.tenantSlug,
    });

    return ok(res, {
      success:       fbrSuccess,
      fbrInvoiceNo,
      status:        newStatus,
      httpStatus:    fbrResponse.status,
      response:      fbrResponse.body,
    }, fbrSuccess ? 'Invoice transmitted to FBR successfully' : 'FBR transmission failed');

  } catch (err) { next(err); }
});

// ── POST /fbr/retry-failed ────────────────────────────────────
router.post('/retry-failed', hasPermission('reports:fbr'), async (req, res, next) => {
  const { limit = 10 } = req.body;
  try {
    const db = req.tenantDb;

    const config = await db.queryOne(`SELECT * FROM fbr_config WHERE is_active=TRUE LIMIT 1`);
    if (!config) return badRequest(res, 'FBR not configured');

    // Find failed invoices (max 5 attempts)
    const failed = await db.queryAll(`
      SELECT DISTINCT i.id AS invoice_id
      FROM invoices i
      JOIN fbr_transmissions ft ON ft.invoice_id=i.id
      WHERE i.fbr_status IN ('failed','pending')
        AND i.status NOT IN ('voided','draft')
        AND ft.attempt_no < 5
      ORDER BY i.invoice_date ASC
      LIMIT $1
    `, [Math.min(parseInt(limit), 50)]);

    const results = [];
    for (const { invoice_id } of failed) {
      try {
        const invoice = await db.queryOne(`
          SELECT i.*, c.ntn AS customer_ntn, c.cnic AS customer_cnic
          FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id WHERE i.id=$1
        `, [invoice_id]);
        const items = await db.queryAll(`SELECT * FROM invoice_items WHERE invoice_id=$1`, [invoice_id]);
        const payload = buildFBRPayload(invoice, items, config);

        let fbrResponse;
        try { fbrResponse = await callFBRApi('/PostInvoice', payload, config); }
        catch (e) { fbrResponse = { status: 0, body: { error: e.message } }; }

        const success = fbrResponse.status === 200 && fbrResponse.body?.Code === 100;
        await db.execute(`
          INSERT INTO fbr_transmissions (invoice_id, status, request_payload, response_body, http_status, sent_at, attempt_no)
          SELECT $1,$2,$3,$4,$5,NOW(),COALESCE((SELECT MAX(attempt_no)+1 FROM fbr_transmissions WHERE invoice_id=$1),1)
        `, [invoice_id, success?'success':'failed', JSON.stringify(payload), JSON.stringify(fbrResponse.body), fbrResponse.status]);

        await db.execute(
          `UPDATE invoices SET fbr_status=$1, fbr_invoice_no=$2 WHERE id=$3`,
          [success?'success':'failed', fbrResponse.body?.InvoiceNumber||null, invoice_id]
        );
        results.push({ invoice_id, invoice_number: invoice.invoice_number, success });
      } catch (err) {
        results.push({ invoice_id, success: false, error: err.message });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    return ok(res, { total: results.length, succeeded, failed: results.length - succeeded, results },
      `Retried ${results.length} invoice(s) — ${succeeded} succeeded`);
  } catch (err) { next(err); }
});

// ── GET /fbr/status ───────────────────────────────────────────
router.get('/status', hasPermission('reports:fbr'), async (req, res, next) => {
  try {
    const [queue, config, lastSync] = await Promise.all([
      req.tenantDb.queryAll(`
        SELECT fbr_status, COUNT(*) AS count
        FROM invoices WHERE status NOT IN ('voided','draft')
        GROUP BY fbr_status
      `),
      req.tenantDb.queryOne(`SELECT pos_id, integration_id, is_active, last_sync_at FROM fbr_config LIMIT 1`),
      req.tenantDb.queryOne(`
        SELECT MAX(sent_at) AS last_sent,
               SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) AS success_count,
               SUM(CASE WHEN status='failed'  THEN 1 ELSE 0 END) AS failed_count
        FROM fbr_transmissions WHERE sent_at >= NOW() - INTERVAL '24 hours'
      `),
    ]);
    return ok(res, { queue, config, last24h: lastSync });
  } catch (err) { next(err); }
});

// ── GET /fbr/config ───────────────────────────────────────────
router.get('/config', hasPermission('settings:read'), async (req, res, next) => {
  try {
    const config = await req.tenantDb.queryOne(
      `SELECT id, branch_id, pos_id, integration_id, user_id_fbr, api_endpoint, is_active, last_sync_at
       FROM fbr_config LIMIT 1`
    );
    return ok(res, config || null);
  } catch (err) { next(err); }
});

// ── PUT /fbr/config ───────────────────────────────────────────
router.put('/config', hasPermission('settings:update'), validate(z.object({
  branchId:      z.string().uuid(),
  posId:         z.string().min(1).max(50),
  integrationId: z.string().min(1).max(100),
  userIdFbr:     z.string().min(1).max(100),
  passwordEnc:   z.string().min(1),
  apiEndpoint:   z.string().url().optional(),
})), async (req, res, next) => {
  const { branchId, posId, integrationId, userIdFbr, passwordEnc, apiEndpoint } = req.body;
  try {
    await req.tenantDb.execute(`
      INSERT INTO fbr_config (branch_id, pos_id, integration_id, user_id_fbr, password_enc, api_endpoint)
      VALUES ($1,$2,$3,$4,$5,COALESCE($6,'https://esp.fbr.gov.pk:8244/ESP/api'))
      ON CONFLICT (branch_id) DO UPDATE
        SET pos_id=$2, integration_id=$3, user_id_fbr=$4, password_enc=$5,
            api_endpoint=COALESCE($6,fbr_config.api_endpoint), updated_at=NOW()
    `, [branchId, posId, integrationId, userIdFbr, passwordEnc, apiEndpoint||null]);
    return ok(res, null, 'FBR config saved');
  } catch (err) { next(err); }
});

module.exports = router;
