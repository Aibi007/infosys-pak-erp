// migrations/001_public_schema.js
// Public schema — tenant registry, super-admin accounts
// Run once on the shared DB before any tenant is provisioned

exports.up = async (knex) => {

  // ── Tenants ───────────────────────────────────────────────────
  if (!await knex.schema.hasTable('tenants')) {
    await knex.schema.createTable('tenants', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.string('slug', 60).notNullable().unique();
      t.string('name', 200).notNullable();
      t.string('business_name', 200);
      t.string('ntn', 20);
      t.string('strn', 30);
      t.string('address', 500);
      t.string('city', 100);
      t.string('phone', 30);
      t.string('email', 200);
      t.string('logo_url', 500);
      t.string('plan', 30).defaultTo('starter');
      t.boolean('is_active').defaultTo(true);
      t.json('settings');
      t.timestamp('trial_ends_at');
      t.timestamp('plan_expires_at');
      t.timestamps(true, true);
    });
  }

  // ── Super-admin accounts (cross-tenant) ───────────────────────
  if (!await knex.schema.hasTable('super_admins')) {
    await knex.schema.createTable('super_admins', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.string('email', 200).notNullable().unique();
      t.string('password_hash', 200).notNullable();
      t.string('name', 200).notNullable();
      t.boolean('is_active').defaultTo(true);
      t.timestamp('last_login_at');
      t.timestamps(true, true);
    });
  }

  // ── Audit log (cross-tenant, public schema) ───────────────────
  if (!await knex.schema.hasTable('audit_log')) {
    await knex.schema.createTable('audit_log', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      t.string('actor_type', 20).defaultTo('user');
      t.uuid('actor_id');
      t.string('action', 100).notNullable();
      t.string('entity_type', 100);
      t.uuid('entity_id');
      t.json('before');
      t.json('after');
      t.string('ip_address', 45);
      t.string('user_agent', 500);
      t.timestamp('created_at').defaultTo(knex.fn.now());

      // Add indexes for faster queries
      t.index('tenant_id');
      t.index('actor_id');
      t.index(['entity_type', 'entity_id']);
      t.index('created_at');
    });
  }

  // ── Plan limits ───────────────────────────────────────────────
  if (!await knex.schema.hasTable('plan_limits')) {
    await knex.schema.createTable('plan_limits', t => {
      t.string('plan', 30).primary();
      t.integer('max_users').defaultTo(3);
      t.integer('max_branches').defaultTo(1);
      t.integer('max_products').defaultTo(500);
      t.integer('max_invoices_per_month').defaultTo(500);
      t.boolean('has_fbr').defaultTo(false);
      t.boolean('has_hr').defaultTo(false);
      t.boolean('has_api_access').defaultTo(false);
    });
  }
  
  // Seed plan limits only if table is empty to ensure idempotency
  const planLimitsCount = await knex('plan_limits').count('plan as count').first();
  if (planLimitsCount.count === 0) {
    await knex('plan_limits').insert([
      { plan:'starter',    max_users:3,  max_branches:1, max_products:500,   max_invoices_per_month:500,  has_fbr:false, has_hr:false, has_api_access:false },
      { plan:'pro',        max_users:15, max_branches:3, max_products:5000,  max_invoices_per_month:5000, has_fbr:true,  has_hr:true,  has_api_access:false },
      { plan:'enterprise', max_users:999,max_branches:99,max_products:999999,max_invoices_per_month:99999,has_fbr:true,  has_hr:true,  has_api_access:true  },
    ]);
  }
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('plan_limits');
  await knex.schema.dropTableIfExists('audit_log');
  await knex.schema.dropTableIfExists('super_admins');
  await knex.schema.dropTableIfExists('tenants');
};
