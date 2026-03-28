'use strict';
const { v4: uuidv4 } = require('uuid');

// Attaches a unique request ID to req and response header.
// Reuses X-Request-ID if the client sent one (for tracing).
module.exports = function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  req.requestId  = incoming && /^[\w-]{8,64}$/.test(incoming)
    ? incoming
    : uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};
