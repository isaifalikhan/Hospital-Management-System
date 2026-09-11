/**
 * Read-only database inspector.
 *   node utils/db-inspect.js              -> list tables + row counts
 *   node utils/db-inspect.js patients     -> first 20 rows of that table
 *   node utils/db-inspect.js patients 50  -> first 50 rows
 * Works against whichever DB config/db.js resolves to (SQLite or Postgres).
 */
require('dotenv').config();
const sequelize = require('../config/db');
require('../models');

async function main() {
  const [table, limitArg] = process.argv.slice(2);
  await sequelize.authenticate();

  const qi = sequelize.getQueryInterface();
  const tables = (await qi.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName));

  if (!table) {
    console.log(`Dialect: ${sequelize.getDialect()}`);
    console.log(`Storage: ${sequelize.options.storage || sequelize.config.host}\n`);
    for (const t of tables.sort()) {
      const [[{ n }]] = await sequelize.query(`SELECT COUNT(*) AS n FROM "${t}"`);
      console.log(`${String(n).padStart(6)}  ${t}`);
    }
    console.log('\nPass a table name to dump rows, e.g. node utils/db-inspect.js patients');
  } else {
    if (!tables.includes(table)) {
      console.error(`No such table "${table}". Available: ${tables.join(', ')}`);
      process.exitCode = 1;
    } else {
      const limit = Number(limitArg) || 20;
      const [rows] = await sequelize.query(`SELECT * FROM "${table}" LIMIT ${limit}`);
      console.table(rows);
      console.log(`(showing up to ${limit} rows)`);
    }
  }
  await sequelize.close();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
