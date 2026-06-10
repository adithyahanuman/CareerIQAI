/**
 * controllers/studentController.js
 *
 * Thin handlers for /api/students routes.
 * All DB logic lives in services/studentService.js.
 */

'use strict';

const studentService = require('../services/studentService');

// ---------------------------------------------------------------------------
// POST /api/students
// ---------------------------------------------------------------------------

/**
 * Create a new student record.
 *
 * Body: { full_name, email, firebase_uid?, avatar_url?, bio?,
 *         phone?, location?, linkedin_url?, github_url?, website_url? }
 *
 * @type {import('express').RequestHandler}
 */
const createStudent = async (req, res, next) => {
  try {
    const student = await studentService.createStudent(req.body);
    res.status(201).json({ success: true, data: student });
  } catch (err) {
    // Unique constraint on email
    if (err.code === '23505') {
      res.status(409);
      return next(new Error('A student with that email already exists.'));
    }
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/students
// ---------------------------------------------------------------------------

/**
 * List all students with optional pagination and search.
 *
 * Query params: ?page=1&limit=20&search=john
 *
 * @type {import('express').RequestHandler}
 */
const getAllStudents = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page  || '1',  10);
    const limit  = parseInt(req.query.limit || '20', 10);
    const search = req.query.search || '';

    const result = await studentService.getAllStudents({ page, limit, search });

    res.status(200).json({
      success: true,
      data:    result.students,
      meta: {
        total: result.total,
        page:  result.page,
        limit: result.limit,
        pages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/students/:id
// ---------------------------------------------------------------------------

/**
 * Get a single student by UUID.
 *
 * @type {import('express').RequestHandler}
 */
const getStudentById = async (req, res, next) => {
  try {
    const student = await studentService.getStudentById(req.params.id);

    if (!student) {
      res.status(404);
      return next(new Error(`Student with id "${req.params.id}" not found.`));
    }

    res.status(200).json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/students/:id
// ---------------------------------------------------------------------------

/**
 * Partially update a student profile.
 * Only the authenticated student can update their own record
 * (enforced by comparing req.user.id with req.params.id).
 *
 * Body: any subset of { full_name, avatar_url, bio, phone,
 *                       location, linkedin_url, github_url, website_url }
 *
 * @type {import('express').RequestHandler}
 */
const updateStudent = async (req, res, next) => {
  try {
    // Students can only update their own profile (admins bypass this)
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      res.status(403);
      return next(new Error('You can only update your own profile.'));
    }

    const updated = await studentService.updateStudent(req.params.id, req.body);

    if (!updated) {
      res.status(404);
      return next(new Error(`Student with id "${req.params.id}" not found.`));
    }

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * Update the profile of the currently logged-in student.
 * 
 * Body: any subset of updatable student columns
 * @type {import('express').RequestHandler}
 */
const updateStudentMe = async (req, res, next) => {
  try {
    const updated = await studentService.updateStudent(req.user.id, req.body);

    if (!updated) {
      res.status(404);
      return next(new Error('Student profile not found.'));
    }

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = { createStudent, getAllStudents, getStudentById, updateStudent, updateStudentMe };
