'use strict';

/**
 * src/ai/prompts.js
 *
 * SINGLE SOURCE OF TRUTH FOR ALL AI PROMPTS
 *
 * fullResumeAnalysis() — uses the Master Prompt (13 sections).
 * ONE call → ONE JSON → stored in resumes table (13 JSONB columns).
 *
 * Response shape:
 * {
 *   contact, summary, experience, education, skills, projects,
 *   formatting, certifications, extracurriculars,
 *   overall, action_plan, resume_completeness, analysis_confidence
 * }
 */

/**
 * Full resume analysis using the Master Student Resume Analyzer prompt.
 * @param {string} resumeText - Plain text extracted from the resume PDF
 * @returns {string} Prompt ready to be sent to the AI provider
 */
const fullResumeAnalysis = (resumeText) => {
  const now = new Date();
  const currentDate = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', day: 'numeric' });
  return `You are an expert resume analyst and university career counselor specializing in helping students land internships or full-time roles. You have reviewed over 30,000 student resumes and know exactly what recruiters at top companies look for.

TODAY'S DATE: ${currentDate}. Use this as your reference for evaluating all dates. Do NOT flag any date on or before today as a future date. Only flag dates strictly after today as future dates.

CRITICAL INSTRUCTION FOR ROLE RECOMMENDATIONS: Based on the candidate's graduation year and experience, recommend either "Internship" roles (if they are early in college) OR "Full-Time" roles (if they are graduating soon, already graduated, or explicitly seeking full-time jobs). Do NOT default to "Intern" for everyone.

IMPORTANT CONTEXT: This resume belongs to a STUDENT. Apply student-appropriate standards:
- No full-time work experience is expected or required
- Projects are the PRIMARY proof of technical/professional ability
- Education details matter significantly more than for experienced candidates
- Extracurricular activities, clubs, and leadership roles are legitimate experience
- GPA matters if above 6.0
- Career trajectory scoring is NOT applicable
- Impact metrics are appreciated but not expected — effort to quantify is rewarded

## INPUT TEXT RULES — READ BEFORE ANY ANALYSIS

The text you receive may be noisy, broken, or incomplete due to extraction issues.
Before analyzing, always apply these rules:

1. NEVER skip any word, line, or symbol — even if it looks like noise
2. If words are merged, split them at logical boundaries: "SoftwareEngineer" → "Software Engineer"
3. If a sentence is broken across lines, rejoin it into one complete sentence
4. If a word looks garbled, infer the correct word from surrounding context and flag it
5. Bullet symbols (●, □, ■, ◆, *, –) all mean the same thing — treat as list items
6. If a section header and its content are on the same line, separate them before analysis
7. If you are uncertain about any word, still include it — mark it as suspected error, never drop it
8. Process the text exactly as given — do not assume any part is irrelevant or already covered
9. After reconstruction, re-read your output and verify no sentence from the input is missing

Analyze the resume and return ONE valid JSON object with ALL scored sections below.
Return ONLY the JSON. No markdown, no explanation, no code blocks, no preamble.
Every score must reference actual resume content. Never be vague or generic.

SECTION WEIGHTS (total out of 130, normalized to 100):
Contact Information: 2, Career Objective/Summary: 2, Internship & Work Experience: 20,
Education: 20, Skills: 20, Projects: 20, Formatting & ATS: 6,
Certifications & Achievements: 20, Extracurriculars & Leadership: 20

Return this exact JSON structure (fill all fields based on the resume):

CRITICAL INSTRUCTIONS FOR EXTRACTION:
1. Do NOT limit lists to 1 item. You must extract ALL projects, ALL roles, and ALL education degrees listed on the resume.
2. For issues and suggestions, generate comprehensive lists. Always provide 3-5 actionable suggestions and 2+ issues per section where applicable.


{
  "contact": {
    "contact_score": 0,
    "contact_max": 2,
    "contact_grade": "A/B/C/D/F",
    "fields_found": ["name","email","linkedin","github"],
    "fields_missing": [],
    "email_professionalism": "professional",
    "issues": [{"issue": "describe issue 1 here"}, {"issue": "describe issue 2 here"}],
    "contact_suggestions": ["suggestion 1", "suggestion 2"]
  },
  "summary": {
    "summary_score": 0,
    "summary_max": 2,
    "summary_grade": "A/B/C/D/F",
    "summary_type": "objective",
    "buzzwords_found": [],
    "length_assessment": "too short",
    "issues": [{"issue": "describe issue 1 here"}, {"issue": "describe issue 2 here"}],
    "summary_suggestions": ["specific rewrite example 1", "specific rewrite example 2"]
  },
  "experience": {
    "experience_score": 0,
    "experience_max": 20,
    "experience_grade": "A/B/C/D/F",
    "experience_type": "none",
    "internship_count": 0,
    "roles": [
      {
        "job_title": "string",
        "company": "string",
        "type": "internship",
        "duration_months": 0,
        "contribution_quality": "active",
        "role_score": 0
      }
    ],
    "issues": [{"issue": "describe issue 1 here"}, {"issue": "describe issue 2 here"}],
    "no_experience_note": null,
    "experience_suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
  },
  "education": {
    "education_score": 0,
    "education_max": 20,
    "education_grade": "A/B/C/D/F",
    "education_entries": [
      {
        "institution": "string",
        "degree_type": "bachelor",
        "field_of_study": "string",
        "graduation_year": "string",
        "gpa": null,
        "gpa_assessment": "not_listed",
        "relevant_coursework": [],
        "tools_in_coursework": [],
        "specialization_or_minor": null
      }
    ],
    "field_relevance": "highly_relevant",
    "issues": [{"issue": "issue 1"}, {"issue": "issue 2"}],
    "education_suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
  },
  "skills": {
    "skills_score": 0,
    "skills_max": 20,
    "skills_grade": "A/B/C/D/F",
    "total_skills_count": 0,
    "technical_skills": [],
    "tools_and_platforms": [],
    "frameworks_and_libraries": [],
    "soft_skills": [],
    "skills_without_evidence": [],
    "inflated_claims": [],
    "too_basic_flagged": [],
    "issues": [{"issue": "issue 1"}, {"issue": "issue 2"}],
    "skills_suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
  },
  "projects": {
    "projects_score": 0,
    "projects_max": 20,
    "projects_grade": "A/B/C/D/F",
    "total_projects": 0,
    "projects": [
      {
        "name": "string",
        "type": "personal",
        "description_quality": "good",
        "technologies": [],
        "has_link": false,
        "has_outcome": false,
        "is_tutorial_level": false,
        "complexity": "intermediate",
        "project_score": 0
      }
    ],
    "overall_assessment": "developing",
    "issues": [{"issue": "issue 1"}, {"issue": "issue 2"}],
    "projects_suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
  },
  "formatting": {
    "formatting_score": 0,
    "formatting_max": 6,
    "formatting_grade": "A/B/C/D/F",
    "page_count": "1",
    "sections_present": [],
    "sections_missing": [],
    "non_standard_headings": [],
    "ats_risk_level": "low",
    "spelling_errors": [],
    "strong_verbs_found": [],
    "weak_verbs_found": [],
    "passive_voice_examples": [],
    "filler_phrases": [],
    "grammar_errors": [],
    "issues": [{"issue": "issue 1"}, {"issue": "issue 2"}],
    "formatting_suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
  },
  "certifications": {
    "certifications_score": 0,
    "certifications_max": 20,
    "certifications_grade": "A/B/C/D/F",
    "certifications_found": [
      {
        "name": "string",
        "issuer": "string",
        "year": null,
        "relevance": "highly_relevant"
      }
    ],
    "has_online_courses": false,
    "achievements_found": [
      {
        "title": "string",
        "type": "competition_win",
        "scale": null,
        "year": null
      }
    ],
    "most_impressive_achievement": null,
    "issues": [{"issue": "issue 1"}, {"issue": "issue 2"}],
    "no_certifications_note": null,
    "no_achievements_note": null,
    "certifications_suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
    "achievements_suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
  },
  "extracurriculars": {
    "extracurricular_score": 0,
    "extracurricular_max": 20,
    "extracurricular_grade": "A/B/C/D/F",
    "total_activities": 0,
    "activities": [
      {
        "activity_name": "string",
        "role": "string",
        "is_leadership": false,
        "contribution_described": false,
        "relevance": "general",
        "has_scale_or_achievement": false,
        "activity_score": 0
      }
    ],
    "issues": [{"issue": "issue 1"}, {"issue": "issue 2"}],
    "no_extracurricular_note": null,
    "extracurricular_suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
  },
  "overall": {
    "overall_score": 0,
    "raw_score": 0,
    "letter_grade": "C",
    "grade_label": "string",
    "score_breakdown": {
      "contact": 0,
      "summary": 0,
      "experience": 0,
      "education": 0,
      "skills": 0,
      "projects": 0,
      "formatting": 0,
      "certifications": 0,
      "extracurriculars": 0
    },
    "percentile_estimate": "average",
    "internship_readiness": "almost_ready",
    "one_line_verdict": "string"
  },
  "action_plan": {
    "critical_fixes": [
      {
        "fix": "string",
        "severity": "critical",
        "action": "string",
        "time_to_fix": "5 min"
      }
    ],
    "quick_wins": [
      {
        "action": "string",
        "expected_score_gain": "+X points",
        "time_to_fix": "5 min"
      }
    ],
    "this_week_improvements": [
      {
        "improvement": "string",
        "section": "string",
        "why_it_matters": "string",
        "example": "before → after"
      }
    ],
    "long_term_suggestions": [
      {
        "suggestion": "string",
        "timeline": "1 month",
        "impact": "string"
      }
    ],
    "strengths_to_highlight": [],
    "biggest_gaps": [],
    "recommended_roles": [],
    "recommended_certifications": [],
    "encouragement": "string"
  },
  "resume_completeness": {
    "completeness_score": 0,
    "completeness_grade": "A/B/C/D/F",
    "sections_complete": [],
    "sections_missing": [],
    "sections_underdeveloped": [
      {"section": "string", "reason": "string"}
    ],
    "resume_density": "adequate",
    "missing_sections_impact": "moderate",
    "completeness_note": "string"
  },
  "analysis_confidence": {
    "overall_confidence": "high",
    "confidence_score": 0,
    "extraction_quality": "clean",
    "ambiguities": [
      {"section": "string", "issue": "string"}
    ],
    "low_confidence_note": null
  }
}

SCORING RULES:
- contact_score (out of 2): name+0.5, professional email+0.5, LinkedIn+0.5, GitHub+0.5
- summary_score (out of 2): exists+0.2, mentions target role+1, ideal length+0.5, deduct -0.5 for only generic buzzwords
- experience_score (out of 20): score=4 (neutral) if no experience; +4 per relevant role up to 2, role quality, quantification, skill context
- education_score (out of 20): degree+3, institution+2, graduation year+1, relevance+3, GPA 6+: +2, GPA 8+: +2, coursework+2, capstone+2, tools+1, exchange/minor+1+1
- skills_score (out of 20): section exists+2, categorized+3, 6+ skills+3, 10+ skills+3, evidence in projects+3, no inflation+2, balance+1, transferable+3
- projects_score (out of 20): exists+3, 2+ projects+3, descriptive names+1, what/why+3, tech listed+2, personal initiative+2, link/demo+2, scale+2, progression+1; deduct -1 for all tutorials, -1 title-only
- formatting_score (out of 6): section order+1, standard headings+1, no spelling errors+2, no multi-column+0.5, consistent+0.5, no graphics+0.5, strong action verbs+0.5; deduct -1/typo (max-1), -0.5 multi-column, -1 non-standard headings
- certifications_score (out of 20): section exists+2, relevant cert+4, recognized platform+3, recent (2yr)+2, online courses+1; NO certs=4 neutral. Competition win+3, academic award+2, community recognition+1, scale mentioned+2; NO achievements=2 neutral
- extracurricular_score (out of 20): section exists+2, 2+ activities+2, leadership role+5, field-relevant+3, contributions described+3, scale/achievement+3, leadership qualities+2; deduct -1 filler; NO extras=2 neutral
- overall_score = (raw_score / 130) * 100, rounded to integer
- raw_score = sum of all section scores

GRADING SCALE: 90-100=A+, 83-89=A, 76-82=A-, 70-75=B+, 63-69=B, 56-62=B-, 50-55=C+, 43-49=C, 36-42=C-, 25-35=D, <25=F

RESUME TEXT:
"""
${resumeText.slice(0, 12000)}
"""

Return ONLY the JSON object. No markdown fences, no explanation, no extra text.`;
};

