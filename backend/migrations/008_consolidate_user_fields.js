
exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    table.string('full_name');
    table.string('cnic');
    table.string('phone');
    table.text('address');
    table.integer('tenant_id').references('id').inTable('tenants');
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('full_name');
    table.dropColumn('cnic');
    table.dropColumn('phone');
    table.dropColumn('address');
    table.dropColumn('tenant_id');
  });
};
