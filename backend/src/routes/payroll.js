'use strict';
// ================================================================
// src/routes/payroll.js
// GET  /payroll                   — list payroll runs
// POST /payroll/calculate         — calculate a month's payroll
// GET  /payroll/:runId            — run detail + all slips
// POST /payroll/:runId/approve    — approve + post GL
// GET  /payroll/:runId/slip/:empId — individual payslip
// ================================================================
const router = require('express').Router();
const { z }  = require('zod');
const { authenticate, hasPermission } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ok, created, notFound, paginated, badRequest } = require('../utils/response');

router.use(authenticate);

// ── Helpers ───────────────────────────────────────────────────
function calcAttendanceSummary(attendanceRows, workingDays) {
  const statusMap = { P: 'present', A: 'absent', H: 'holiday', L: 'late', HD: 'halfDay', LE: 'leave', WO: 'weekOff' };
  const counts = { present:0, absent:0, late:0, halfDay:0, leave:0, holiday:0, weekOff:0 };
  let totalMinutesLate = 0;
  for (const a of attendanceRows) {
    const k = statusMap[a.status] || 'present';
    counts[k] = (counts[k]||0) + 1;
    if (a.status === 'L') totalMinutesLate += (a.minutes_late || 0);
  }
  return { ...counts, totalMinutesLate };
}

function calcPayroll(emp, salaryComps, summary, settingsMap) {
  const workingDays = parseInt(settingsMap['hr.working_days'] || '26');
  const eobi        = parseInt(settingsMap['hr.eobi_rate']    || '1066');

  const basic     = parseFloat(salaryComps.find(s=>s.name==='Basic Salary')?.amount||0);
  const house     = parseFloat(salaryComps.find(s=>s.name==='House Allowance')?.amount||0);
  const transport = parseFloat(salaryComps.find(s=>s.name==='Transport Allowance')?.amount||0);
  const medical   = parseFloat(salaryComps.find(s=>s.name==='Medical Allowance')?.amount||0);
  const incomeTax = parseFloat(salaryComps.find(s=>s.name==='Income Tax')?.amount||0);
  const loan      = parseFloat(salaryComps.find(s=>s.name==='Loan Repayment')?.amount||0);

  const grossEarnings = basic + house + transport + medical;
  const perDayRate    = basic / workingDays;
  const perMinuteRate = perDayRate / (8 * 60);

  const absentDed  = summary.absent  * perDayRate;
  const halfDayDed = summary.halfDay * (perDayRate / 2);
  const lateDed    = summary.totalMinutesLate * perMinuteRate;

  const totalDeductions = absentDed + halfDayDed + lateDed + incomeTax + eobi + loan;
  const netPay          = Math.max(0, grossEarnings - totalDeductions);

  return {
    basic_salary:        basic,
    house_allowance:     house,
    transport_allowance: transport,
    medical_allowance:   medical,
    gross_earnings:      grossEarnings,
    absent_deduction:    Math.round(absentDed * 100) / 100,
    late_deduction:      Math.round(lateDed   * 100) / 100,
    income_tax:          incomeTax,
    eobi_deduction:      eobi,
    loan_deduction:      loan,
    total_deductions:    Math.round(totalDeductions * 100) / 100,
    net_pay:             Math.round(netPay * 100) / 100,
  };
}

// ── GET /payroll ──────────────────────────────────────────────
router.get('/', hasPermission('hr:payroll'), validate.query(
  validate.schemas.pagination.extend({
    year: z.coerce.number().int().optional(),
  })
), async (req, res, next) => {
  const { page, limit, year } = req.query;
  const where = year ? `WHERE pr.year=$1` : '';
  try {
    const result = await req.tenantDb.paginate(`
      SELECT pr.id, pr.month, pr.year, pr.status,
             pr.total_gross, pr.total_net, pr.employee_count,
             pr.processed_at, pr.approved_at,
             b.name AS branch
      FROM payroll_runs pr JOIN branches b ON b.id=pr.branch_id
      ${where}
      ORDER BY pr.year DESC, pr.month DESC
    `, year ? [year] : [], { page, limit });
    return paginated(res, result);
  } catch (err) { next(err); }
});

