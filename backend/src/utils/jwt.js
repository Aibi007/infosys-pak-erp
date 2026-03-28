'use strict';
// ================================================================
// src/utils/jwt.js — JWT helpers
// Access token: short-lived (15m), stateless
// Refresh token: long-lived (30d), stored in DB as hash
// ================================================================
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_SECRET  = process.env.JWT_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES  || '15m';
const REFRESH_EXPIRES= process.env.JWT_REFRESH_EXPIRES || '30d';

if (!ACCESS_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET env variable must be set in production');
}

const SECRET = ACCESS_SECRET || 'dev_secret_change_me';

// ── Sign ─────────────────────────────────────────────────────
function signAccessToken(payload) {
  // payload: { sub: userId, tenantId, tenantSlug, role, permissions[] }
  return jwt.sign(payload, SECRET, {
    expiresIn:  ACCESS_EXPIRES,
    issuer:     'infosys-pak-erp',
    audience:   'erp-client',
  });
}

function signRefreshToken(userId) {
  // Refresh token is random bytes — we store its SHA-256 hash in the DB
  const raw  = crypto.randomBytes(64).toString('hex');
  const hash = hashToken(raw);
  return { raw, hash };
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ── Verify ────────────────────────────────────────────────────
function verifyAccessToken(token) {
  return jwt.verify(token, SECRET, {
    issuer:   'infosys-pak-erp',
    audience: 'erp-client',
  });
}

// ── Decode without verify (for expired token inspection) ─────
function decodeToken(token) {
  return jwt.decode(token);
}

// ── Build full auth response ─────────────────────────────────
function buildAuthTokens(user, tenantSlug, permissions = []) {
  const accessPayload = {
    sub:         user.id,
    tenantId:    user.tenant_id,
    tenantSlug,
    role:        user.role,
    permissions,
    name:        user.full_name,
    isSuperAdmin:user.is_super_admin || false,
  };

  const accessToken           = signAccessToken(accessPayload);
  const { raw, hash }         = signRefreshToken(user.id);

  return { accessToken, refreshTokenRaw: raw, refreshTokenHash: hash };
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  decodeToken,
  hashToken,
  buildAuthTokens,
};
