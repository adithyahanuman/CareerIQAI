'use strict';

/**
 * services/careerService.js
 *
 * Career data is now derived from the single fullResumeAnalysis() result
 * already stored in resumes.analysis (JSONB).
 *
 * Flow:
 *   1. User uploads resume → ONE AI call via resumeService
 *   2. Full JSON (scores + career_advice + job_roles + interview_questions)
 *      is stored in resumes.analysis
 *   3. These endpoints read directly from the DB — zero extra AI calls.
 *
 * The roadmap endpoint still calls AI because it needs a specific target role
 * that the resume analysis doesn't contain.
 */

const { query }  = require('../config/db');
const aiService  = require('../ai/aiService');
const prompts    = require('../ai/prompts');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the primary (active) resume analysis for a student from the DB.
 * @param {string} studentId
 * @returns {Promise<object|null>} The full analysis JSONB object
 */
const getStoredAnalysis = async (studentId) => {
  const { rows } = await query(
    `SELECT analysis FROM resumes
     WHERE  student_id = $1
       AND  is_primary = TRUE
       AND  status     = 'done'
       AND  analysis   IS NOT NULL
     LIMIT  1`,
    [studentId],
  );
  return rows[0]?.analysis ?? null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Career Advice — read from stored analysis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return career advice from the stored resume analysis.
 * @param {string} studentId
 */
const getCareerAdvice = async (studentId) => {
  const analysis = await getStoredAnalysis(studentId);
  if (!analysis) {
    const err = new Error('No analysed resume found. Please upload your resume first.');
    err.statusCode = 404;
    throw err;
  }
  return analysis.career_advice || { summary: '', recommendations: [] };
};

// ─────────────────────────────────────────────────────────────────────────────
// Job Role Recommendations — read from stored analysis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return job role recommendations from the stored resume analysis.
 * @param {string} studentId
 */
const getJobRoles = async (studentId) => {
  const analysis = await getStoredAnalysis(studentId);
  if (!analysis) {
    const err = new Error('No analysed resume found. Please upload your resume first.');
    err.statusCode = 404;
    throw err;
  }
  return analysis.job_roles || [];
};

// ─────────────────────────────────────────────────────────────────────────────
// Interview Questions — read from stored analysis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return interview questions from the stored resume analysis.
 * @param {string} studentId
 */
const getInterviewQuestions = async (studentId) => {
  const analysis = await getStoredAnalysis(studentId);
  if (!analysis) {
    const err = new Error('No analysed resume found. Please upload your resume first.');
    err.statusCode = 404;
    throw err;
  }
  return analysis.interview_questions || [];
};

// ─────────────────────────────────────────────────────────────────────────────
// Career Roadmap — still calls AI (needs a target role the resume doesn't have)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a step-by-step career transition roadmap via AI.
 * @param {{ currentRole: string, targetRole: string, skills?: string[] }} opts
 */
const buildRoadmap = async ({ currentRole, targetRole, skills = [] }) => {
  const response = await aiService.generateCareerAdvice(
    prompts.careerRoadmap(currentRole, targetRole, skills)
  );
  const parsed = response.data;
  return {
    currentRole:       String(parsed.currentRole       || currentRole),
    targetRole:        String(parsed.targetRole        || targetRole),
    estimatedTimeline: String(parsed.estimatedTimeline || ''),
    requiredSkills:    Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : skills,
    steps:             Array.isArray(parsed.steps)          ? parsed.steps          : [],
  };
};

module.exports = {
  getCareerAdvice,
  getJobRoles,
  getInterviewQuestions,
  buildRoadmap,
};
