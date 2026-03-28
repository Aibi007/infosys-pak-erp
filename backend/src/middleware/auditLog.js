'use strict';
// ================================================================
// src/middleware/auditLog.js
// Intercepts POST/PUT/PATCH/DELETE responses and writes an
// audit record to the public.audit_log table.
//
// Usage:
//   router.post('/invoices', authenticate, auditLog('invoice.create'), handler)
//   router.delete('/invoices/:id', authenticate, auditLog('invoice.void'), handler)
// ================================================================
const { publicDb } = require('../../config/database');
const logger       = require('../utils/logger');

function auditLog(action) {
  return (req, res, next) => {
    // Monkey-patch res.json to capture the response
    const originalJson = res.json.bind(res);

    res.json = function(body) {
      // Only log successful mutating operations
      if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
        const record = {
          action,
          userId:     req.userId     || null,
          tenantId:   req.tenantId   || null,
          tenantSlug: req.tenantSlug || null,
          ipAddress:  (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(),
          userAgent:  req.headers['user-agent']?.slice(0, 200) || null,
          requestId:  req.requestId  || null,
          method:     req.method,
          path:       req.path,
          // Store request body (sanitised — remove passwords)
          requestBody: sanitiseBody(req.body),
          // Store result ID if available
          resourceId: body?.data?.id || req.params?.id || null,
          statusCode: res.statusCode,
        };

        // Fire-and-forget (don't block response)
        writeAuditLog(record).catch(err => {
          logger.error('Audit log write failed', { error: err.message, action });
        });
      }

      return originalJson(body);
    };

    next();
  };
}

// Sanitise body — remove sensitive fields
function sanitiseBody(body) {
  if (!body || typeof body !== 'object') return null;
  const safe = { ...body };
  ['password', 'passwordHash', 'password_hash', 'refreshToken', 'token',
   'passwordEnc', 'password_enc', 'currentPassword', 'newPassword'].forEach(k => {
    if (k in safe) safe[k] = '[REDACTED]';
  });
  try {
    return JSON.stringify(safe).slice(0, 2000); // max 2KB
  } catch {
    return null;
  }
}

async function writeAuditLog(record) {
  await publicDb.execute(
    `INSERT INTO audit_log
       (action, user_id, tenant_id, ip_address, user_agent, request_id,
        method, path, request_body, resource_id, status_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      record.action, record.userId, record.tenantId,
      record.ipAddress, record.userAgent, record.requestId,
      record.method, record.path, record.requestBody,
      record.resourceId, record.statusCode,
    ]
  );
}

// ── Standalone audit writer (for use in services) ─────────────
async function writeAudit(userId, tenantId, action, details = {}) {
  try {
    await publicDb.execute(
      `INSERT INTO audit_log (action, user_id, tenant_id, request_body)
       VALUES ($1,$2,$3,$4)`,
      [action, userId, tenantId, JSON.stringify(details).slice(0,2000)]
    );
  } catch (err) {
    logger.error('writeAudit failed', { error: err.message });
  }
}

module.exports = { auditLog, writeAudit };
