/**
 * services/studentService.js
 *
 * Student business logic – all PostgreSQL queries live here.
 * Controllers stay thin; they call these functions only.
 */

'use strict';

const { query } = require('../config/db');

// ---------------------------------------------------------------------------
// Safe columns to return (never expose password_hash)
// ---------------------------------------------------------------------------
const PUBLIC_COLS = `
  id, firebase_uid, full_name, email,
  avatar_url, phone, location,
  course, branch, year_of_study, gpa,
  linkedin_url, github_url, website_url,
  role, is_verified, is_active, last_login_at,
  created_at, updated_at
`;

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------

/**
 * Create a brand-new student record manually (admin use / seeding).
 * For normal sign-ups use authService.findOrCreateStudent().
 *
 * @param {{ full_name, email, firebase_uid?, avatar_url?, phone?,
 *           location?, course?, branch?, year_of_study?, gpa?,
 *           linkedin_url?, github_url?, website_url? }} data
 * @returns {Promise<object>} Created student row
 */
const createStudent = async (data) => {
  const {
    full_name, email, firebase_uid = null,
    avatar_url = null, phone = null,
    location = null, course = null, branch = null,
    year_of_study = null, gpa = null, linkedin_url = null,
    github_url = null, website_url = null,
  } = data;

  const { rows } = await query(
    `INSERT INTO students
       (full_name, email, firebase_uid, avatar_url, phone,
        location, course, branch, year_of_study, gpa,
        linkedin_url, github_url, website_url, is_verified)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, TRUE)
     RETURNING ${PUBLIC_COLS}`,
    [full_name, email, firebase_uid, avatar_url, phone,
     location, course, branch, year_of_study, gpa,
     linkedin_url, github_url, website_url],
  );
  return rows[0];
};

// ---------------------------------------------------------------------------
// READ ALL
// ---------------------------------------------------------------------------

/**
 * Paginated list of all students.
 *
 * @param {{ page?: number, limit?: number, search?: string }} opts
 * @returns {Promise<{ students: object[], total: number, page: number, limit: number }>}
 */
const getAllStudents = async ({ page = 1, limit = 20, search = '' } = {}) => {
  const offset = (page - 1) * limit;

  // Optional full-text search on name + email
  const whereClause = search
    ? `WHERE full_name ILIKE $3 OR email ILIKE $3`
    : '';
  const params = search
    ? [limit, offset, `%${search}%`]
    : [limit, offset];

  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT ${PUBLIC_COLS}
       FROM   students
       ${whereClause}
       ORDER  BY created_at DESC
       LIMIT  $1 OFFSET $2`,
      params,
    ),
    query(
      `SELECT COUNT(*) AS total FROM students ${whereClause}`,
      search ? [`%${search}%`] : [],
    ),
  ]);

  return {
    students: dataResult.rows,
    total:    parseInt(countResult.rows[0].total, 10),
    page,
    limit,
  };
};

// ---------------------------------------------------------------------------
// READ ONE
// ---------------------------------------------------------------------------

/**
 * Get a single student by UUID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
const getStudentById = async (id) => {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLS} FROM students WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
};

/**
 * Get a single student by email.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
const getStudentByEmail = async (email) => {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLS} FROM students WHERE email = $1 LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
};

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------

/**
 * Partially update a student record (only provided fields are changed).
 *
 * @param {string} id   – student UUID
 * @param {object} data – fields to update
 * @returns {Promise<object|null>} Updated student row, or null if not found
 */
const updateStudent = async (id, data) => {
  // Whitelist of updatable columns
  const ALLOWED = [
    'full_name', 'avatar_url', 'phone', 'location',
    'course', 'branch', 'year_of_study', 'gpa',
    'linkedin_url', 'github_url', 'website_url',
  ];

  const fields = Object.keys(data).filter(k => ALLOWED.includes(k));

  if (fields.length === 0) {
    const err = new Error('No valid fields provided for update.');
    err.statusCode = 422;
    throw err;
  }

  // Build SET clause: "full_name = $1, phone = $2, …"
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values    = fields.map(f => data[f]);
  values.push(id); // for WHERE id = $N

  const { rows } = await query(
    `UPDATE students
     SET    ${setClause}
     WHERE  id = $${values.length}
     RETURNING ${PUBLIC_COLS}`,
    values,
  );
  return rows[0] ?? null;
};

/**
 * Update the profile of the currently logged-in student.
 * Wrapper around updateStudent that uses req.user.id
 * @param {string} id - student UUID
 * @param {object} data - fields to update
 * @returns {Promise<object|null>} Updated student row
 */
const updateStudentMe = async (id, data) => {
  return updateStudent(id, data);
};

module.exports = {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  updateStudentMe,
};
