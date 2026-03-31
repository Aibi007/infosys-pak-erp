// migrations/005_procurement.js — Vendors, Purchase Orders, GRNs

exports.up = async (knex) => {

  // ── Vendors ───────────────────────────────────────────────────
  if (!await knex.schema.hasTable('vendors')) {
    await knex.schema.createTable('vendors', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.string('code', 30).notNullable().unique();
      t.string('name', 300).notNullable();
      t.string('name_ur', 300);
      t.string('contact_person', 200);
      t.string('phone', 30);
      t.string('email', 200);
      t.string('city', 100);
      t.string('address', 500);
      t.string('type', 30).defaultTo('Manufacturer');
      t.string('ntn', 20);
      t.decimal('credit_limit',    18, 2).defaultTo(0);
      t.decimal('current_balance', 18, 2).defaultTo(0);
      t.string('payment_terms', 30).defaultTo('Net 30');
      t.integer('credit_days').defaultTo(30);
      t.integer('rating').defaultTo(3);
      t.boolean('is_active').defaultTo(true);
      t.timestamp('last_order_at');
      t.text('notes');
      t.timestamps(true, true);
    });
  }

  // Add vendor_id FK to payments now that vendors table exists
  if (await knex.schema.hasTable('payments') && await knex.schema.hasColumn('payments', 'vendor_id') && !await knex.schema.hasColumn('payments', 'vendor_id_foreign')) {
    await knex.schema.alterTable('payments', t => {
      t.foreign('vendor_id').references('id').inTable('vendors').onDelete('SET NULL');
    });
  }

  // ── Purchase Orders ───────────────────────────────────────────
  if (!await knex.schema.hasTable('purchase_orders')) {
    await knex.schema.createTable('purchase_orders', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.string('po_no', 50).notNullable().unique();
      t.uuid('vendor_id').notNullable().references('id').inTable('vendors').onDelete('RESTRICT');
      t.uuid('warehouse_id').references('id').inTable('warehouses').onDelete('SET NULL');
      t.uuid('created_by').references('id').inTable('users');
      t.uuid('approved_by').references('id').inTable('users');
      t.date('order_date').notNullable().defaultTo(knex.fn.now());
      t.date('expected_date');
      t.date('approved_at');
      t.string('status', 20).defaultTo('draft');
      t.string('payment_status', 20).defaultTo('unpaid');
      t.decimal('subtotal',   18, 2).defaultTo(0);
      t.decimal('discount',   18, 2).defaultTo(0);
      t.decimal('tax_amount', 18, 2).defaultTo(0);
      t.decimal('total',      18, 2).defaultTo(0);
      t.decimal('paid_amount',18, 2).defaultTo(0);
      t.text('notes');
      t.timestamps(true, true);
      t.index('vendor_id');
      t.index('order_date');
    });
  }

  // ── PO Line Items ─────────────────────────────────────────────
  if (!await knex.schema.hasTable('purchase_order_items')) {
    await knex.schema.createTable('purchase_order_items', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('po_id').notNullable().references('id').inTable('purchase_orders').onDelete('CASCADE');
      t.uuid('product_id').references('id').inTable('products').onDelete('RESTRICT');
      t.uuid('variant_id').references('id').inTable('product_variants').onDelete('SET NULL');
      t.string('product_name', 500).notNullable();
      t.string('sku', 100);
      t.string('unit_of_measure', 30).defaultTo('Pcs');
      t.decimal('quantity',          18, 3).notNullable();
      t.decimal('quantity_received', 18, 3).defaultTo(0);
      t.decimal('unit_cost',         18, 2).notNullable();
      t.decimal('tax_rate',          6, 4).defaultTo(0);
      t.decimal('tax_amount',        18, 2).defaultTo(0);
      t.decimal('total',             18, 2).notNullable();
      t.integer('sort_order').defaultTo(0);
    });
  }

  // ── Goods Receipt Notes ───────────────────────────────────────
  if (!await knex.schema.hasTable('grns')) {
    await knex.schema.createTable('grns', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.string('grn_no', 50).notNullable().unique();
      t.uuid('po_id').notNullable().references('id').inTable('purchase_orders').onDelete('RESTRICT');
      t.uuid('vendor_id').references('id').inTable('vendors').onDelete('SET NULL');
      t.uuid('warehouse_id').references('id').inTable('warehouses').onDelete('SET NULL');
      t.uuid('received_by').references('id').inTable('users');
      t.date('received_date').notNullable().defaultTo(knex.fn.now());
      t.string('status', 20).defaultTo('complete');
      t.decimal('total_value', 18, 2).defaultTo(0);
      t.text('notes');
      t.boolean('is_posted').defaultTo(false);
      t.timestamps(true, true);
      t.index('po_id');
      t.index('received_date');
    });
  }

  // ── GRN Line Items ────────────────────────────────────────────
  if (!await knex.schema.hasTable('grn_items')) {
    await knex.schema.createTable('grn_items', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('grn_id').notNullable().references('id').inTable('grns').onDelete('CASCADE');
      t.uuid('po_item_id').references('id').inTable('purchase_order_items').onDelete('SET NULL');
      t.uuid('product_id').references('id').inTable('products').onDelete('RESTRICT');
      t.uuid('variant_id').references('id').inTable('product_variants').onDelete('SET NULL');
      t.string('product_name', 500).notNullable();
      t.decimal('qty_ordered',  18, 3).notNullable();
      t.decimal('qty_received', 18, 3).notNullable();
      t.decimal('qty_accepted', 18, 3).notNullable();
      t.decimal('qty_rejected', 18, 3).defaultTo(0);
      t.text('reject_reason');
      t.decimal('unit_cost',    18, 2).notNullable();
      t.decimal('total_value',  18, 2).notNullable();
    });
  }
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('grn_items');
  await knex.schema.dropTableIfExists('grns');
  await knex.schema.dropTableIfExists('purchase_order_items');
  await knex.schema.dropTableIfExists('purchase_orders');
  if (await knex.schema.hasTable('payments')) {
    await knex.schema.alterTable('payments', t => t.dropForeign(['vendor_id']));
  }
  await knex.schema.dropTableIfExists('vendors');
};
