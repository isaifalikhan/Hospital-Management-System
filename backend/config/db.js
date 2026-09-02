const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Hosted Postgres (e.g. Vercel Postgres) when a connection string is
// configured; a local SQLite file otherwise. Vercel's Node runtime only
// allows writes under /tmp, so SQLite (which needs to write its data file
// and journal next to itself) only works for local/LAN use, not on Vercel.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let sequelize;

if (connectionString) {
  // Sequelize's own require('pg') is dynamic (dialect-based), so Vercel's
  // function bundler can't statically trace it and silently omits pg from
  // the deployed function -- a static require here makes it traceable.
  require('pg');
  sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  });
} else {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(dataDir, 'hms.sqlite'),
    logging: false,
    // SQLite disables foreign-key enforcement per connection by default, so the
    // onDelete: 'CASCADE'/'SET NULL' rules declared on associations in
    // models/index.js would silently never fire without this. A single pooled
    // connection keeps the pragma applied to every query the app makes.
    pool: { max: 1 },
    hooks: {
      afterConnect: (connection) =>
        new Promise((resolve, reject) => {
          connection.run('PRAGMA foreign_keys = ON', (err) => (err ? reject(err) : resolve()));
        }),
    },
  });
}

module.exports = sequelize;
