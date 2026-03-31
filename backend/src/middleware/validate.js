'use strict';
// ================================================================
// src/middleware/validate.js
// Zod-based request validation middleware
// Usage:
//   router.post('/login', validate(loginSchema), handler)
//   validate.query(querySchema)  — validates req.query
//   validate.params(paramsSchema) — validates req.params
// ================================================================
const { z } = require('zod');
const { badRequest } = require('../utils/response');

// Format Zod errors into readable messages
function formatZodErrors(error) {
  return error.errors.map(e => ({
    field:   e.path.join('.') || 'root',
    message: e.message,
    code:    e.code,
  }));
}

// ── Body validator ────────────────────────────────────────────
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return badRequest(res, 'Validation failed', formatZodErrors(result.error));
    }
    req.body = result.data; // replace with parsed/coerced data
    next();
  };
}

// ── Query validator ───────────────────────────────────────────
validate.query = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return badRequest(res, 'Invalid query parameters', formatZodErrors(result.error));
  }
  req.query = result.data;
  next();
};

// ── Params validator ──────────────────────────────────────────
validate.params = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    return badRequest(res, 'Invalid path parameters', formatZodErrors(result.error));
  }
  req.params = result.data;
  next();
};

// ── Common reusable schemas ───────────────────────────────────
const { z: zz } = require('zod');

validate.schemas = {
  uuid: zz.string().uuid('Must be a valid UUID'),

  pagination: zz.object({
    page:   zz.coerce.number().int().min(1).default(1),
    limit:  zz.coerce.number().int().min(1).max(100).default(20),
    sortBy: zz.string().optional(),
    order:  zz.enum(['asc','desc']).default('asc'),
    search: zz.string().max(100).optional(),
  }),

  dateRange: zz.object({
    from: zz.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format').optional(),
    to:   zz.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format').optional(),
  }),

  pkrAmount: zz.number().min(0).max(999_999_999),

  phone: zz.string()
    .regex(/^0[0-9]{9,10}$/, 'Phone must be Pakistani format: 0300-1234567')
    .optional()
    .or(zz.literal('')),

  cnic: zz.string()
    .regex(/^\d{5}-\d{7}-\d$/, 'CNIC must be XXXXX-XXXXXXX-X format')
    .optional()
    .or(zz.literal('')),
};

module.exports = validate;
