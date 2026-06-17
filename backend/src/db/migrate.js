/**
 * db/migrate.js – Simple Node.js migration runner.
 *
 * Reads every *.sql file inside src/db/schema/ in alphabetical order and
 * executes them inside a single transaction.  A "migrations" tracking table
 * ensures each file is only applied once.
 *
 * Usage:
 *   node src/db/migrate.js            ← run pending migrations
 *   node src/db/migrate.js --reset    ← DROP all tables then re-run (⚠ dev only)
 */

'use strict';

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

require('dotenv').config();          // load .env before anything else

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');
const env  = require('../config/env');

// ---------------------------------------------------------------------------
// Dedicated pool for the migration script (not reusing the app pool)
// ---------------------------------------------------------------------------

const connectionString = env.dbConnectionString;
const isCockroach = connectionString
  ? connectionString.includes('cockroachlabs.cloud')
  : env.dbHost.includes('cockroachlabs.cloud');

const poolConfig = connectionString ? {
  connectionString,
  ssl: isCockroach ? { rejectUnauthorized: true } : false,
  lookup: (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback),
} : {
  host:     env.dbHost,
  port:     env.dbPort,
  database: env.dbName,
  user:     env.dbUser,
  password: env.dbPassword,
  ssl: isCockroach ? { rejectUnauthorized: true } : false,
  lookup: (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback),
};

const pool = new Pool(poolConfig);

const SCHEMA_DIR = path.join(__dirname, 'schema');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ensure the tracking table exists before we read it. */
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id          SERIAL      PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
}

/** Return the set of filenames that have already been applied. */
async function getAppliedMigrations(client) {
  const { rows } = await client.query('SELECT filename FROM migrations');
  return new Set(rows.map(r => r.filename));
}

/** Mark a migration as applied. */
async function recordMigration(client, filename) {
  await client.query(
    'INSERT INTO migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
    [filename],
  );
}

// ---------------------------------------------------------------------------
// Reset (dev only)
// ---------------------------------------------------------------------------

async function resetDatabase(client) {
  console.warn('[migrate] ⚠  --reset flag detected – dropping all tables and functions …');
  
  // Get all table names in public schema
  const { rows } = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
  `);
  
  for (const row of rows) {
    await client.query(`DROP TABLE IF EXISTS ${row.table_name} CASCADE`);
  }

  // Drop the trigger function after tables are gone
  await client.query('DROP FUNCTION IF EXISTS set_updated_at');
  
  console.log('[migrate] All tables and functions dropped.');
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

async function migrate() {
  const isReset = process.argv.includes('--reset');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (isReset) {
      await resetDatabase(client);
    }

    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    // Read SQL files sorted alphabetically (001_, 002_, …)
    const files = fs
      .readdirSync(SCHEMA_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] ✓ Already applied: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf8');
      console.log(`[migrate] → Applying: ${file}`);
      await client.query(sql);
      await recordMigration(client, file);
      count++;
    }

    await client.query('COMMIT');
    console.log(`\n[migrate] Done – ${count} migration(s) applied.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[migrate] ✗ Migration failed – rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
