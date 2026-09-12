const { DataTypes } = require('sequelize');
const { sequelize } = require('../models');

// Everything needed to bring a database up to what the models expect.
//
// This used to live inside server.js's start(), which never runs on Vercel
// (`if (!process.env.VERCEL) start()`), so the deployed app could create a
// table but never alter one. Every column added after a deployment's database
// was first created broke it with `column "<name>" does not exist`, and the
// only documented remedy — GET /api/setup/seed?force=true — drops every table
// and takes the data with it. Pulled out here so both entry points can run it:
// start() on boot, and ensureSchema() once per serverless instance.

// sync() creates missing tables but never alters existing ones, so a database
// created before one of these columns landed still has the old table. Add
// whichever are absent. Done through the query interface rather than
// "ALTER TABLE ... ADD COLUMN IF NOT EXISTS", which Postgres supports and
// SQLite doesn't.
const ADDED_COLUMNS = [
  ['patients', 'cnic', { type: DataTypes.STRING, allowNull: true }],
  ['lab_orders', 'price', { type: DataTypes.FLOAT, defaultValue: 0 }],
  ['lab_orders', 'labTestId', { type: DataTypes.INTEGER, allowNull: true }],
  ['lab_orders', 'invoiceId', { type: DataTypes.INTEGER, allowNull: true }],
  ['lab_tests', 'parameters', { type: DataTypes.JSON, allowNull: true }],
];

async function syncSchema() {
  await sequelize.authenticate();
  await sequelize.sync(); // creates tables if they don't exist

  // Supabase serves the "public" schema over PostgREST to anyone holding the
  // project's publishable anon key, which bypasses this API's JWT auth and role
  // checks entirely -- and sync() creates tables with row level security off,
  // so every model added from here on would publish its table on creation.
  // (lab_result_items did exactly that, and the security advisor caught it.)
  // No policies are created alongside it, deliberately: the app connects as the
  // table owner, which bypasses RLS, so "enabled with no policies" is the
  // intended end state and leaves PostgREST with no rows to hand out. Supabase's
  // rls_enabled_no_policy advisory is expected here -- adding a permissive
  // policy to silence it would reopen the hole.
  // Non-fatal, and skipped on SQLite, which has no RLS.
  if (sequelize.getDialect() === 'postgres') {
    try {
      await sequelize.query(`
        DO $ DECLARE t record;
        BEGIN
          FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
          LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
          END LOOP;
        END $;
      `);
    } catch (err) {
      console.warn('Could not enable row level security on the public schema:', err.message);
    }
  }

  const queryInterface = sequelize.getQueryInterface();
  for (const [table, column, spec] of ADDED_COLUMNS) {
    const columns = await queryInterface.describeTable(table);
    if (!columns[column]) {
      await queryInterface.addColumn(table, column, spec);
      console.log(`Added missing "${column}" column to ${table}`);
    }
  }

  // Postgres stores an ENUM as its own named type, so a database created
  // before the 'lab' role existed rejects that value until the type is
  // widened — sync() won't do it. SQLite needs nothing: it emits the column as
  // plain TEXT with no CHECK constraint. Warn rather than throw, so a naming
  // surprise can't stop the app — the only casualty is creating lab accounts.
  if (sequelize.getDialect() === 'postgres') {
    try {
      await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'lab'`);
    } catch (err) {
      console.warn('Could not add the "lab" value to enum_users_role:', err.message);
    }
  }

  // Enforces "one active appointment per doctor/date/time" at the DB level so
  // two concurrent booking requests can't both pass the app-level clash check
  // and double-book the same slot. Cancelled appointments are excluded so a
  // freed-up slot can be rebooked, and walk-ins are excluded entirely since
  // they're queued (by tokenNumber), not slot-booked.
  // Dropped and recreated (not just IF NOT EXISTS) so a database that already
  // has the pre-visitType version picks up the new WHERE clause.
  // Identifiers must be quoted: Sequelize creates "doctorId"/"visitType"
  // case-preserved, but an unquoted identifier gets folded to lowercase by
  // Postgres and wouldn't match.
  await sequelize.query('DROP INDEX IF EXISTS appointments_doctor_date_time_active');
  await sequelize.query(
    `CREATE UNIQUE INDEX appointments_doctor_date_time_active
     ON "appointments" ("doctorId", "date", "time")
     WHERE "status" <> 'cancelled' AND "visitType" = 'scheduled'`
  );

  // One queue token per patient per day, hospital-wide. The app allocates
  // "highest + 1" (appointmentController.create), which two simultaneous
  // check-ins can both read before either writes — this is what stops them
  // both getting the same number, with the controller retrying on collision.
  // Cancelled walk-ins are included: their token stays spent, because the
  // patient is holding a printed chalan showing it.
  //
  // Non-fatal: any database that issued walk-in tokens before this release
  // numbered them per doctor, so it can legitimately hold two #1s for the same
  // day and the index won't build. New tokens are still unique — the app
  // allocates them hospital-wide — just not DB-enforced until the historical
  // duplicates are renumbered or aged out.
  try {
    await sequelize.query('DROP INDEX IF EXISTS appointments_walkin_date_token');
    await sequelize.query(
      `CREATE UNIQUE INDEX appointments_walkin_date_token
       ON "appointments" ("date", "tokenNumber")
       WHERE "visitType" = 'walk-in'`
    );
  } catch (err) {
    console.warn(
      'Could not create the unique walk-in token index — the appointments table still holds '
      + 'duplicate (date, tokenNumber) pairs from per-doctor numbering. New tokens remain unique. '
      + `Details: ${err.message}`
    );
  }
}

// A cold start that has to run the whole of syncSchema() costs ~15s against a
// remote Postgres -- sync() alone issues a round trip per model -- which is
// long enough to hit a serverless function timeout and show the user an error
// on the very request that was meant to fix things. Almost every cold start
// finds the schema already correct, so check that first in a single query and
// skip the work when there is none to do.
//
// Postgres only: on SQLite this is a local file and start() runs it once at
// boot, where the cost doesn't matter.
async function schemaLooksCurrent() {
  if (sequelize.getDialect() !== 'postgres') return false;
  try {
    const [rows] = await sequelize.query(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
    );
    const present = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));
    const tables = new Set(rows.map((r) => r.table_name));

    // Every model has a table...
    for (const model of Object.values(sequelize.models)) {
      if (!tables.has(model.getTableName())) return false;
    }
    // ...and every column added after the fact is on it.
    for (const [table, column] of ADDED_COLUMNS) {
      if (!present.has(`${table}.${column}`)) return false;
    }
    return true;
  } catch {
    // Can't tell — fall through and do the full pass rather than assume.
    return false;
  }
}

// Serverless entry point. Memoised so the work happens once per warm instance
// rather than per request; a failure clears the cache so the next request
// retries instead of inheriting a permanently rejected promise.
let pending = null;
function ensureSchema() {
  if (!pending) {
    pending = (async () => {
      if (await schemaLooksCurrent()) return;
      await syncSchema();
    })().catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

module.exports = { syncSchema, ensureSchema };