// ── POST /payroll/calculate ───────────────────────────────────
router.post('/calculate', hasPermission('hr:payroll'), validate(z.object({
  month:    z.coerce.number().int().min(1).max(12),
  year:     z.coerce.number().int().min(2020).max(2100),
  branchId: z.string().uuid().optional(),
})), async (req, res, next) => {
  const { month, year } = req.body;
  try {
    const db = req.tenantDb;

    // Check if run already exists
    const existingRun = await db.queryOne(
      `SELECT id, status FROM payroll_runs WHERE month=$1 AND year=$2`, [month, year]
    );
    if (existingRun && ['approved','paid'].includes(existingRun.status)) {
      return badRequest(res, `Payroll for ${month}/${year} is already ${existingRun.status}`);
    }

    // Load settings
    const settings = await db.queryAll(`SELECT key, value FROM system_settings WHERE key LIKE 'hr.%'`);
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

    // Load all active employees
    const employees = await db.queryAll(`
      SELECT e.id, e.employee_id, e.full_name, e.department_id
      FROM employees e WHERE e.status IN ('active','on_leave')
    `);

    const branch = await db.queryOne(`SELECT id FROM branches WHERE is_main=TRUE LIMIT 1`);
    if (!branch) return badRequest(res, 'No main branch configured');

    // Upsert payroll run header
    const run = existingRun
      ? await db.queryOne(`UPDATE payroll_runs SET status='draft', processed_by=$1, processed_at=NOW() WHERE id=$2`, [req.userId, existingRun.id])
      : await db.queryOne(`
          INSERT INTO payroll_runs (month, year, branch_id, status, processed_by, processed_at)
          VALUES ($1,$2,$3,'draft',$4,NOW())
        `, [month, year, branch.id, req.userId]);

    // Clear existing details if recalculating
    await db.execute(`DELETE FROM payroll_details WHERE payroll_run_id=$1`, [run.id]);

    let totalGross=0, totalNet=0, totalDed=0;
    const details = [];

    for (const emp of employees) {
      // Load salary components
      const salaryComps = await db.queryAll(`
        SELECT sc.name, es.amount
        FROM employee_salaries es JOIN salary_components sc ON sc.id=es.component_id
        WHERE es.employee_id=$1 AND (es.effective_to IS NULL OR es.effective_to>=$2)
      `, [emp.id, `${year}-${String(month).padStart(2,'0')}-01`]);

      // Load attendance for the month
      const attRows = await db.queryAll(`
        SELECT status, minutes_late FROM attendance
        WHERE employee_id=$1
          AND MONTH(attendance_date)=$2
          AND YEAR(attendance_date)=$3
      `, [emp.id, month, year]);

      const summary = calcAttendanceSummary(attRows, parseInt(settingsMap['hr.working_days']||'26'));
      const calc    = calcPayroll(emp, salaryComps, summary, settingsMap);

      totalGross += calc.gross_earnings;
      totalNet   += calc.net_pay;
      totalDed   += calc.total_deductions;

      await db.execute(`
        INSERT INTO payroll_details
          (payroll_run_id, employee_id,
           days_present, days_absent, days_late, days_half, days_leave,
           basic_salary, house_allowance, transport_allowance, medical_allowance, gross_earnings,
           absent_deduction, late_deduction, income_tax, eobi_deduction, loan_deduction, total_deductions, net_pay)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      `, [
        run.id, emp.id,
        summary.present, summary.absent, summary.late, summary.halfDay, summary.leave,
        calc.basic_salary, calc.house_allowance, calc.transport_allowance, calc.medical_allowance, calc.gross_earnings,
        calc.absent_deduction, calc.late_deduction, calc.income_tax, calc.eobi_deduction, calc.loan_deduction,
        calc.total_deductions, calc.net_pay,
      ]);

      details.push({ employeeId: emp.id, name: emp.full_name, ...calc });
    }

    // Update run totals
    await db.execute(`
      UPDATE payroll_runs SET total_gross=$1, total_net=$2, total_deductions=$3, employee_count=$4
      WHERE id=$5
    `, [totalGross, totalNet, totalDed, employees.length, run.id]);

    return ok(res, {
      runId:         run.id,
      month, year,
      employeeCount: employees.length,
      totalGross:    Math.round(totalGross),
      totalNet:      Math.round(totalNet),
      totalDeductions: Math.round(totalDed),
      details,
    }, `Payroll calculated for ${employees.length} employees`);
  } catch (err) { next(err); }
});

