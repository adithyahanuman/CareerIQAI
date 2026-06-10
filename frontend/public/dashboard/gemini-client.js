/**
 * CareerIQ AI — Gemini Client (Frontend Wrapper)
 *
 * This file calls the CareerIQ backend API which securely proxies
 * requests to Gemini. The API key NEVER leaves the backend server.
 *
 * Usage:
 *   const result = await GeminiClient.analyzeResume(resumeText);
 *   // result → { skills_score, education_score, experience_score,
 *   //            overall_resume_score, feedback }
 */

(function () {
  'use strict';

  const BACKEND_URL = 'http://localhost:5000';

  /**
   * Analyze a resume via the backend Gemini proxy.
   * @param {string} resumeText - Plain text extracted from the resume PDF
   * @returns {Promise<{
   *   skills_score: number,
   *   education_score: number,
   *   experience_score: number,
   *   overall_resume_score: number,
   *   feedback: string
   * }>}
   */
  async function analyzeResume(resumeText, token, fileName = 'resume.pdf') {
    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error('Resume text is too short to analyze.');
    }

    const res = await fetch(`${BACKEND_URL}/api/resumes/upload`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body:    JSON.stringify({
        resume_text: resumeText,
        file_name:   fileName
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

    // Backend returns { success: true, data: { analysis: { ...scores } } }
    if (!json.success || !json.data || !json.data.analysis) {
      throw new Error('Unexpected response from server.');
    }

    return json.data.analysis;
  }

  // Expose globally
  window.GeminiClient = { analyzeResume };

})();
