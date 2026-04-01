'use strict';
// ================================================================
// src/routes/hr.js
// GET  /hr/employees           — list employees
// POST /hr/employees           — create employee
// GET  /hr/employees/:id       — detail
// PUT  /hr/employees/:id       — update
// GET  /hr/attendance          — monthly attendance sheet
// POST /hr/attendance/mark     — mark attendance (bulk)
// GET  /hr/leaves              — leave requests
// POST /hr/leaves              — apply leave
// PATCH /hr/leaves/:id/review  — approve / reject
// ================================================================
const router = require('express').Router();
const { z }  = require('zod');
const { authenticate, hasPermission } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ok, created, notFound, paginated, badRequest } = require('../utils/response');

router.use(authenticate);

// ── Schemas ───────────────────────────────────────────────────
const employeeSchema = z.object({
  fullName:       z.string().min(2).max(255),
  fullNameUr:     z.string().max(255).optional(),
  designation:    z.string().max(100),
  designationUr:  z.string().max(100).optional(),
  departmentId:   z.string().uuid(),
  branchId:       z.string().uuid().optional(),
  gender:         z.enum(['male','female','other']),
  dob:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  cnic:           z.string().regex(/^\d{5}-\d{7}-\d$/).optional().nullable(),
  phone:          z.string().max(20).optional(),
  email:          z.string().email().optional().or(z.literal('')).nullable(),
  address:        z.string().max(500).optional(),
  city:           z.string().max(100).optional(),
  joiningDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employmentType: z.enum(['permanent','contract','probation','part_time']).default('permanent'),
  basicSalary:    z.coerce.number().min(0),
  houseAllowance: z.coerce.number().min(0).default(0),
  transport:      z.coerce.number().min(0).default(0),
  medical:        z.coerce.number().min(0).default(0),
  eobi:           z.coerce.number().min(0).default(1066),
  loanDeduction:  z.coerce.number().min(0).default(0),
  incomeTax:      z.coerce.number().min(0).default(0),
});

const leaveSchema = z.object({
  employeeId:  z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  fromDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason:      z.string().min(5).max(1000),
  reasonUr:    z.string().max(1000).optional(),
});

// ── GET /hr/departments ───────────────────────────────────────
router.get('/departments', async (req, res, next) => {
  try {
    const rows = await req.tenantDb.queryAll(`SELECT id, name, name_ur, code FROM departments WHERE is_active=TRUE ORDER BY name`);
    return ok(res, rows);
  } catch (err) { next(err); }
});

// ── GET /hr/employees ─────────────────────────────────────────
router.get('/employees', hasPermission('hr:read'), validate.query(
  validate.schemas.pagination.extend({
    dept:   z.string().uuid().optional(),
    status: z.enum(['active','on_leave','all']).default('active'),
  })
), async (req, res, next) => {
  const { page, limit, search, dept, status } = req.query;
  const conds=[]; const params=[];
  const p = v => { params.push(v); return `$${params.length}`; };
  if (status !== 'all') conds.push(`e.status=${p(status)}`);
  if (dept)   conds.push(`e.department_id=${p(dept)}`);
  if (search) conds.push(`(e.full_name LIKE ${p('%'+search+'%')} OR e.employee_id LIKE $${params.length} OR e.phone LIKE $${params.length})`);
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  try {
    const result = await req.tenantDb.paginate(`
      SELECT e.id, e.employee_id, e.full_name, e.full_name_ur,
             e.designation, e.designation_ur, e.phone, e.status,
             e.joining_date, e.employment_type, e.basic_salary,
             d.name AS department, d.name_ur AS department_ur
      FROM employees e JOIN departments d ON d.id=e.department_id
      ${where}
      ORDER BY e.full_name ASC
    `, params, { page, limit });
    return paginated(res, result);
  } catch (err) { next(err); }
});

