const fs = require('fs');
const path = 'c:/Users/narne/Desktop/project - Copy/careeriqai/backend/src/ai/prompts.js';

let prompts = fs.readFileSync(path, 'utf8');

// 1. Remove all the inline // comments that break JSON.parse
prompts = prompts.replace(/ \/\/ List ALL issues found \(at least 2 if applicable\)/g, '');
prompts = prompts.replace(/ \/\/ List ALL issues found/g, '');
prompts = prompts.replace(/ \/\/ Provide 3 actionable suggestions/g, '');
prompts = prompts.replace(/ \/\/ EXTRACT ALL PROJECTS LISTED ON THE RESUME \(DO NOT LIMIT TO 1\)/g, '');
prompts = prompts.replace(/ \/\/ EXTRACT ALL ROLES\/JOBS LISTED \(DO NOT LIMIT TO 1\)/g, '');
prompts = prompts.replace(/ \/\/ EXTRACT ALL EDUCATION DEGREES LISTED \(DO NOT LIMIT TO 1\)/g, '');
prompts = prompts.replace(/ \/\/ LIST ALL CRITICAL FIXES \(3-5 items\)/g, '');
prompts = prompts.replace(/ \/\/ LIST ALL QUICK WINS \(3-5 items\)/g, '');

// 2. Add the instructions into the actual text prompt above the JSON
const instruction = `
CRITICAL INSTRUCTIONS FOR EXTRACTION:
1. Do NOT limit lists to 1 item. You must extract ALL projects, ALL roles, and ALL education degrees listed on the resume.
2. For issues and suggestions, generate comprehensive lists. Always provide 3-5 actionable suggestions and 2+ issues per section where applicable.
`;

prompts = prompts.replace(
    /Return this exact JSON structure \(fill all fields based on the resume\):/g,
    `Return this exact JSON structure (fill all fields based on the resume):\n${instruction}`
);

fs.writeFileSync(path, prompts);
console.log('Fixed prompts JSON syntax and moved instructions to text block.');
