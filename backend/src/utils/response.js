'use strict';
// ================================================================
// src/utils/response.js — Standardised API response envelope
//
// Every response follows:
//   { success: bool, data?: any, error?: string,
//     message?: string, pagination?: {...}, meta?: {...} }
// ================================================================

const ok = (res, data = null, message = null, statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    ...(data !== null && { data }),
  });

const created = (res, data, message = 'Created successfully') =>
  ok(res, data, message, 201);

const paginated = (res, { data, pagination }, message = null) =>
  res.status(200).json({
    success: true,
    ...(message && { message }),
    data,
    pagination,
  });

const noContent = (res) => res.status(204).send();

const badRequest = (res, error = 'Bad request', details = null) =>
  res.status(400).json({
    success: false,
    error,
    ...(details && { details }),
  });

const unauthorized = (res, error = 'Unauthorized') =>
  res.status(401).json({ success: false, error });

const forbidden = (res, error = 'Forbidden') =>
  res.status(403).json({ success: false, error });

const notFound = (res, resource = 'Resource') =>
  res.status(404).json({ success: false, error: `${resource} not found` });

const conflict = (res, error = 'Conflict') =>
  res.status(409).json({ success: false, error });

const unprocessable = (res, error = 'Unprocessable entity', details = null) =>
  res.status(422).json({
    success: false,
    error,
    ...(details && { details }),
  });

const serverError = (res, error = 'Internal server error') =>
  res.status(500).json({ success: false, error });

module.exports = {
  ok, created, paginated, noContent,
  badRequest, unauthorized, forbidden,
  notFound, conflict, unprocessable, serverError,
};
