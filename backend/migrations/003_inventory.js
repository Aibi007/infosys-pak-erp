// migrations/003_inventory.js — Products, variants, warehouses, stock movements

exports.up = async (knex) => {

  // ── Warehouses ────────────────────────────────────────────────
  if (!await knex.schema.hasTable('warehouses')) {
    await knex.schema.createTable('warehouses', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
      t.string('name', 200).notNullable();
      t.string('code', 20).notNullable().unique();
      t.string('city', 100);
      t.string('address', 500);
      t.boolean('is_default').defaultTo(false);
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);
    });
  }

  // ── Categories ────────────────────────────────────────────────
  if (!await knex.schema.hasTable('categories')) {
    await knex.schema.createTable('categories', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('parent_id').references('id').inTable('categories').onDelete('SET NULL');
      t.string('name', 200).notNullable();
      t.string('name_ur', 200);
      t.string('slug', 200).notNullable().unique();
      t.integer('sort_order').defaultTo(0);
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);
    });
  }

  // ── Products ──────────────────────────────────────────────────
  if (!await knex.schema.hasTable('products')) {
    await knex.schema.createTable('products', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('category_id').references('id').inTable('categories').onDelete('SET NULL');
      t.uuid('tax_rate_id').references('id').inTable('tax_rates').onDelete('SET NULL');
      t.string('name', 500).notNullable();
      t.string('name_ur', 500);
      t.string('sku', 100).unique();
      t.string('barcode', 100).unique();
      t.string('brand', 200);
      t.text('description');
      t.string('unit_of_measure', 30).defaultTo('Pcs'); // Pcs | Set | Meters | Kg | Box | Dozen
      t.decimal('cost_price',    18, 2).defaultTo(0);
      t.decimal('selling_price', 18, 2).defaultTo(0);
      t.decimal('wholesale_price',18,2).defaultTo(0);
      t.decimal('min_price',     18, 2).defaultTo(0);
      t.integer('reorder_level').defaultTo(5);
      t.boolean('has_variants').defaultTo(false);
      t.boolean('track_inventory').defaultTo(true);
      t.boolean('is_active').defaultTo(true);
      t.json('attributes'); // Changed from jsonb and removed default
      t.string('image_url', 500);
      t.timestamps(true, true);
    });
  }

  // ── Product Variants ──────────────────────────────────────────
  if (!await knex.schema.hasTable('product_variants')) {
    await knex.schema.createTable('product_variants', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      t.string('sku', 100).unique();
      t.string('barcode', 100).unique();
      t.string('color', 100);
      t.string('size', 50);
      t.string('fabric', 100);
      t.string('season', 50);
      t.decimal('cost_price',    18, 2);
      t.decimal('selling_price', 18, 2);
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);
    });
  }

  // ── Stock (warehouse × variant) ───────────────────────────────
  if (!await knex.schema.hasTable('stock')) {
    await knex.schema.createTable('stock', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      t.uuid('variant_id').references('id').inTable('product_variants').onDelete('CASCADE');
      t.uuid('warehouse_id').notNullable().references('id').inTable('warehouses').onDelete('CASCADE');
      t.decimal('quantity', 18, 3).defaultTo(0);
      t.decimal('reserved', 18, 3).defaultTo(0);      // reserved for open orders
      t.timestamps(true, true);
      t.unique(['product_id','variant_id','warehouse_id']);
    });
  }

  // ── Stock Movements (immutable ledger) ───────────────────────
  if (!await knex.schema.hasTable('stock_movements')) {
    await knex.schema.createTable('stock_movements', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('product_id').notNullable().references('id').inTable('products');
      t.uuid('variant_id').references('id').inTable('product_variants');
      t.uuid('from_warehouse_id').references('id').inTable('warehouses');
      t.uuid('to_warehouse_id').references('id').inTable('warehouses');
      t.string('movement_type', 30).notNullable();
      // purchase_receipt | sale | return | transfer | adjustment | opening
      t.decimal('quantity', 18, 3).notNullable();
      t.decimal('unit_cost', 18, 2).defaultTo(0);
      t.string('reference_type', 30);                 // invoice | purchase_order | grn
      t.uuid('reference_id');
      t.text('notes');
      t.uuid('created_by').references('id').inTable('users');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Removed raw SQL for index creation as it was causing issues.
  // These can be added back with MySQL-compatible syntax if needed.
};

exports.down = async (knex) => {
  // The drop statements are wrapped to avoid errors if run multiple times
  // or if the tables don't exist.
  await knex.schema.dropTableIfExists('stock_movements');
  await knex.schema.dropTableIfExists('stock');
  await knex.schema.dropTableIfExists('product_variants');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('categories');
  await knex.schema.dropTableIfExists('warehouses');
};
