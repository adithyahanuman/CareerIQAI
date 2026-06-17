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
  dbConnectionString: process.env.DATABASE_URL || '',
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

  // Gather 10 API key slots for Gemini (GEMINI_API_KEY_1 to GEMINI_API_KEY_10)
  geminiApiKeys: [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
    process.env.GEMINI_API_KEY_9,
    process.env.GEMINI_API_KEY_10,
    process.env.GEMINI_API_KEYS, // Fallback to old comma-separated list if slots are empty
    process.env.GEMINI_API_KEY   // Ultimate fallback to single key
  ].filter(Boolean).flatMap(k => k.split(',').map(s => s.trim()).filter(Boolean)), // Still allow comma-separated fallback string just in case

  grokApiKeys: [
    process.env.GROK_API_KEYS,
    process.env.GROK_API_KEY
  ].filter(Boolean).flatMap(k => k.split(',').map(s => s.trim()).filter(Boolean)),

  aiProvider: process.env.AI_PROVIDER || 'gemini',

  // ── SMTP / Email ──────────────────────────────────────────────────────────
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  contactEmailTo: process.env.CONTACT_EMAIL_TO || process.env.SMTP_USER || '',
};

module.exports = env;
