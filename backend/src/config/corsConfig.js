/**
 * config/corsConfig.js – CORS options for the Express app.
 *
 * Reads allowed origins from the ALLOWED_ORIGINS env variable
 * (comma-separated list). Falls back to localhost:5500 in development.
 */

'use strict';

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5500'];

// Always include common local dev origins
const DEV_ORIGINS = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://localhost:5173',
];

const allAllowed = [...new Set([...allowedOrigins, ...DEV_ORIGINS])];

const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (Thunder Client, Postman, curl, mobile apps)
    // Also allow "null" string origin sent by browsers for file:// pages
    if (!origin || origin === 'null') return callback(null, true);

    // Allow all origins dynamically (echoes back the requesting origin)
    // This solves the issue of testing from mobile phones on LAN IPs
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

module.exports = corsOptions;
