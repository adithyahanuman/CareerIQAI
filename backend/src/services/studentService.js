/**
 * services/studentService.js
 *
 * Student business logic – Firestore implementation.
 */

'use strict';

const { db } = require('../config/firebase');

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------

/**
 * Create a brand-new student record manually (admin use / seeding).
 * For normal sign-ups use authService.findOrCreateStudent().
 *
 * @param {object} data
 * @returns {Promise<object>} Created student document
 */
const createStudent = async (data) => {
  const {
    full_name, email, firebase_uid = null,
    avatar_url = null, phone = null,
    location = null, course = null, branch = null,
    year_of_study = null, gpa = null, linkedin_url = null,
    github_url = null, website_url = null,
  } = data;

  const docId = firebase_uid || require('crypto').randomUUID();
  const newStudent = {
    firebase_uid,
    full_name, email, avatar_url, phone,
    location, course, branch, year_of_study, gpa,
    linkedin_url, github_url, website_url,
    is_verified: true,
    created_at: new Date(),
    updated_at: new Date()
  };

  await db.collection('students').doc(docId).set(newStudent);
  return { id: docId, ...newStudent };
};

// ---------------------------------------------------------------------------
// READ ALL
// ---------------------------------------------------------------------------

/**
 * Paginated list of all students.
 * (Note: Firestore offset/pagination is simpler when using cursors.
 * Here we provide basic limit/offset for compatibility, but offset gets
 * expensive for large collections in Firestore.)
 */
const getAllStudents = async ({ page = 1, limit = 20, search = '' } = {}) => {
  const offset = (page - 1) * limit;

  let query = db.collection('students').orderBy('created_at', 'desc');
  
  // Note: Firestore does not support native full-text search.
  // We can only do prefix search or exact match easily. 
  // For compatibility, we'll do the query and filter in memory if 'search' is provided.
  // In production, consider using Algolia or Typesense.
  
  const snapshot = await query.get();
  let allStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (search) {
    const s = search.toLowerCase();
    allStudents = allStudents.filter(st => 
      (st.full_name && st.full_name.toLowerCase().includes(s)) ||
      (st.email && st.email.toLowerCase().includes(s))
    );
  }

  const total = allStudents.length;
  const paginated = allStudents.slice(offset, offset + limit);

  return {
    students: paginated,
    total,
    page,
    limit,
  };
};

// ---------------------------------------------------------------------------
// READ ONE
// ---------------------------------------------------------------------------

/**
 * Get a single student by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
const getStudentById = async (id) => {
  const doc = await db.collection('students').doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------

/**
 * Partially update a student record (only provided fields are changed).
 *
 * @param {string} id   – student ID
 * @param {object} data – fields to update
 * @returns {Promise<object|null>} Updated student document
 */
const updateStudent = async (id, data) => {
  const ALLOWED = [
    'full_name', 'avatar_url', 'phone', 'location',
    'course', 'branch', 'year_of_study', 'gpa',
    'linkedin_url', 'github_url', 'website_url',
  ];

  const updateData = {};
  for (const key of Object.keys(data)) {
    if (ALLOWED.includes(key)) {
      updateData[key] = data[key];
    }
  }

  if (Object.keys(updateData).length === 0) {
    const err = new Error('No valid fields provided for update.');
    err.statusCode = 422;
    throw err;
  }
  
  updateData.updated_at = new Date();

  const docRef = db.collection('students').doc(id);
  const docSnap = await docRef.get();
  
  if (!docSnap.exists) return null;
  
  await docRef.update(updateData);
  return { id, ...docSnap.data(), ...updateData };
};

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
