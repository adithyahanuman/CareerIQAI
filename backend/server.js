/**
 * server.js – Entry point for the CareerIQ AI Express backend.
 *
 * Loads environment variables, creates the Express app, and starts
 * the HTTP server. All application-level configuration lives in
 * src/app.js so this file stays lean.
 */

'use strict';

require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 5000;
const ENV  = process.env.NODE_ENV || 'development';

// ── Start server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, async () => {
  console.log(`\n🚀  CareerIQ AI API is running`);
  console.log(`   ➜  Environment : ${ENV}`);
  console.log(`   ➜  Listening on: http://localhost:${PORT}\n`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n${signal} received – shutting down gracefully…`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Catch unhandled rejections ────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Promise Rejection:', reason);
});
