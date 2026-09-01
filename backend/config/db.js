const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sequelize = new Sequelize({
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

module.exports = sequelize;