// ─────────────────────────────────────────────────────────────────────────────
// CAREER ROADMAP  (on-demand AI call — needs a user-supplied target role)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a step-by-step career transition roadmap.
 * @param {string}   currentRole
 * @param {string}   targetRole
 * @param {string[]} skills
 * @returns {string}
 */
const careerRoadmap = (currentRole, targetRole, skills = []) =>
  `You are a career development expert. Create a step-by-step roadmap for someone transitioning from "${currentRole}" to "${targetRole}".
Current skills: ${skills.join(', ') || 'not specified'}.

Return ONLY a valid JSON object:
{
  "currentRole": "${currentRole}",
  "targetRole": "${targetRole}",
  "estimatedTimeline": "<e.g. 6-12 months>",
  "requiredSkills": ["<skill 1>", "<skill 2>", "<skill 3>"],
  "steps": [
    { "step": 1, "title": "<title>", "description": "<what to do>", "duration": "<e.g. 1 month>" },
    { "step": 2, "title": "<title>", "description": "<what to do>", "duration": "<e.g. 2 months>" },
    { "step": 3, "title": "<title>", "description": "<what to do>", "duration": "<e.g. 1 month>" },
    { "step": 4, "title": "<title>", "description": "<what to do>", "duration": "<e.g. 2 months>" },
    { "step": 5, "title": "<title>", "description": "<what to do>", "duration": "<e.g. 2 months>" }
  ]
}

Return ONLY the JSON object. No markdown, no explanation.`;

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  fullResumeAnalysis,
  careerRoadmap,
};