// ── GET /hr/employees/:id ─────────────────────────────────────
router.get('/employees/:id', hasPermission('hr:read'), async (req, res, next) => {
  try {
    const db = req.tenantDb;
    const [employee, salaryComponents, leaveBalances] = await Promise.all([
      db.queryOne(`
        SELECT e.*, d.name AS department, d.name_ur AS department_ur
        FROM employees e JOIN departments d ON d.id=e.department_id WHERE e.id=$1
      `, [req.params.id]),
      db.queryAll(`
        SELECT es.amount, sc.name, sc.name_ur, sc.type
        FROM employee_salaries es JOIN salary_components sc ON sc.id=es.component_id
        WHERE es.employee_id=$1 AND (es.effective_to IS NULL OR es.effective_to >= CURDATE())
        ORDER BY sc.sort_order
      `, [req.params.id]),
      db.queryAll(`
        SELECT lb.*, lt.name AS leave_type, lt.name_ur AS leave_type_ur
        FROM leave_balances lb JOIN leave_types lt ON lt.id=lb.leave_type_id
        WHERE lb.employee_id=$1 AND lb.year=YEAR(CURDATE())
      `, [req.params.id]),
    ]);
    if (!employee) return notFound(res, 'Employee');
    return ok(res, { ...employee, salaryComponents, leaveBalances });
  } catch (err) { next(err); }
});

// ── POST /hr/employees ────────────────────────────────────────
router.post('/employees', hasPermission('hr:create'), validate(employeeSchema), async (req, res, next) => {
  const {
    fullName, fullNameUr, designation, designationUr, departmentId,
    gender, dob, cnic, phone, email, address, city,
    joiningDate, employmentType, basicSalary, houseAllowance, transport,
    medical, eobi, loanDeduction, incomeTax,
  } = req.body;
  const branchId = req.body.branchId;

  try {
    const employee = await req.tenantDb.transaction(async (txDb) => {
      // Resolve default branch if not given
      const branch = branchId
        ? await txDb.queryOne(`SELECT id FROM branches WHERE id=$1`, [branchId])
        : await txDb.queryOne(`SELECT id FROM branches WHERE is_main=TRUE LIMIT 1`);
      if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 400 });

      // Insert employee
      const emp = await txDb.queryOne(`
        INSERT INTO employees
          (branch_id, department_id, full_name, full_name_ur, designation, designation_ur,
           gender, dob, cnic, phone, email, address, city,
           joining_date, employment_type, basic_salary)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      `, [branch.id, departmentId, fullName, fullNameUr||null, designation, designationUr||null,
          gender, dob||null, cnic||null, phone||null, email||null, address||null, city||null,
          joiningDate, employmentType, basicSalary]);

      // Seed salary structure
      const components = [
        { name:'Basic Salary',       amount: basicSalary },
        { name:'House Allowance',    amount: houseAllowance },
        { name:'Transport Allowance',amount: transport },
        { name:'Medical Allowance',  amount: medical },
        { name:'EOBI',               amount: eobi },
        { name:'Loan Repayment',     amount: loanDeduction },
        { name:'Income Tax',         amount: incomeTax },
      ].filter(c => c.amount > 0);

      for (const comp of components) {
        const sc = await txDb.queryOne(`SELECT id FROM salary_components WHERE name=$1`, [comp.name]);
        if (sc) {
          await txDb.execute(`
            INSERT INTO employee_salaries (employee_id, component_id, amount)
            VALUES ($1,$2,$3)
          `, [emp.id, sc.id, comp.amount]);
        }
      }

      // Seed leave balances for current year
      const year = new Date().getFullYear();
      const leaveTypes = await txDb.queryAll(`SELECT id, annual_quota FROM leave_types WHERE annual_quota > 0`);
      for (const lt of leaveTypes) {
        await txDb.execute(`
          INSERT INTO leave_balances (employee_id, leave_type_id, year, quota)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT DO NOTHING
        `, [emp.id, lt.id, year, lt.annual_quota]);
      }

      return emp;
    });
    return created(res, employee, `Employee ${employee.employee_id} created`);
  } catch (err) { next(err); }
});

