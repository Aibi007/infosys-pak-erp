'use strict';
// src/middleware/auth.js - Production-Ready Implementation

const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../utils/response');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

/**
 * Middleware to authenticate a user based on a JWT token.
 * Verifies the token and attaches user and tenant info to the request object.
 */
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return unauthorized(res, 'No authentication token provided.');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Attach all decoded information to the request for use in subsequent middleware/handlers
        req.userId = decoded.userId;
        req.email = decoded.email;
        req.userRole = decoded.role; // Renamed for consistency
        req.tenantId = decoded.tenantId;
        req.tenantSlug = decoded.tenantSlug;
        req.isSuperAdmin = decoded.isSuperAdmin || false;
        
        // For backward compatibility with authorize/hasPermission, populate req.user and req.permissions
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };
        
        // Permissions should be handled more dynamically, but for now, this reflects login logic
        req.permissions = (req.isSuperAdmin || decoded.role === 'admin') ? ['*'] : (decoded.permissions || []);

        if (!req.userId || !req.tenantId) {
            logger.warn('Token verification succeeded but payload is missing required fields', { decoded });
            return unauthorized(res, 'Invalid token payload.');
        }

        next();
    } catch (err) {
        logger.warn('JWT Verification Failed', { error: err.name, message: err.message });
        if (err instanceof jwt.TokenExpiredError) {
            return unauthorized(res, 'Authentication token has expired.');
        }
        if (err instanceof jwt.JsonWebTokenError) {
            return unauthorized(res, 'Invalid authentication token.');
        }
        return internalError(res, 'Could not process authentication token.');
    }
}

/**
 * Middleware to authorize users based on their role.
 */
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.userRole) return unauthorized(res, 'Authentication details not found.');
        if (req.isSuperAdmin) return next(); // Super admins can do anything
        if (roles.length && !roles.includes(req.userRole)) {
            return forbidden(res, `This action requires one of the following roles: ${roles.join(', ')}.`);
        }
        next();
    };
}

/**
 * Middleware to check for a specific permission.
 */
function hasPermission(permission) {
    return (req, res, next) => {
        if (!req.permissions) return unauthorized(res, 'Authentication details not found.');
        if (req.isSuperAdmin || req.permissions.includes('*') || req.permissions.includes(permission)) {
            return next();
        }
        return forbidden(res, `You do not have the required permission: '${permission}'.`);
    };
}

/**
 * Middleware to ensure the user is a super admin.
 */
function requireSuperAdmin(req, res, next) {
    if (!req.isSuperAdmin) {
        return forbidden(res, 'This action is restricted to super administrators only.');
    }
    next();
}

module.exports = {
    authenticate,
    authorize,
    hasPermission,
    requireSuperAdmin
};
