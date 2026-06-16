const fs = require('fs');
const path = 'c:/Users/narne/Desktop/project - Copy/careeriqai/backend/src/ai/prompts.js';

let prompts = fs.readFileSync(path, 'utf8');

// Fix issues arrays
prompts = prompts.replace(
    /"issues": \[\{"issue": "describe issue here"\}\]/g,
    `"issues": [{"issue": "describe issue 1 here"}, {"issue": "describe issue 2 here"}] // List ALL issues found (at least 2 if applicable)`
);
prompts = prompts.replace(
    /"issues": \[\]/g,
    `"issues": [{"issue": "issue 1"}, {"issue": "issue 2"}] // List ALL issues found`
);

// Fix suggestions
prompts = prompts.replace(
    /suggestions": \["suggestion"\]/g,
    `suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"] // Provide 3 actionable suggestions`
);
prompts = prompts.replace(
    /suggestions": \["suggestion1"\]/g,
    `suggestions": ["suggestion 1", "suggestion 2"]`
);
prompts = prompts.replace(
    /suggestions": \["specific rewrite example tailored to their field"\]/g,
    `suggestions": ["specific rewrite example 1", "specific rewrite example 2"]`
);

// Fix projects
prompts = prompts.replace(
    /"projects": \[\s*\{\s*"name": "string",/g,
    `"projects": [ // EXTRACT ALL PROJECTS LISTED ON THE RESUME (DO NOT LIMIT TO 1)
      {
        "name": "string",`
);

// Fix experience
prompts = prompts.replace(
    /"roles": \[\s*\{\s*"job_title": "string",/g,
    `"roles": [ // EXTRACT ALL ROLES/JOBS LISTED (DO NOT LIMIT TO 1)
      {
        "job_title": "string",`
);

// Fix education
prompts = prompts.replace(
    /"education_entries": \[\s*\{\s*"institution": "string",/g,
    `"education_entries": [ // EXTRACT ALL EDUCATION DEGREES LISTED (DO NOT LIMIT TO 1)
      {
        "institution": "string",`
);

// Fix action plan critical fixes
prompts = prompts.replace(
    /"critical_fixes": \[\s*\{\s*"issue": "string",/g,
    `"critical_fixes": [ // LIST ALL CRITICAL FIXES (3-5 items)
      {
        "issue": "string",`
);

// Fix action plan quick wins
prompts = prompts.replace(
    /"quick_wins": \[\s*\{\s*"action": "string",/g,
    `"quick_wins": [ // LIST ALL QUICK WINS (3-5 items)
      {
        "action": "string",`
);

// Add top-level instruction to ensure everything is extracted
prompts = prompts.replace(
    /Provide the JSON object ONLY, no markdown formatting./g,
    `Provide the JSON object ONLY, no markdown formatting. CRITICAL INSTRUCTION: Never limit lists to 1 item if the resume has more! Extract ALL projects, ALL roles, ALL degrees, and generate multiple issues and suggestions (3-5) for each section.`
);

fs.writeFileSync(path, prompts);
console.log('Prompts updated successfully.');
