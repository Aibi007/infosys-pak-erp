
exports.up = async function(knex) {
  await knex.schema.table('users', async function(table) {
    if (!await knex.schema.hasColumn('users', 'full_name')) {
      table.string('full_name');
    }
    if (!await knex.schema.hasColumn('users', 'cnic')) {
      table.string('cnic');
    }
    if (!await knex.schema.hasColumn('users', 'phone')) {
      table.string('phone');
    }
    if (!await knex.schema.hasColumn('users', 'address')) {
      table.text('address');
    }
    if (!await knex.schema.hasColumn('users', 'tenant_id')) {
      table.integer('tenant_id').references('id').inTable('tenants');
    }
  });
};

exports.down = async function(knex) {
  // This is not a reversible migration
};
