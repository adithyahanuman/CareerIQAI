/**
 * src/app.js – Express application factory.
 *
 * Applies all global middleware and mounts route groups.
 * Does NOT call app.listen() – that responsibility belongs to server.js.
 */

'use strict';

const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const corsOptions     = require('./config/corsConfig');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// ── Route imports ──────────────────────────────────────────────────────────────
const healthRoutes   = require('./routes/healthRoutes');
const authRoutes     = require('./routes/authRoutes');
const studentRoutes  = require('./routes/studentRoutes');
const resumeRoutes   = require('./routes/resumeRoutes');
const careerRoutes      = require('./routes/careerRoutes');
const benchmarkRoutes   = require('./routes/benchmarkRoutes');
const resumeUploadRoutes = require('./routes/resumeUpload');
const contactRoutes      = require('./routes/contactRoutes');

const app = express();

// ── Global middleware ──────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/health',    healthRoutes);
app.use('/api/auth',      authRoutes);
app.use('/api/students',  studentRoutes);
app.use('/api/resumes',   resumeRoutes);
app.use('/api/career',      careerRoutes);
app.use('/api/benchmark',   benchmarkRoutes);
app.use('/api/contact',     contactRoutes);
app.use('/resume',        resumeUploadRoutes);

// ── 404 & Error handlers ───────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
