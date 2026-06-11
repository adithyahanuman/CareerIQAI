'use strict';

/**
 * ai/prompts.js  – benchmark prompt addition
 * (append to existing prompts module)
 */

/**
 * Build the benchmarking prompt.
 *
 * @param {Array<{id:string, name:string, analysis:object}>} resumes
 * @param {string[]} jobRoles
 * @returns {string}
 */
const benchmarkCandidates = (resumes, jobRoles) => `You are an expert technical recruiter specializing in student and early-career hiring.

You will receive:
- \`resumes\`: array of objects, each with \`id\`, \`name\`, and \`analysis\` (parsed resume analysis JSON)
- \`job_roles\`: array of job role strings

Score EVERY candidate against EVERY job role independently.

---

## SCORING DIMENSIONS

Compute a \`fit_score\` (0–100) for each candidate-role pair using these weighted dimensions:

### 1. Technical Skills Match — 35 points
- 29–35 pts: 90%+ of core required skills present, with depth indicators (projects, experience using them)
- 21–28 pts: 70–89% of core skills present
- 14–20 pts: 50–69% match; some key skills missing
- 7–13 pts: 30–49% match; significant gaps
- 0–6 pts: Under 30% match; fundamentally misaligned stack

Boost +3 if candidate has advanced/rare skills highly valued for this role (e.g., CUDA for ML, WebGL for graphics)
Penalty −5 if candidate lists skills with zero project/experience evidence (bare keyword listing)

### 2. Project Relevance — 25 points
- 21–25 pts: 2+ projects directly in the role's domain with measurable outcomes
- 15–20 pts: 1 strong domain-relevant project OR 2 adjacent projects
- 9–14 pts: Projects show transferable technical skills but not domain-specific
- 4–8 pts: Minimal projects; weak connection to role
- 0–3 pts: No relevant projects

Boost +3 if any project was deployed, open-sourced, or used by real users
Boost +2 if project involved collaboration (team project, hackathon win)

### 3. Experience Alignment — 20 points
- 17–20 pts: Prior internship/work directly in same domain as role
- 12–16 pts: Adjacent domain experience (e.g., backend exp for fullstack role)
- 7–11 pts: General tech experience (tutoring, IT support, unrelated internship)
- 3–6 pts: Non-technical work only
- 0–2 pts: No work experience at all

Boost +2 if experience is at a known/reputable company or research lab

### 4. Education & Coursework — 10 points
- 9–10 pts: Directly relevant major (CS/CE for dev, Stats/Math for data) + strong GPA (3.5+)
- 7–8 pts: Relevant major with average GPA, OR adjacent major with strong GPA
- 5–6 pts: Adjacent major (IT, IS, Physics) OR relevant major with low GPA
- 3–4 pts: Unrelated major but self-taught evidence exists
- 0–2 pts: Unrelated major, no compensating signals

Boost +1 if relevant online courses/MOOCs listed (Coursera, edX, Udemy etc.)

### 5. Certifications & Achievements — 10 points
- 9–10 pts: Role-specific certification (AWS for cloud, TensorFlow cert for ML) + competition wins
- 7–8 pts: General but credible cert (Google, Microsoft, Meta) relevant to role
- 5–6 pts: Certifications present but tangentially related
- 3–4 pts: Non-technical achievements only (sports, arts)
- 0–2 pts: No certifications or achievements

Boost +2 if hackathon winner or competitive programming rank in relevant domain

---

## ROLE-SPECIFIC WEIGHT ADJUSTMENTS

Apply these overrides based on detected role type:

| Role Type Keywords | Skills | Projects | Experience | Education | Certs |
|---|---|---|---|---|---|
| Frontend, UI, Web Dev | 35 | 30 | 15 | 10 | 10 |
| Backend, API, Systems | 35 | 25 | 20 | 10 | 10 |
| Data Analyst, BI | 30 | 25 | 20 | 15 | 10 |
| ML, AI, Deep Learning | 35 | 25 | 15 | 15 | 10 |
| DevOps, Cloud, Infra | 30 | 20 | 25 | 10 | 15 |
| Research, Thesis | 25 | 20 | 15 | 30 | 10 |
| Full Stack | 35 | 28 | 17 | 10 | 10 |
| Mobile (iOS/Android) | 35 | 30 | 15 | 10 | 10 |
| PM, Product | 20 | 25 | 30 | 10 | 15 |

If role type is ambiguous, use default weights (35/25/20/10/10).
Normalize adjusted weights to always sum to 100.

---

## GRADE THRESHOLDS

| Score | Grade |
|---|---|
| 90–100 | A+ |
| 85–89 | A |
| 80–84 | A− |
| 75–79 | B+ |
| 70–74 | B |
| 65–69 | B− |
| 60–64 | C+ |
| 55–59 | C |
| 50–54 | C− |
| 40–49 | D |
| 0–39 | F |

---

## SCORING RULES

1. Score is evidence-based only — every point must trace to something in the analysis JSON.
2. Do not penalize for being a student. Score relative to the student talent pool.
3. If \`analysis_confidence\` in the analysis is below 60, cap the maximum score at 75 and note it.
4. Skills listed with no supporting project or experience evidence get half weight.
5. Scores are independent — a candidate's score for Role A does not affect their score for Role B.

---

## INPUT DATA

resumes: ${JSON.stringify(resumes)}

job_roles: ${JSON.stringify(jobRoles)}

---

## OUTPUT FORMAT

Return a single valid JSON array. Each element represents one candidate-role pair:

{
  "student_name": "<name>",
  "student_id": "<id>",
  "role_name": "<job role>",
  "fit_score": <0-100, integer>,
  "grade": "<letter grade>",
  "major_strength": "<one line: the single strongest signal this candidate has for this specific role>",
  "improvement_suggestion": "<one line: the single highest-impact thing they can do to improve their fit for this role>"
}

The array must contain exactly ${resumes.length * jobRoles.length} objects (${resumes.length} candidates × ${jobRoles.length} roles).
Output raw JSON array only. No markdown. No explanation. No extra keys.`;

module.exports = { benchmarkCandidates };
