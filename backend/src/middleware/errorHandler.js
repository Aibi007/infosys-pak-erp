'use strict';
// ================================================================
// src/middleware/errorHandler.js — Global error handler
// Catches all errors thrown in route handlers and returns
// a clean JSON response. Never leaks stack traces in production.
// ================================================================
const logger = require('../utils/logger');

const isDev = process.env.NODE_ENV !== 'production';

// Known error types we handle gracefully
const PG_ERROR_CODES = {
  '23505': { status: 409, message: 'Duplicate entry — this record already exists' },
  '23503': { status: 409, message: 'Referenced record not found (foreign key constraint)' },
  '23502': { status: 400, message: 'Required field is missing (not-null constraint)' },
  '42501': { status: 403, message: 'Insufficient database privileges' },
  '42P01': { status: 500, message: 'Database table not found — run migrations' },
  '08006': { status: 503, message: 'Database connection failed' },
  '57014': { status: 504, message: 'Query cancelled (statement timeout)' },
};

module.exports = function errorHandler(err, req, res, next) {
  // Already responded?
  if (res.headersSent) return next(err);

  const log = logger.forRequest(req);

  // ── PostgreSQL errors ─────────────────────────────────────
  if (err.code && PG_ERROR_CODES[err.code]) {
    const { status, message } = PG_ERROR_CODES[err.code];
    log.warn('PostgreSQL error', { code: err.code, detail: err.detail });
    return res.status(status).json({
      success: false,
      error:   message,
      ...(isDev && { detail: err.detail, constraint: err.constraint }),
    });
  }

  // ── JWT errors ────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Token expired' });
  }

  // ── Zod validation errors (thrown manually) ──────────────
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error:   'Validation failed',
      details: err.errors,
    });
  }

  // ── Express body-parser errors ────────────────────────────
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Request body too large' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Invalid JSON in request body' });
  }

  // ── Application errors with explicit status ───────────────
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error:   err.message,
    });
  }

  // ── Unknown / unexpected errors ───────────────────────────
  log.error('Unhandled error', {
    error:   err.message,
    stack:   err.stack,
    path:    req.path,
    method:  req.method,
  });

  return res.status(500).json({
    success: false,
    error:   'Internal server error',
    ...(isDev && { message: err.message, stack: err.stack }),
  });
};

// ── AppError factory ──────────────────────────────────────────
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports.AppError = AppError;
