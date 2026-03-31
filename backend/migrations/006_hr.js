// migrations/006_hr.js — Employees, attendance, payroll, leave management

exports.up = async (knex) => {

  // ── Employees ─────────────────────────────────────────────────
  if (!await knex.schema.hasTable('employees')) {
    await knex.schema.createTable('employees', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
      t.string('emp_no', 30).notNullable().unique();
      t.string('name', 300).notNullable();
      t.string('name_ur', 300);
      t.string('designation', 200).notNullable();
      t.string('department', 100).notNullable();
      t.string('gender', 10);
      t.date('dob');
      t.string('cnic', 20).unique();
      t.string('phone', 30);
      t.string('mobile', 30);
      t.string('email', 200);
      t.string('address', 500);
      t.string('city', 100);
      t.date('join_date').notNullable();
      t.date('end_date');
      t.string('employment_type', 30).defaultTo('permanent');
      t.string('status', 20).defaultTo('active');
      t.decimal('basic_salary',    18, 2).notNullable().defaultTo(0);
      t.decimal('house_allowance', 18, 2).defaultTo(0);
      t.decimal('transport_allow', 18, 2).defaultTo(0);
      t.decimal('medical_allow',   18, 2).defaultTo(0);
      t.decimal('other_allowance', 18, 2).defaultTo(0);
      t.decimal('income_tax',      18, 2).defaultTo(0);
      t.decimal('eobi_deduction',  18, 2).defaultTo(1066);
      t.decimal('loan_deduction',  18, 2).defaultTo(0);
      t.decimal('other_deduction', 18, 2).defaultTo(0);
      t.string('bank_name', 100);
      t.string('account_no', 50);
      t.string('account_title', 200);
      t.text('notes');
      t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      t.timestamps(true, true);
      t.index('department');
    });
  }

  // ── Leave Entitlements ────────────────────────────────────────
  if (!await knex.schema.hasTable('leave_types')) {
    await knex.schema.createTable('leave_types', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.string('name', 100).notNullable();
      t.integer('days_per_year').notNullable().defaultTo(0);
      t.boolean('is_paid').defaultTo(true);
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);
    });
  }

  // Seed leave types
  const leaveTypesCount = await knex('leave_types').count('id as count').first();
  if (leaveTypesCount.count === 0) {
    await knex('leave_types').insert([
      { id: knex.raw('(UUID())'), name:'Annual Leave',    days_per_year:21, is_paid:true  },
      { id: knex.raw('(UUID())'), name:'Sick Leave',      days_per_year:10, is_paid:true  },
      { id: knex.raw('(UUID())'), name:'Casual Leave',    days_per_year:10, is_paid:true  },
      { id: knex.raw('(UUID())'), name:'Maternity Leave', days_per_year:84, is_paid:true  },
      { id: knex.raw('(UUID())'), name:'Unpaid Leave',    days_per_year:30, is_paid:false },
    ]);
  }

  // ── Leave Balances (per employee per year) ────────────────────
  if (!await knex.schema.hasTable('leave_balances')) {
    await knex.schema.createTable('leave_balances', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      t.uuid('leave_type_id').notNullable().references('id').inTable('leave_types').onDelete('CASCADE');
      t.integer('year').notNullable();
      t.decimal('entitled', 8, 2).notNullable().defaultTo(0);
      t.decimal('taken',    8, 2).defaultTo(0);
      t.decimal('remaining',8, 2).notNullable().defaultTo(0);
      t.unique(['employee_id','leave_type_id','year']);
      t.timestamps(true, true);
    });
  }

  // ── Leave Requests ────────────────────────────────────────────
  if (!await knex.schema.hasTable('leave_requests')) {
    await knex.schema.createTable('leave_requests', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      t.uuid('leave_type_id').notNullable().references('id').inTable('leave_types').onDelete('RESTRICT');
      t.date('from_date').notNullable();
      t.date('to_date').notNullable();
      t.decimal('days', 6, 2).notNullable();
      t.text('reason').notNullable();
      t.string('status', 20).defaultTo('pending');
      t.uuid('approved_by').references('id').inTable('users');
      t.timestamp('approved_at');
      t.text('rejection_reason');
      t.timestamps(true, true);
    });
  }

  // ── Attendance ────────────────────────────────────────────────
  if (!await knex.schema.hasTable('attendance')) {
    await knex.schema.createTable('attendance', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
      t.date('att_date').notNullable();
      t.string('status', 10).notNullable().defaultTo('P');
      t.time('check_in');
      t.time('check_out');
      t.integer('minutes_late').defaultTo(0);
      t.uuid('marked_by').references('id').inTable('users');
      t.text('notes');
      t.unique(['employee_id','att_date']);
      t.timestamps(true, true);
      t.index('employee_id');
      t.index('att_date');
    });
  }

  // ── Payroll Runs ──────────────────────────────────────────────
  if (!await knex.schema.hasTable('payroll_runs')) {
    await knex.schema.createTable('payroll_runs', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.string('month', 7).notNullable().unique();
      t.integer('year').notNullable();
      t.string('status', 20).defaultTo('draft');
      t.decimal('total_gross',      18, 2).defaultTo(0);
      t.decimal('total_deductions', 18, 2).defaultTo(0);
      t.decimal('total_net',        18, 2).defaultTo(0);
      t.integer('employee_count').defaultTo(0);
      t.uuid('processed_by').references('id').inTable('users');
      t.timestamp('processed_at');
      t.uuid('approved_by').references('id').inTable('users');
      t.timestamp('approved_at');
      t.text('notes');
      t.timestamps(true, true);
    });
  }

  // ── Payroll Lines (one per employee per run) ──────────────────
  if (!await knex.schema.hasTable('payroll_lines')) {
    await knex.schema.createTable('payroll_lines', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('run_id').notNullable().references('id').inTable('payroll_runs').onDelete('CASCADE');
      t.uuid('employee_id').notNullable().references('id').inTable('employees').onDelete('RESTRICT');
      t.integer('working_days').notNullable();
      t.integer('present_days').defaultTo(0);
      t.integer('absent_days').defaultTo(0);
      t.integer('late_count').defaultTo(0);
      t.integer('half_days').defaultTo(0);
      t.integer('leave_days').defaultTo(0);
      t.decimal('basic_salary',     18, 2).notNullable();
      t.decimal('house_allowance',  18, 2).defaultTo(0);
      t.decimal('transport_allow',  18, 2).defaultTo(0);
      t.decimal('medical_allow',    18, 2).defaultTo(0);
      t.decimal('other_allowance',  18, 2).defaultTo(0);
      t.decimal('gross_salary',     18, 2).notNullable();
      t.decimal('absent_deduction', 18, 2).defaultTo(0);
      t.decimal('late_deduction',   18, 2).defaultTo(0);
      t.decimal('half_day_deduction',18,2).defaultTo(0);
      t.decimal('income_tax',       18, 2).defaultTo(0);
      t.decimal('eobi',             18, 2).defaultTo(0);
      t.decimal('loan_deduction',   18, 2).defaultTo(0);
      t.decimal('other_deduction',  18, 2).defaultTo(0);
      t.decimal('total_deductions', 18, 2).notNullable();
      t.decimal('net_pay',          18, 2).notNullable();
      t.string('payment_mode', 50).defaultTo('Bank Transfer');
      t.boolean('is_paid').defaultTo(false);
      t.timestamp('paid_at');
      t.unique(['run_id','employee_id']);
      t.timestamps(true, true);
    });
  }
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('payroll_lines');
  await knex.schema.dropTableIfExists('payroll_runs');
  await knex.schema.dropTableIfExists('attendance');
  await knex.schema.dropTableIfExists('leave_requests');
  await knex.schema.dropTableIfExists('leave_balances');
  await knex.schema.dropTableIfExists('leave_types');
  await knex.schema.dropTableIfExists('employees');
};
