
exports.up = async (knex) => {
  if (!await knex.schema.hasColumn('users', 'tenant_id')) {
    await knex.schema.table('users', (table) => {
      table.integer('tenant_id').unsigned().references('id').inTable('tenants');
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasColumn('users', 'tenant_id')) {
    await knex.schema.table('users', (table) => {
      table.dropColumn('tenant_id');
    });
  }
};
