/**
 * CareerIQ AI — Gemini Client (Frontend Wrapper)
 *
 * This file calls the CareerIQ backend API which securely proxies
 * requests to Gemini. The API key NEVER leaves the backend server.
 *
 * Usage:
 *   const result = await GeminiClient.analyzeResume(resumeText, token, fileName);
 *   // result → full resume row with overall_analysis, skills_analysis, etc.
 */

(function () {
  'use strict';

  const BACKEND_URL = 'https://careeriqai.onrender.com';

  /**
   * Upload + analyze a resume via the backend.
   * Calls POST /api/resumes/upload which runs the master AI prompt and
   * stores all 13 analysis sections in dedicated JSONB columns.
   *
   * @param {string} resumeText   - Plain text extracted from the resume PDF
   * @param {string} token        - Firebase ID token for auth
   * @param {string} [fileName]   - Original filename (for display)
   * @param {string} [targetRoleType] - "internship" or "fulltime"
   * @returns {Promise<object>}   - Full resume row from PostgreSQL
   */
  async function analyzeResume(resumeText, token, fileName = 'resume.pdf', targetRoleType = 'internship') {
    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error('Resume text is too short to analyze.');
    }

    const res = await fetch(`${BACKEND_URL}/api/resumes/upload`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        resume_text: resumeText,
        file_name:   fileName,
        target_role_type: targetRoleType
      }),
    });

    if (!res.ok) {
      let msg = `Server error ${res.status}`;
      try {
        const errData = await res.json();
        msg = errData.message || msg;
      } catch (_) {}
      throw new Error(msg);
    }

    const json = await res.json();

    // Backend returns { success: true, data: <resume row> }
    // The resume row has overall_analysis, skills_analysis, etc. as top-level keys
    if (!json.success || !json.data) {
      throw new Error('Unexpected response from server.');
    }

    // If status is 'error', the AI failed — surface the error message
    if (json.data.status === 'error') {
      throw new Error(json.data.error_message || 'Resume analysis failed on the server.');
    }

    // Return the full resume row — dashboard reads .overall_analysis, .skills_analysis, etc.
    return json.data;
  }

  // Expose globally
  window.GeminiClient = { analyzeResume };

})();
