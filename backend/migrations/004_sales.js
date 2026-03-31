// migrations/004_sales.js — Customers, invoices, payments

exports.up = async (knex) => {

  // ── Customers ─────────────────────────────────────────────────
  if (!await knex.schema.hasTable('customers')) {
    await knex.schema.createTable('customers', t => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('code', 30).notNullable().unique();
      t.string('name', 300).notNullable();
      t.string('name_ur', 300);
      t.string('contact_person', 200);
      t.string('phone', 30);
      t.string('mobile', 30);
      t.string('email', 200);
      t.string('cnic', 20);
      t.string('ntn', 20);
      t.string('address', 500);
      t.string('city', 100);
      t.string('type', 30).defaultTo('retail');       // retail | wholesale | distributor | corporate
      t.decimal('credit_limit', 18, 2).defaultTo(0);
      t.decimal('current_balance', 18, 2).defaultTo(0);
      t.string('payment_terms', 30).defaultTo('Cash');
      t.integer('credit_days').defaultTo(0);
      t.decimal('discount_pct', 6, 2).defaultTo(0);  // default discount
      t.integer('rating').defaultTo(3);
      t.text('notes');
      t.boolean('is_active').defaultTo(true);
      t.timestamp('last_invoice_at');
      t.timestamps(true, true);
      t.index('code');
    });
  }

  // ── Invoices ──────────────────────────────────────────────────
  if (!await knex.schema.hasTable('invoices')) {
    await knex.schema.createTable('invoices', t => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('invoice_no', 50).notNullable().unique();
      t.uuid('customer_id').references('id').inTable('customers').onDelete('RESTRICT');
      t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
      t.uuid('warehouse_id').references('id').inTable('warehouses').onDelete('SET NULL');
      t.uuid('created_by').references('id').inTable('users');
      t.date('invoice_date').notNullable();
      t.date('due_date');
      t.string('status', 20).notNullable().defaultTo('draft');
      t.string('payment_status', 20).defaultTo('unpaid');
      t.decimal('subtotal',      18, 2).defaultTo(0);
      t.decimal('discount_pct',  6, 2).defaultTo(0);
      t.decimal('discount_amt',  18, 2).defaultTo(0);
      t.decimal('tax_amount',    18, 2).defaultTo(0);
      t.decimal('total',         18, 2).defaultTo(0);
      t.decimal('paid_amount',   18, 2).defaultTo(0);
      t.decimal('balance_due',   18, 2).defaultTo(0);
      t.string('payment_method', 30);
      t.text('notes');
      t.string('fbr_invoice_no', 100);
      t.string('fbr_status', 20).defaultTo('pending');
      t.timestamp('fbr_synced_at');
      t.boolean('is_pos').defaultTo(false);
      t.timestamps(true, true);
      t.index('customer_id');
      t.index('invoice_date');
      t.index('status');
    });
  }

  // ── Invoice Line Items ────────────────────────────────────────
  if (!await knex.schema.hasTable('invoice_items')) {
    await knex.schema.createTable('invoice_items', t => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('invoice_id').notNullable().references('id').inTable('invoices').onDelete('CASCADE');
      t.uuid('product_id').references('id').inTable('products').onDelete('RESTRICT');
      t.uuid('variant_id').references('id').inTable('product_variants').onDelete('SET NULL');
      t.string('product_name', 500).notNullable();
      t.string('sku', 100);
      t.string('unit_of_measure', 30).defaultTo('Pcs');
      t.decimal('quantity',     18, 3).notNullable();
      t.decimal('unit_price',   18, 2).notNullable();
      t.decimal('cost_price',   18, 2).defaultTo(0);
      t.decimal('discount_pct', 6, 2).defaultTo(0);
      t.decimal('discount_amt', 18, 2).defaultTo(0);
      t.decimal('tax_rate',     6, 4).defaultTo(0);
      t.decimal('tax_amount',   18, 2).defaultTo(0);
      t.decimal('subtotal',     18, 2).notNullable();
      t.decimal('total',        18, 2).notNullable();
      t.integer('sort_order').defaultTo(0);
    });
  }

  // ── Payments / Receipts ───────────────────────────────────────
  if (!await knex.schema.hasTable('payments')) {
    await knex.schema.createTable('payments', t => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('payment_no', 50).notNullable().unique();
      t.string('payment_type', 20).notNullable();
      t.uuid('customer_id').references('id').inTable('customers').onDelete('SET NULL');
      t.uuid('vendor_id');
      t.uuid('invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
      t.uuid('account_id').references('id').inTable('accounts').onDelete('RESTRICT');
      t.date('payment_date').notNullable();
      t.string('payment_mode', 50).notNullable();
      t.decimal('amount', 18, 2).notNullable();
      t.string('reference_no', 100);
      t.text('notes');
      t.uuid('created_by').references('id').inTable('users');
      t.timestamps(true, true);
      t.index('customer_id');
      t.index('payment_date');
      t.index('invoice_id');
    });
  }

  // ── Journal Entries (double-entry ledger) ─────────────────────
  if (!await knex.schema.hasTable('journal_entries')) {
    await knex.schema.createTable('journal_entries', t => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('voucher_no', 50).notNullable().unique();
      t.string('voucher_type', 30).notNullable();
      t.date('entry_date').notNullable();
      t.text('description').notNullable();
      t.decimal('total_debit',  18, 2).notNullable();
      t.decimal('total_credit', 18, 2).notNullable();
      t.string('reference_type', 30);
      t.uuid('reference_id');
      t.boolean('is_posted').defaultTo(false);
      t.boolean('is_reversed').defaultTo(false);
      t.uuid('reversed_by');
      t.uuid('created_by').references('id').inTable('users');
      t.timestamps(true, true);
      t.index('entry_date');
    });
  }

  // ── Journal Lines ─────────────────────────────────────────────
  if (!await knex.schema.hasTable('journal_lines')) {
    await knex.schema.createTable('journal_lines', t => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('journal_id').notNullable().references('id').inTable('journal_entries').onDelete('CASCADE');
      t.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('RESTRICT');
      t.text('description');
      t.decimal('debit',  18, 2).defaultTo(0);
      t.decimal('credit', 18, 2).defaultTo(0);
      t.integer('sort_order').defaultTo(0);
      t.index('account_id');
    });
  }
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('journal_lines');
  await knex.schema.dropTableIfExists('journal_entries');
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('invoice_items');
  await knex.schema.dropTableIfExists('invoices');
  await knex.schema.dropTableIfExists('customers');
};
