// migrations/002_tenant_core.js
// Per-tenant schema — users, branches, settings, COA
// Applied to EACH tenant's schema after provisioning

exports.up = async (knex) => {
  // knex is configured with searchPath = tenantSlug when run via provisioning service

  // ── Branches ──────────────────────────────────────────────────
  if (!await knex.schema.hasTable('branches')) {
    await knex.schema.createTable('branches', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.string('name', 200).notNullable();
      t.string('code', 20).notNullable().unique();
      t.string('address', 500);
      t.string('city', 100);
      t.string('phone', 30);
      t.string('email', 200);
      t.boolean('is_main').defaultTo(false);
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);
    });
  }

  // ── Users (tenant-scoped) ────────────────────────────────────
  if (!await knex.schema.hasTable('users')) {
    await knex.schema.createTable('users', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
      t.string('name', 200).notNullable();
      t.string('email', 200).notNullable().unique();
      t.string('password_hash', 200).notNullable();
      t.string('phone', 30);
      t.string('role', 30).notNullable().defaultTo('cashier');
      // roles: admin | manager | accountant | cashier | hr | viewer
      t.json('permissions');
      t.string('language', 10).defaultTo('en');
      t.boolean('is_active').defaultTo(true);
      t.timestamp('last_login_at');
      t.string('refresh_token_hash', 200);
      t.timestamps(true, true);
    });
  }

  // ── Settings ─────────────────────────────────────────────────
  if (!await knex.schema.hasTable('settings')) {
    await knex.schema.createTable('settings', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.string('key', 100).notNullable().unique();
      t.text('value');
      t.string('type', 20).defaultTo('string'); // string|number|boolean|json
      t.string('group', 50).defaultTo('general');
      t.string('label', 200);
      t.timestamps(true, true);
    });
  }

  // ── Chart of Accounts ────────────────────────────────────────
  if (!await knex.schema.hasTable('accounts')) {
    await knex.schema.createTable('accounts', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.uuid('parent_id').references('id').inTable('accounts').onDelete('SET NULL');
      t.string('code', 20).notNullable().unique();
      t.string('name', 200).notNullable();
      t.string('name_ur', 200);                        // Urdu name
      t.string('type', 30).notNullable();
      // asset | liability | equity | revenue | expense
      t.string('sub_type', 50);
      t.string('currency', 10).defaultTo('PKR');
      t.decimal('opening_balance', 18, 2).defaultTo(0);
      t.decimal('current_balance', 18, 2).defaultTo(0);
      t.boolean('is_system').defaultTo(false);         // cannot delete system accounts
      t.boolean('is_active').defaultTo(true);
      t.integer('level').defaultTo(1);                 // tree depth
      t.integer('sort_order').defaultTo(0);
      t.timestamps(true, true);
    });
  }

  // ── Tax rates ────────────────────────────────────────────────
  if (!await knex.schema.hasTable('tax_rates')) {
    await knex.schema.createTable('tax_rates', t => {
      t.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
      t.string('name', 100).notNullable();
      t.decimal('rate', 8, 4).notNullable();           // e.g. 17.0000 for 17%
      t.string('type', 20).defaultTo('GST');           // GST | FED | WHT | exempt
      t.boolean('is_default').defaultTo(false);
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);
    });
  }
  
  // Seed default settings only if the table is empty
  const settingsCount = await knex('settings').count('id as count').first();
  if (settingsCount.count === 0) {
    await knex('settings').insert([
        { key:'company_name',       value:'Al-Baraka Textiles',  type:'string', group:'company',     label:'Company Name' },
        { key:'company_ntn',        value:'',                    type:'string', group:'company',     label:'NTN Number' },
        { key:'company_strn',       value:'',                    type:'string', group:'company',     label:'STRN Number' },
        { key:'default_currency',   value:'PKR',                 type:'string', group:'general',     label:'Currency' },
        { key:'default_language',   value:'en',                  type:'string', group:'general',     label:'Language' },
        { key:'invoice_prefix',     value:'INV',                 type:'string', group:'invoices',    label:'Invoice Prefix' },
        { key:'invoice_next_no',    value:'1000',                type:'number', group:'invoices',    label:'Next Invoice No.' },
        { key:'po_prefix',          value:'PO',                  type:'string', group:'procurement', label:'PO Prefix' },
        { key:'po_next_no',         value:'1000',                type:'number', group:'procurement', label:'Next PO No.' },
        { key:'receipt_width',      value:'80',                  type:'number', group:'pos',         label:'Receipt Width (mm)' },
        { key:'fbr_posid',          value:'',                    type:'string', group:'fbr',         label:'FBR POS ID' },
        { key:'fbr_enabled',        value:'false',               type:'boolean',group:'fbr',         label:'Enable FBR Integration' },
        { key:'payroll_day',        value:'25',                  type:'number', group:'hr',          label:'Payroll Processing Day' },
        { key:'eobi_rate',          value:'1066',                type:'number', group:'hr',          label:'EOBI per Employee (PKR)' },
      ]);
  }

  // Seed system tax rates only if table is empty
  const taxRatesCount = await knex('tax_rates').count('id as count').first();
  if (taxRatesCount.count === 0) {
      await knex('tax_rates').insert([
        { name:'GST 17%',   rate:17.0000, type:'GST', is_default:true  },
        { name:'GST 0%',    rate:0.0000,  type:'GST', is_default:false },
        { name:'FED 5%',    rate:5.0000,  type:'FED', is_default:false },
        { name:'WHT 2%',    rate:2.0000,  type:'WHT', is_default:false },
        { name:'Exempt',    rate:0.0000,  type:'exempt',is_default:false},
      ]);
  }
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('tax_rates');
  await knex.schema.dropTableIfExists('settings');
  await knex.schema.dropTableIfExists('accounts');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('branches');
};
