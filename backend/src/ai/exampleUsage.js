'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const aiService = require('./aiService');

async function runExamples() {
  console.log('=== Running AI Provider Architecture Examples ===\n');

  // 1. Resume Analysis Example
  try {
    console.log('--- 1. Testing Resume Analysis ---');
    const resumeText = `
      Adithya Hanuman Narne
      Email: narneadithyahanuman@gmail.com
      Skills: JavaScript, Node.js, Python, PostgreSQL, React
      Education: B.Tech in CSE (Data Science) - Vellore Institute of Technology
      Projects: CareerIQ AI (AI-powered career coaching backend)
    `;
    const resumePrompt = `Analyze this candidate's profile. Return JSON format with overall_resume_score, skills_score, experience_score, education_score, feedback paragraph. Profile: ${resumeText}`;
    
    const response = await aiService.analyzeResume(resumePrompt);
    console.log('Provider used:', response.provider);
    console.log('Model used:', response.model);
    console.log('Data returned:', JSON.stringify(response.data, null, 2));
    console.log();
  } catch (err) {
    console.error('Resume Analysis failed:', err.message);
  }

  // 2. Job Matching Example
  try {
    console.log('--- 2. Testing Job Matching ---');
    const jobDescription = `
      Role: Junior Fullstack Developer
      Required: Node.js, Express, SQL, Git, and REST APIs.
      Nice to have: Tailwind CSS, cloud services.
    `;
    const candidateProfile = `
      Skills: JavaScript, Node.js, Express, PostgreSQL, HTML/CSS.
    `;
    const matchPrompt = `Match this candidate with the job description. Return JSON format with match_percentage (0-100), key_matches[], and missing_skills[].
    Job: ${jobDescription}
    Candidate: ${candidateProfile}`;

    const response = await aiService.matchJobDescription(matchPrompt);
    console.log('Provider used:', response.provider);
    console.log('Model used:', response.model);
    console.log('Data returned:', JSON.stringify(response.data, null, 2));
    console.log();
  } catch (err) {
    console.error('Job Matching failed:', err.message);
  }

  // 3. Career Recommendations Example
  try {
    console.log('--- 3. Testing Career Recommendations ---');
    const skills = ['Python', 'SQL', 'Pandas', 'Machine Learning'];
    const advicePrompt = `Give career advice for a student with these skills: ${skills.join(', ')}. Return JSON format with recommended_roles[] (each with title and reason) and skills_to_learn[].`;

    const response = await aiService.generateCareerAdvice(advicePrompt);
    console.log('Provider used:', response.provider);
    console.log('Model used:', response.model);
    console.log('Data returned:', JSON.stringify(response.data, null, 2));
    console.log();
  } catch (err) {
    console.error('Career Recommendations failed:', err.message);
  }

  // 4. Interview Question Generation Example
  try {
    console.log('--- 4. Testing Interview Question Generation ---');
    const role = 'Backend Developer';
    const topics = ['Node.js', 'PostgreSQL', 'Caching'];
    const interviewPrompt = `Generate 3 technical interview questions for a mid-level ${role}. Return JSON format with questions[] (each with question, category, and hint). Topics: ${topics.join(', ')}`;

    const response = await aiService.generateInterviewQuestions(interviewPrompt);
    console.log('Provider used:', response.provider);
    console.log('Model used:', response.model);
    console.log('Data returned:', JSON.stringify(response.data, null, 2));
    console.log();
  } catch (err) {
    console.error('Interview Question Generation failed:', err.message);
  }
}

// Check if run directly
if (require.main === module) {
  runExamples();
}

module.exports = runExamples;
