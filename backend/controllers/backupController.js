const fs = require('fs');
const os = require('os');
const path = require('path');
const sequelize = require('../config/db');
const { sequelize: _sequelize, ...models } = require('../models');
const { logAudit } = require('../utils/audit');

// Same check backend/config/db.js uses to pick a dialect: a connection string
// means hosted Postgres, its absence means the local/LAN SQLite file.
const isPostgres = () => Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Streams a full data export so an admin can pull a portable, human-readable
// backup even when running against hosted Postgres (where there's no single
// file to copy). One JSON object keyed by model name, each value the raw
// rows for that table.
async function exportPostgresJson(req, res) {
  const data = {};
  for (const [name, Model] of Object.entries(models)) {
    if (typeof Model?.findAll !== 'function') continue; // skip any non-model export
    data[name] = await Model.findAll({ raw: true });
  }

  const filename = `hms-backup-${timestamp()}.json`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(data, null, 2));

  await logAudit(req, {
    action: 'create', entityType: 'Backup',
    summary: `Downloaded a full JSON data export (${filename})`,
  });
}

// Copies the live SQLite file to a timestamped snapshot before streaming it,
// so the download reflects a single consistent point in time rather than a
// file that could still be mid-write while it's being read over the wire.
// The snapshot lives outside backend/data (which nodemon watches in dev) and
// is removed once the download finishes.
async function exportSqliteFile(req, res, next) {
  const storagePath = sequelize.options.storage;
  if (!storagePath || !fs.existsSync(storagePath)) {
    return res.status(500).json({ message: 'Database file not found' });
  }

  const filename = `hms-backup-${timestamp()}.sqlite`;
  const snapshotPath = path.join(os.tmpdir(), filename);

  try {
    fs.copyFileSync(storagePath, snapshotPath);
  } catch (err) {
    return next(err);
  }

  res.download(snapshotPath, filename, async (err) => {
    fs.unlink(snapshotPath, () => {});
    if (err) {
      if (!res.headersSent) next(err);
      return;
    }
    await logAudit(req, {
      action: 'create', entityType: 'Backup',
      summary: `Downloaded a full SQLite database backup (${filename})`,
    });
  });
}

exports.download = async (req, res, next) => {
  try {
    if (isPostgres()) {
      await exportPostgresJson(req, res);
    } else {
      await exportSqliteFile(req, res, next);
    }
  } catch (err) {
    next(err);
  }
};