// ── GET /hr/attendance ────────────────────────────────────────
router.get('/attendance', hasPermission('hr:read'), validate.query(z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year:  z.coerce.number().int().min(2020).optional(),
  dept:  z.string().uuid().optional(),
})), async (req, res, next) => {
  const month = req.query.month || new Date().getMonth() + 1;
  const year  = req.query.year  || new Date().getFullYear();
  const deptCond = req.query.dept ? `AND e.department_id='${req.query.dept}'` : '';
  try {
    const [employees, attendance] = await Promise.all([
      req.tenantDb.queryAll(`
        SELECT e.id, e.employee_id, e.full_name, e.full_name_ur,
               d.name AS department
        FROM employees e JOIN departments d ON d.id=e.department_id
        WHERE e.status IN ('active','on_leave') ${deptCond}
        ORDER BY d.name, e.full_name
      `),
      req.tenantDb.queryAll(`
        SELECT employee_id, attendance_date, status, minutes_late
        FROM attendance
        WHERE MONTH(attendance_date)=$1
          AND YEAR(attendance_date)=$2
        ORDER BY attendance_date ASC
      `, [month, year]),
    ]);

    // Pivot attendance per employee
    const attMap = {};
    for (const a of attendance) {
      const day = new Date(a.attendance_date).getDate();
      if (!attMap[a.employee_id]) attMap[a.employee_id] = {};
      attMap[a.employee_id][day] = { status: a.status, minsLate: a.minutes_late };
    }

    const sheet = employees.map(e => ({
      ...e,
      days: attMap[e.id] || {},
    }));

    const daysInMonth = new Date(year, month, 0).getDate();
    return ok(res, { sheet, month, year, daysInMonth });
  } catch (err) { next(err); }
});

// ── POST /hr/attendance/mark ──────────────────────────────────
router.post('/attendance/mark', hasPermission('hr:read'), validate(z.object({
  date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(z.object({
    employeeId: z.string().uuid(),
    status:     z.enum(['P','A','H','L','HD','LE','WO']),
    checkIn:    z.string().optional(),
    checkOut:   z.string().optional(),
    minutesLate:z.coerce.number().int().min(0).default(0),
    notes:      z.string().max(200).optional(),
  })).min(1),
})), async (req, res, next) => {
  const { date, records } = req.body;
  try {
    await req.tenantDb.transaction(async (txDb) => {
      for (const r of records) {
        await txDb.execute(`
          INSERT INTO attendance (employee_id, attendance_date, status, check_in, check_out, minutes_late, notes, marked_by)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON DUPLICATE KEY UPDATE status=EXCLUDED.status, check_in=EXCLUDED.check_in,
                check_out=EXCLUDED.check_out, minutes_late=EXCLUDED.minutes_late,
                notes=EXCLUDED.notes, marked_by=EXCLUDED.marked_by
        `, [r.employeeId, date, r.status, r.checkIn||null, r.checkOut||null,
            r.minutesLate, r.notes||null, req.userId]);
      }
    });
    return ok(res, null, `Attendance marked for ${records.length} employee(s)`);
  } catch (err) { next(err); }
});

// ── GET /hr/leaves ────────────────────────────────────────────
router.get('/leaves', hasPermission('hr:read'), validate.query(
  validate.schemas.pagination.extend({
    status:     z.string().optional(),
    employeeId: z.string().uuid().optional(),
  })
), async (req, res, next) => {
  const { page, limit, status, employeeId } = req.query;
  const conds=[]; const params=[];
  const p = v => { params.push(v); return `$${params.length}`; };
  if (status)     conds.push(`lr.status=${p(status)}`);
  if (employeeId) conds.push(`lr.employee_id=${p(employeeId)}`);
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  try {
    const result = await req.tenantDb.paginate(`
      SELECT lr.id, lr.from_date, lr.to_date, lr.total_days,
             lr.status, lr.reason, lr.applied_at,
             e.full_name AS employee_name, e.full_name_ur AS employee_name_ur, e.employee_id,
             lt.name AS leave_type, lt.name_ur AS leave_type_ur
      FROM leave_requests lr
      JOIN employees e  ON e.id=lr.employee_id
      JOIN leave_types lt ON lt.id=lr.leave_type_id
      ${where}
      ORDER BY lr.applied_at DESC
    `, params, { page, limit });
    return paginated(res, result);
  } catch (err) { next(err); }
});

