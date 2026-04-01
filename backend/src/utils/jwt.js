'use strict';
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function signAccessToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_SECONDS || '900') });
}

function signRefreshToken(userId) {
  const raw  = crypto.randomBytes(64).toString('hex');
  const hash = hashToken(raw);
  return { raw, hash };
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function verifyAccessToken(token) {
  return jwt.verify(token, SECRET);
}

function decodeToken(token) {
  return jwt.decode(token);
}

function buildAuthTokens(user, tenantSlug, permissions = []) {
  const payload = { userId: user.id, sub: user.id, tenantSlug, role: user.role, permissions, isSuperAdmin: user.is_super_admin || false };
  const accessToken = signAccessToken(payload);
  const { raw, hash } = signRefreshToken(user.id);
  return { accessToken, refreshTokenRaw: raw, refreshTokenHash: hash };
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, decodeToken, hashToken, buildAuthTokens };
