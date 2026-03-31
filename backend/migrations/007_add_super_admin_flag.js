
exports.up = async (knex) => {
  // 1. Add is_super_admin flag to public users table
  if (!await knex.schema.hasColumn('users', 'is_super_admin')) {
    await knex.schema.table('users', (table) => {
      table.boolean('is_super_admin').defaultTo(false);
    });
  }

  // 2. Add is_super_admin to the tenant_users table for consistency
  if (!await knex.schema.hasColumn('tenant_users', 'is_super_admin')) {
    await knex.schema.table('tenant_users', (table) => {
      table.boolean('is_super_admin').defaultTo(false);
    });
  }

  // 3. Set the flag for the existing super admin
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@erp.pk';
  await knex('users').where({ email: adminEmail }).update({ is_super_admin: true });
};

exports.down = async (knex) => {
  if (await knex.schema.hasColumn('users', 'is_super_admin')) {
    await knex.schema.table('users', (table) => {
      table.dropColumn('is_super_admin');
    });
  }
  if (await knex.schema.hasColumn('tenant_users', 'is_super_admin')) {
    await knex.schema.table('tenant_users', (table) => {
      table.dropColumn('is_super_admin');
    });
  }
};