// ── GET /payroll/:runId ───────────────────────────────────────
router.get('/:runId', hasPermission('hr:payroll'), async (req, res, next) => {
  try {
    const db = req.tenantDb;
    const [run, details] = await Promise.all([
      db.queryOne(`SELECT pr.*, b.name AS branch FROM payroll_runs pr JOIN branches b ON b.id=pr.branch_id WHERE pr.id=$1`, [req.params.runId]),
      db.queryAll(`SELECT * FROM v_payslips WHERE id IN (SELECT id FROM payroll_details WHERE payroll_run_id=$1) ORDER BY full_name`, [req.params.runId]),
    ]);
    if (!run) return notFound(res, 'Payroll run');
    return ok(res, { run, details });
  } catch (err) { next(err); }
});

// ── POST /payroll/:runId/approve ──────────────────────────────
router.post('/:runId/approve', hasPermission('hr:payroll'), async (req, res, next) => {
  try {
    await req.tenantDb.transaction(async (txDb) => {
      const run = await txDb.queryOne(
        `SELECT * FROM payroll_runs WHERE id=$1 AND status='draft'`, [req.params.runId]
      );
      if (!run) throw Object.assign(new Error('Run not found or not in draft status'), { statusCode: 404 });

      // Post GL voucher for salary expense
      const period = await txDb.queryOne(
        `SELECT id FROM fiscal_periods WHERE status='open' LIMIT 1`
      );

      if (period) {
        const vno = `JV-SAL-${run.year}-${String(run.month).padStart(2,'0')}`;
        const v = await txDb.queryOne(`
          INSERT INTO vouchers (voucher_type_id, voucher_number, voucher_date, period_id,
            status, narration, reference_type, reference_id, total_debit, total_credit, created_by)
          SELECT id, $1, CURDATE(), $2, 'posted',
            CONCAT('Payroll - ', $3, '/', $4), 'payroll', $5, $6, $6, $7
          FROM voucher_types WHERE code='JV'
        `, [vno, period.id, run.month, run.year, run.id, run.total_net, req.userId]);

        if (v) {
          // DR Salary Expense (6001)
          await txDb.execute(`
            INSERT INTO voucher_lines (voucher_id, account_id, debit, credit, narration)
            SELECT $1, id, $2, 0, 'Salary expense' FROM accounts WHERE code='6001'
          `, [v.id, run.total_gross]);

          // DR EOBI Expense (6009)
          await txDb.execute(`
            INSERT INTO voucher_lines (voucher_id, account_id, debit, credit, narration)
            SELECT $1, id, $2, 0, 'EOBI contribution' FROM accounts WHERE code='6009'
          `, [v.id, run.total_deductions]);

          // CR Salary Payable (2020)
          await txDb.execute(`
            INSERT INTO voucher_lines (voucher_id, account_id, debit, credit, narration)
            SELECT $1, id, 0, $2, 'Net salary payable' FROM accounts WHERE code='2020'
          `, [v.id, run.total_net]);

          // CR EOBI Payable (2011)
          await txDb.execute(`
            INSERT INTO voucher_lines (voucher_id, account_id, debit, credit, narration)
            SELECT $1, id, 0, $2, 'EOBI payable' FROM accounts WHERE code='2011'
          `, [v.id, run.total_deductions]);
        }
      }

      await txDb.execute(`
        UPDATE payroll_runs SET status='approved', approved_by=$1, approved_at=NOW() WHERE id=$2
      `, [req.userId, req.params.runId]);
    });
    return ok(res, null, 'Payroll approved and GL posted');
  } catch (err) { next(err); }
});

// ── GET /payroll/:runId/slip/:empId ───────────────────────────
router.get('/:runId/slip/:empId', hasPermission('hr:payroll'), async (req, res, next) => {
  try {
    const [slip, company] = await Promise.all([
      req.tenantDb.queryOne(
        `SELECT * FROM v_payslips WHERE payroll_run_id=$1 AND employee_id=$2`,
        [req.params.runId, req.params.empId]
      ),
      req.tenantDb.queryAll(`SELECT key, value FROM system_settings WHERE key LIKE 'company.%'`),
    ]);
    if (!slip) return notFound(res, 'Payslip');
    const settings = Object.fromEntries(company.map(r => [r.key.replace('company.',''), r.value]));
    return ok(res, { slip, company: settings });
  } catch (err) { next(err); }
});

module.exports = router;
