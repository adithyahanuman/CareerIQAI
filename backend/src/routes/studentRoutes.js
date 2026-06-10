/**
 * routes/studentRoutes.js
 *
 * Student endpoints under /api/students.
 *
 *   POST /api/students            – create a student (admin / seeding)
 *   GET  /api/students            – list all students (paginated)
 *   GET  /api/students/:id        – get one student by UUID
 *   PUT  /api/students/:id        – update student profile
 */

'use strict';

const express = require('express');
const {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  updateStudentMe,
} = require('../controllers/studentController');

const { protect }  = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');

const router = express.Router();

// All student routes require authentication
router.use(protect);

// POST /api/students – create a new student record
router.post(
  '/',
  validate({ full_name: 'required', email: 'required' }),
  createStudent,
);

// GET /api/students – list all students (?page=1&limit=20&search=)
router.get('/', getAllStudents);

// PUT /api/students/me – MUST be registered BEFORE /:id to prevent Express
// matching the literal string "me" as a UUID parameter.
router.put('/me', updateStudentMe);

// GET /api/students/:id – get a single student
router.get('/:id', getStudentById);

// PUT /api/students/:id – update a student profile
router.put('/:id', updateStudent);

module.exports = router;
