// migrations/004_sales.js — Customers, invoices, payments

exports.up = async (knex) => {

  // ── Customers ─────────────────────────────────────────────────
  await knex.schema.createTable('customers', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
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
  });

  await knex.raw(`
    CREATE INDEX idx_customers_name ON customers USING gin(to_tsvector('simple', name));
    CREATE INDEX idx_customers_code ON customers(code);
  `);

  // ── Invoices ──────────────────────────────────────────────────
  await knex.schema.createTable('invoices', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('invoice_no', 50).notNullable().unique();
    t.uuid('customer_id').references('id').inTable('customers').onDelete('RESTRICT');
    t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
    t.uuid('warehouse_id').references('id').inTable('warehouses').onDelete('SET NULL');
    t.uuid('created_by').references('id').inTable('users');
    t.date('invoice_date').notNullable().defaultTo(knex.fn.now());
    t.date('due_date');
    t.string('status', 20).notNullable().defaultTo('draft');
    // draft | confirmed | paid | partial | cancelled | returned
    t.string('payment_status', 20).defaultTo('unpaid');  // unpaid | partial | paid
    t.decimal('subtotal',      18, 2).defaultTo(0);
    t.decimal('discount_pct',  6, 2).defaultTo(0);
    t.decimal('discount_amt',  18, 2).defaultTo(0);
    t.decimal('tax_amount',    18, 2).defaultTo(0);
    t.decimal('total',         18, 2).defaultTo(0);
    t.decimal('paid_amount',   18, 2).defaultTo(0);
    t.decimal('balance_due',   18, 2).defaultTo(0);
    t.string('payment_method', 30);
    t.text('notes');
    t.string('fbr_invoice_no', 100);                // FBR-assigned invoice number
    t.string('fbr_status', 20).defaultTo('pending'); // pending | synced | failed
    t.timestamp('fbr_synced_at');
    t.boolean('is_pos').defaultTo(false);
    t.timestamps(true, true);
  });

  await knex.raw(`
    CREATE INDEX idx_invoices_customer  ON invoices(customer_id);
    CREATE INDEX idx_invoices_date      ON invoices(invoice_date DESC);
    CREATE INDEX idx_invoices_status    ON invoices(status);
    CREATE INDEX idx_invoices_fbr       ON invoices(fbr_status) WHERE fbr_status != 'synced';
  `);

  // ── Invoice Line Items ────────────────────────────────────────
  await knex.schema.createTable('invoice_items', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('invoice_id').notNullable().references('id').inTable('invoices').onDelete('CASCADE');
    t.uuid('product_id').references('id').inTable('products').onDelete('RESTRICT');
    t.uuid('variant_id').references('id').inTable('product_variants').onDelete('SET NULL');
    t.string('product_name', 500).notNullable();    // snapshot at time of sale
    t.string('sku', 100);
    t.string('unit_of_measure', 30).defaultTo('Pcs');
    t.decimal('quantity',     18, 3).notNullable();
    t.decimal('unit_price',   18, 2).notNullable();
    t.decimal('cost_price',   18, 2).defaultTo(0);  // for margin tracking
    t.decimal('discount_pct', 6, 2).defaultTo(0);
    t.decimal('discount_amt', 18, 2).defaultTo(0);
    t.decimal('tax_rate',     6, 4).defaultTo(0);
    t.decimal('tax_amount',   18, 2).defaultTo(0);
    t.decimal('subtotal',     18, 2).notNullable();
    t.decimal('total',        18, 2).notNullable();
    t.integer('sort_order').defaultTo(0);
  });

  // ── Payments / Receipts ───────────────────────────────────────
  await knex.schema.createTable('payments', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('payment_no', 50).notNullable().unique();
    t.string('payment_type', 20).notNullable();     // receipt | payment (AP)
    t.uuid('customer_id').references('id').inTable('customers').onDelete('SET NULL');
    t.uuid('vendor_id');                             // FK set in procurement migration
    t.uuid('invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
    t.uuid('account_id').references('id').inTable('accounts').onDelete('RESTRICT');
    t.date('payment_date').notNullable().defaultTo(knex.fn.now());
    t.string('payment_mode', 50).notNullable();     // Cash | HBL Bank | MCB | Cheque | Easypaisa | JazzCash
    t.decimal('amount', 18, 2).notNullable();
    t.string('reference_no', 100);                  // cheque number, IBFT ref, etc.
    t.text('notes');
    t.uuid('created_by').references('id').inTable('users');
    t.timestamps(true, true);
  });

  await knex.raw(`
    CREATE INDEX idx_payments_customer ON payments(customer_id);
    CREATE INDEX idx_payments_date     ON payments(payment_date DESC);
    CREATE INDEX idx_payments_invoice  ON payments(invoice_id);
  `);

  // ── Journal Entries (double-entry ledger) ─────────────────────
  await knex.schema.createTable('journal_entries', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('voucher_no', 50).notNullable().unique();
    t.string('voucher_type', 30).notNullable();
    // cash_receipt | cash_payment | bank_receipt | bank_payment | journal | opening
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
  });

  // ── Journal Lines ─────────────────────────────────────────────
  await knex.schema.createTable('journal_lines', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('journal_id').notNullable().references('id').inTable('journal_entries').onDelete('CASCADE');
    t.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('RESTRICT');
    t.text('description');
    t.decimal('debit',  18, 2).defaultTo(0);
    t.decimal('credit', 18, 2).defaultTo(0);
    t.integer('sort_order').defaultTo(0);
    t.constraint('check_debit_credit', knex.raw('CHECK(debit >= 0 AND credit >= 0)'));
    t.constraint('check_not_both',     knex.raw('CHECK(NOT (debit > 0 AND credit > 0))'));
  });

  await knex.raw(`
    CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date DESC);
    CREATE INDEX idx_journal_lines_acct   ON journal_lines(account_id);
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('journal_lines');
  await knex.schema.dropTableIfExists('journal_entries');
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('invoice_items');
  await knex.schema.dropTableIfExists('invoices');
  await knex.schema.dropTableIfExists('customers');
};