// ── POST /hr/leaves ───────────────────────────────────────────
router.post('/leaves', hasPermission('hr:read'), validate(leaveSchema), async (req, res, next) => {
  const { employeeId, leaveTypeId, fromDate, toDate, reason, reasonUr } = req.body;
  try {
    const from = new Date(fromDate), to = new Date(toDate);
    if (to < from) return badRequest(res, 'To date must be on or after from date');
    const days = Math.ceil((to - from) / 86400000) + 1;

    // Check balance
    const balance = await req.tenantDb.queryOne(`
      SELECT available FROM leave_balances
      WHERE employee_id=$1 AND leave_type_id=$2 AND year=YEAR(CURDATE())
    `, [employeeId, leaveTypeId]);

    if (balance && parseInt(balance.available) < days) {
      return badRequest(res, `Insufficient leave balance. Available: ${balance.available} day(s), requested: ${days}`);
    }

    const lr = await req.tenantDb.transaction(async (txDb) => {
      const request = await txDb.queryOne(`
        INSERT INTO leave_requests (employee_id, leave_type_id, from_date, to_date, total_days, reason, reason_ur)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [employeeId, leaveTypeId, fromDate, toDate, days, reason, reasonUr||null]);

      // Update pending count
      await txDb.execute(`
        UPDATE leave_balances SET pending=pending+$1
        WHERE employee_id=$2 AND leave_type_id=$3 AND year=YEAR(CURDATE())
      `, [days, employeeId, leaveTypeId]);

      return request;
    });
    return created(res, { id: lr.id, days }, 'Leave request submitted');
  } catch (err) { next(err); }
});

// ── PATCH /hr/leaves/:id/review ──────────────────────────────
router.patch('/leaves/:id/review', hasPermission('hr:read'), validate(z.object({
  action:     z.enum(['approve','reject']),
  reviewNote: z.string().max(500).optional(),
})), async (req, res, next) => {
  const { action, reviewNote } = req.body;
  const status = action === 'approve' ? 'approved' : 'rejected';
  try {
    await req.tenantDb.transaction(async (txDb) => {
      const lr = await txDb.queryOne(
        `SELECT * FROM leave_requests WHERE id=$1 AND status='pending'`, [req.params.id]
      );
      if (!lr) throw Object.assign(new Error('Leave request not found or already reviewed'), { statusCode: 404 });

      await txDb.execute(`
        UPDATE leave_requests SET status=$1, reviewed_by=$2, reviewed_at=NOW(), review_note=$3 WHERE id=$4
      `, [status, req.userId, reviewNote||null, req.params.id]);

      if (action === 'approve') {
        // Convert pending → used, update employee status if dates include today
        await txDb.execute(`
          UPDATE leave_balances SET used=used+$1, pending=pending-$1
          WHERE employee_id=$2 AND leave_type_id=$3 AND year=YEAR(CURDATE())
        `, [lr.total_days, lr.employee_id, lr.leave_type_id]);

        const today = new Date().toISOString().slice(0,10);
        if (lr.from_date <= today && lr.to_date >= today) {
          await txDb.execute(`UPDATE employees SET status='on_leave' WHERE id=$1`, [lr.employee_id]);
        }
      } else {
        // Return pending
        await txDb.execute(`
          UPDATE leave_balances SET pending=GREATEST(0,pending-$1)
          WHERE employee_id=$2 AND leave_type_id=$3 AND year=YEAR(CURDATE())
        `, [lr.total_days, lr.employee_id, lr.leave_type_id]);
      }
    });
    return ok(res, null, `Leave request ${status}`);
  } catch (err) { next(err); }
});

// ── GET /hr/leave-types ───────────────────────────────────────
router.get('/leave-types', async (req, res, next) => {
  try {
    const rows = await req.tenantDb.queryAll(`SELECT id, name, name_ur, annual_quota, is_paid FROM leave_types ORDER BY sort_order`);
    return ok(res, rows);
  } catch (err) { next(err); }
});

module.exports = router;
