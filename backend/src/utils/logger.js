'use strict';
// ================================================================
// src/utils/logger.js — Winston structured logger
// ================================================================
const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs   = require('fs');

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors, json } = format;

// ── Human-readable format for dev ───────────────────────────
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, requestId, tenantSlug, userId, ...meta }) => {
    let line = `${ts} ${level}: ${message}`;
    if (requestId)  line += ` [req:${requestId.slice(0,8)}]`;
    if (tenantSlug) line += ` [tenant:${tenantSlug}]`;
    if (userId)     line += ` [user:${userId.slice(0,8)}]`;
    const extra = Object.keys(meta).filter(k => !['stack'].includes(k));
    if (extra.length) line += ` ${JSON.stringify(Object.fromEntries(extra.map(k=>[k,meta[k]])))}`;
    if (meta.stack)   line += `\n${meta.stack}`;
    return line;
  })
);

// ── JSON format for production ───────────────────────────────
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const isDev = process.env.NODE_ENV !== 'production';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: isDev ? devFormat : prodFormat,
  transports: [
    new transports.Console(),
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level:    'error',
      maxsize:  10_485_760,  // 10MB
      maxFiles: 5,
    }),
    new transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize:  10_485_760,
      maxFiles: 10,
    }),
  ],
  exitOnError: false,
});

// Add http level
logger.http = (msg, meta) => logger.log('http', msg, meta);

// Child logger factory — pre-binds request context
logger.forRequest = (req) => logger.child({
  requestId:  req.requestId,
  tenantSlug: req.tenantSlug,
  userId:     req.userId,
});

module.exports = logger;
