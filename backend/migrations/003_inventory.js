// migrations/003_inventory.js — Products, variants, warehouses, stock movements

exports.up = async (knex) => {

  // ── Warehouses ────────────────────────────────────────────────
  await knex.schema.createTable('warehouses', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
    t.string('name', 200).notNullable();
    t.string('code', 20).notNullable().unique();
    t.string('city', 100);
    t.string('address', 500);
    t.boolean('is_default').defaultTo(false);
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── Categories ────────────────────────────────────────────────
  await knex.schema.createTable('categories', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('parent_id').references('id').inTable('categories').onDelete('SET NULL');
    t.string('name', 200).notNullable();
    t.string('name_ur', 200);
    t.string('slug', 200).notNullable().unique();
    t.integer('sort_order').defaultTo(0);
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── Products ──────────────────────────────────────────────────
  await knex.schema.createTable('products', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
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
    t.jsonb('attributes').defaultTo('{}');            // e.g. {"season":"summer"}
    t.string('image_url', 500);
    t.timestamps(true, true);
  });

  // Full-text search index on products
  await knex.raw(`
    CREATE INDEX idx_products_name_fts
    ON products USING gin(to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(sku,'') || ' ' || coalesce(barcode,'')));
  `);

  // ── Product Variants ──────────────────────────────────────────
  await knex.schema.createTable('product_variants', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
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

  // ── Stock (warehouse × variant) ───────────────────────────────
  await knex.schema.createTable('stock', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.uuid('variant_id').references('id').inTable('product_variants').onDelete('CASCADE');
    t.uuid('warehouse_id').notNullable().references('id').inTable('warehouses').onDelete('CASCADE');
    t.decimal('quantity', 18, 3).defaultTo(0);
    t.decimal('reserved', 18, 3).defaultTo(0);      // reserved for open orders
    t.timestamps(true, true);
    t.unique(['product_id','variant_id','warehouse_id']);
  });

  // ── Stock Movements (immutable ledger) ───────────────────────
  await knex.schema.createTable('stock_movements', t => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
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

  await knex.raw(`
    CREATE INDEX idx_stock_mov_product ON stock_movements(product_id);
    CREATE INDEX idx_stock_mov_ref     ON stock_movements(reference_type, reference_id);
    CREATE INDEX idx_stock_mov_date    ON stock_movements(created_at DESC);
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('stock_movements');
  await knex.schema.dropTableIfExists('stock');
  await knex.schema.dropTableIfExists('product_variants');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('categories');
  await knex.schema.dropTableIfExists('warehouses');
};
