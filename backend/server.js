/**
 * server.js – Entry point for the CareerIQ AI Express backend.
 *
 * Loads environment variables, creates the Express app, and starts
 * the HTTP server. All application-level configuration lives in
 * src/app.js so this file stays lean.
 */

'use strict';

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first'); // Fix IPv6 ENETUNREACH on Render
}

require('dotenv').config();

const app              = require('./src/app');
const { testConnection, closePool } = require('./src/config/db');

const PORT = process.env.PORT || 5000;
const ENV  = process.env.NODE_ENV || 'development';

// ── Start server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, async () => {
  console.log(`\n🚀  CareerIQ AI API is running`);
  console.log(`   ➜  Environment : ${ENV}`);
  console.log(`   ➜  Listening on: http://localhost:${PORT}\n`);

  // Test DB connection on startup
  try {
    await testConnection();
  } catch (err) {
    console.error('[DB] ✖  Could not connect to PostgreSQL:', err.message);
    console.error('[DB]    Check your DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env');
  }
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n${signal} received – shutting down gracefully…`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await closePool();
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Catch unhandled rejections ────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Promise Rejection:', reason);
});
