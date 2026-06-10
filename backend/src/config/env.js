/**
 * config/env.js – Centralised environment variable access.
 *
 * Import this module anywhere to read validated config values,
 * rather than scattering process.env calls throughout the codebase.
 */

'use strict';

const env = {
  port:        parseInt(process.env.PORT || '5000', 10),
  nodeEnv:     process.env.NODE_ENV     || 'development',
  isDev:       (process.env.NODE_ENV    || 'development') === 'development',
  isProd:      process.env.NODE_ENV     === 'production',
  isTest:      process.env.NODE_ENV     === 'test',

  // ── PostgreSQL ─────────────────────────────────────────────────────────
  dbHost:     process.env.DB_HOST     || 'localhost',
  dbPort:     parseInt(process.env.DB_PORT || '5432', 10),
  dbName:     process.env.DB_NAME     || 'careeriqai',
  dbUser:     process.env.DB_USER     || 'postgres',
  dbPassword: process.env.DB_PASSWORD || '',

  // ── Firebase ────────────────────────────────────────────────────────────
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',

  // ── API keys ───────────────────────────────────────────────────────────────
  geminiApiKey:  process.env.GEMINI_API_KEY || '',
  grokApiKey:    process.env.GROK_API_KEY   || '',

  // Comma-separated lists for per-provider key rotation
  geminiApiKeys: process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '',
  grokApiKeys:   process.env.GROK_API_KEYS   || process.env.GROK_API_KEY   || '',

  aiProvider: process.env.AI_PROVIDER || 'gemini',
};

module.exports = env;
