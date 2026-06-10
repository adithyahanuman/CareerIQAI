/**
 * config/db.js – PostgreSQL connection pool.
 *
 * Uses the `pg` library's Pool for efficient connection reuse.
 * All configuration is read from environment variables (see config/env.js).
 *
 * Usage:
 *   const { query, getClient, pool } = require('./config/db');
 *   const result = await query('SELECT * FROM students WHERE id = $1', [id]);
 */

'use strict';

const { Pool } = require('pg');
const env = require('./env');

// ---------------------------------------------------------------------------
// Pool configuration
// ---------------------------------------------------------------------------

const pool = new Pool({
  host:     env.dbHost,
  port:     env.dbPort,
  database: env.dbName,
  user:     env.dbUser,
  password: env.dbPassword,

  // Connection pool sizing
  max:              10,   // maximum simultaneous connections
  idleTimeoutMillis: 30_000,  // close idle connections after 30 s
  connectionTimeoutMillis: 5_000, // throw if no connection within 5 s
});

// ---------------------------------------------------------------------------
// Error handling – prevent unhandled rejections from idle clients
// ---------------------------------------------------------------------------

pool.on('error', (err, client) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/**
 * Execute a parameterised query using a pooled connection.
 *
 * @param {string}  text   - SQL statement (use $1, $2, … placeholders)
 * @param {Array}   params - Parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Check out a dedicated client for transactions.
 * Caller MUST call client.release() when done.
 *
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = () => pool.connect();

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------

/**
 * Verify that the pool can reach the database.
 * Called once at application start-up (see server.js).
 *
 * @returns {Promise<void>}
 */
const testConnection = async () => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT NOW() AS now');
    console.log(`[DB] Connected to PostgreSQL – server time: ${rows[0].now}`);
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

/**
 * Drain the pool.  Called by SIGTERM / SIGINT handlers in server.js.
 */
const closePool = async () => {
  await pool.end();
  console.log('[DB] Connection pool closed.');
};

module.exports = { pool, query, getClient, testConnection, closePool };
