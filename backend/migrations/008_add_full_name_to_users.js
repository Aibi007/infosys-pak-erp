
exports.up = async (knex) => {
  if (!await knex.schema.hasColumn('users', 'full_name')) {
    await knex.schema.table('users', (table) => {
      table.string('full_name');
    });
  }
};

exports.down = async (knex) => {
  if (await knex.schema.hasColumn('users', 'full_name')) {
    await knex.schema.table('users', (table) => {
      table.dropColumn('full_name');
    });
  }
};
