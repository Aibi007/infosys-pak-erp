'use strict';
// ================================================================
// src/routes/users.js
// GET    /users          — list tenant users
// POST   /users/invite   — invite a new user
// GET    /users/:id      — get user profile
// PATCH  /users/:id      — update name / role / branch
// DELETE /users/:id      — deactivate user
// ================================================================
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { z }   = require('zod');

const { publicDb }      = require('../../config/database');
const { authenticate, authorize, hasPermission, invalidatePermCache } = require('../middleware/auth');
const validate          = require('../middleware/validate');
const { ok, created, badRequest, notFound, conflict, paginated } = require('../utils/response');
const logger            = require('../utils/logger');

// All routes require auth + settings:users permission
router.use(authenticate);

// ── List users ────────────────────────────────────────────────
router.get('/', hasPermission('settings:users'), validate.query(validate.schemas.pagination), async (req, res, next) => {
  const { page, limit, search } = req.query;
  try {
    const searchClause = search
      ? `AND (u.full_name LIKE $3 OR u.email LIKE $3)`
      : '';
    const params = [req.tenantId, limit, ...(search ? [`%${search}%`] : [])];

    const sql = `
      SELECT u.id, u.email, u.full_name, u.full_name_ur,
             u.is_active, u.last_login_at, u.created_at,
             r.name AS role, r.display_name AS role_label
      FROM users u
      JOIN tenant_users tu ON tu.user_id = u.id
      JOIN roles r          ON r.id = tu.role_id
      WHERE u.tenant_id = $1 ${searchClause}
      ORDER BY u.created_at DESC
    `;

    const result = await req.tenantDb.paginate(
      `SELECT u.id, u.email, u.full_name, u.full_name_ur,
              u.is_active, u.last_login_at, u.created_at,
              r.name AS role, r.display_name AS role_label
       FROM users u
       JOIN tenant_users tu ON tu.user_id = u.id
       JOIN roles r          ON r.id = tu.role_id
       WHERE u.tenant_id = $1 ${searchClause}
       ORDER BY u.created_at DESC`,
      [req.tenantId, ...(search ? [`%${search}%`] : [])],
      { page, limit }
    );
    return paginated(res, result);
  } catch (err) { next(err); }
});

// ── Invite user ───────────────────────────────────────────────
const inviteSchema = z.object({
  email:    z.string().email(),
  fullName: z.string().min(2).max(255),
  fullNameUr: z.string().max(255).optional(),
  roleName: z.enum(['admin','manager','cashier','accountant','viewer']),
  branchId: z.string().uuid().optional(),
  password: z.string().min(8)
    .regex(/[A-Z]/, 'Must include uppercase')
    .regex(/[0-9]/, 'Must include number')
    .optional(),
});

router.post('/invite', hasPermission('settings:users'), validate(inviteSchema), async (req, res, next) => {
  const { email, fullName, fullNameUr, roleName, branchId, password } = req.body;
  try {
    // Check duplicate
    const existing = await publicDb.queryOne(
      `SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]
    );
    if (existing) return conflict(res, 'A user with this email already exists');

    // Resolve role
    const role = await req.tenantDb.queryOne(
      `SELECT id FROM roles WHERE name = $1`, [roleName]
    );
    if (!role) return badRequest(res, `Role '${roleName}' not found`);

    // Create user
    const tempPassword = password || Math.random().toString(36).slice(-10) + 'A1!';
    const hash = await bcrypt.hash(tempPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'));
    const userId = uuidv4();

    await publicDb.execute(
      `INSERT INTO users (id, tenant_id, email, password_hash, full_name, full_name_ur)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, req.tenantId, email.toLowerCase(), hash, fullName, fullNameUr || null]
    );

    // Assign role in tenant schema
    await req.tenantDb.execute(
      `INSERT INTO tenant_users (user_id, role_id, branch_id, invited_by, joined_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, role.id, branchId || null, req.userId]
    );

    logger.info('User invited', { invitedBy: req.userId, newUserId: userId, email, role: roleName });

    return created(res, { userId, email, role: roleName }, 'User created successfully');
  } catch (err) { next(err); }
});

// ── Get single user ───────────────────────────────────────────
router.get('/:id', hasPermission('settings:users'), async (req, res, next) => {
  try {
    const user = await publicDb.queryOne(
      `SELECT u.id, u.email, u.full_name, u.full_name_ur,
              u.is_active, u.last_login_at, u.created_at,
              r.name AS role, r.display_name AS role_label,
              tu.branch_id
       FROM users u
       JOIN tenant_users tu ON tu.user_id = u.id
       JOIN roles r          ON r.id = tu.role_id
       WHERE u.id = $1 AND u.tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (!user) return notFound(res, 'User');
    return ok(res, user);
  } catch (err) { next(err); }
});

// ── Update user (role, name, branch) ─────────────────────────
const updateSchema = z.object({
  fullName:  z.string().min(2).max(255).optional(),
  fullNameUr:z.string().max(255).optional(),
  roleName:  z.enum(['admin','manager','cashier','accountant','viewer']).optional(),
  branchId:  z.string().uuid().nullable().optional(),
  isActive:  z.boolean().optional(),
});

router.patch('/:id', hasPermission('settings:users'), validate(updateSchema), async (req, res, next) => {
  const { fullName, fullNameUr, roleName, branchId, isActive } = req.body;
  const targetId = req.params.id;
  try {
    // Prevent self-demotion
    if (targetId === req.userId && roleName) {
      return badRequest(res, 'You cannot change your own role');
    }

    if (fullName !== undefined || fullNameUr !== undefined || isActive !== undefined) {
      const sets = [];
      const vals = [];
      if (fullName   !== undefined) { sets.push(`full_name=$${vals.push(fullName)}`); }
      if (fullNameUr !== undefined) { sets.push(`full_name_ur=$${vals.push(fullNameUr)}`); }
      if (isActive   !== undefined) { sets.push(`is_active=$${vals.push(isActive)}`); }
      sets.push(`updated_at=NOW()`);
      vals.push(targetId);
      await publicDb.execute(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals
      );
    }

    if (roleName) {
      const role = await req.tenantDb.queryOne(`SELECT id FROM roles WHERE name=$1`, [roleName]);
      if (!role) return badRequest(res, `Role '${roleName}' not found`);
      await req.tenantDb.execute(
        `UPDATE tenant_users SET role_id=$1 WHERE user_id=$2`,
        [role.id, targetId]
      );
      invalidatePermCache(req.tenantSlug, targetId);
    }

    if (branchId !== undefined) {
      await req.tenantDb.execute(
        `UPDATE tenant_users SET branch_id=$1 WHERE user_id=$2`,
        [branchId, targetId]
      );
    }

    return ok(res, null, 'User updated');
  } catch (err) { next(err); }
});

// ── Deactivate ────────────────────────────────────────────────
router.delete('/:id', hasPermission('settings:users'), async (req, res, next) => {
  if (req.params.id === req.userId) return badRequest(res, 'You cannot deactivate yourself');
  try {
    await publicDb.execute(
      `UPDATE users SET is_active=FALSE, updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2`,
      [req.params.id, req.tenantId]
    );
    await req.tenantDb.execute(
      `UPDATE tenant_users SET is_active=FALSE WHERE user_id=$1`, [req.params.id]
    );
    // Revoke all tokens
    await publicDb.execute(
      `UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL`,
      [req.params.id]
    );
    invalidatePermCache(req.tenantSlug, req.params.id);
    return ok(res, null, 'User deactivated');
  } catch (err) { next(err); }
});

module.exports = router;
