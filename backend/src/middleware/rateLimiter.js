'use strict';
// ================================================================
// src/middleware/rateLimiter.js
// Tiered rate limiters using express-rate-limit
// auth   : 10 req / 15 min per IP (brute-force protection)
// api    : 200 req / 1 min per IP
// strict : 5 req / 1 min per IP (for sensitive endpoints)
// ================================================================
const rateLimit = require('express-rate-limit');

const keyGenerator = (req) => {
  // Prefer forwarded IP (behind nginx/cloudflare), fallback to socket
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    ?? req.socket.remoteAddress
    ?? 'unknown';
};

const handler = (req, res) => {
  res.status(429).json({
    success: false,
    error:   'Too many requests. Please slow down.',
    retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
  });
};

// ── Auth rate limiter ─────────────────────────────────────────
const auth = rateLimit({
  windowMs:         parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000'), // 15 min
  max:              parseInt(process.env.RATE_LIMIT_AUTH_MAX       || '10'),
  keyGenerator,
  handler,
  standardHeaders:  true,
  legacyHeaders:    false,
  skipSuccessfulRequests: false,
  message:          'Too many login attempts. Try again in 15 minutes.',
});

// ── General API rate limiter ──────────────────────────────────
const api = rateLimit({
  windowMs:         parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000'),  // 1 min
  max:              parseInt(process.env.RATE_LIMIT_API_MAX        || '200'),
  keyGenerator,
  handler,
  standardHeaders:  true,
  legacyHeaders:    false,
  skip: (req) => req.path === '/health',
});

// ── Strict limiter for sensitive ops (password reset, etc.) ──
const strict = rateLimit({
  windowMs:  60_000,
  max:       5,
  keyGenerator,
  handler,
  standardHeaders: true,
  legacyHeaders:   false,
});

module.exports = { auth, api, strict };
