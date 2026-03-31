
exports.up = async (knex) => {
  if (!await knex.schema.hasColumn('users', 'full_name')) {
    await knex.schema.table('users', (table) => {
      table.string('full_name');
    });
  }
  if (!await knex.schema.hasColumn('users', 'tenant_id')) {
    await knex.schema.table('users', (table) => {
      table.uuid('tenant_id').references('id').inTable('tenants');
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasColumn('users', 'full_name')) {
    await knex.schema.table('users', (table) => {
      table.dropColumn('full_name');
    });
  }
  if (await knex.schema.hasColumn('users', 'tenant_id')) {
    await knex.schema.table('users', (table) => {
      table.dropColumn('tenant_id');
    });
  }
};
