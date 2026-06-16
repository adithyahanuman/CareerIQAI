'use strict';

const db = require('../config/db');
const env = require('../config/env');
const { admin } = require('../config/firebase');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Handle AI Career Assistant Chat requests.
 * Pulls the user's latest resume and constructs a prompt with strict career-only constraints.
 */
const handleChat = async (req, res, next) => {
  try {
    const { message } = req.body;
    const studentId = req.user.id;
    const firebaseUid = req.user.firebase_uid;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Attempt to fetch the user's latest parsed resume from Firestore
    let resumeText = null;
    try {
      if (firebaseUid) {
        const snap = await admin.firestore()
          .collection('user_profiles')
          .doc(firebaseUid)
          .get();
        if (snap.exists && snap.data().resumeText) {
          resumeText = snap.data().resumeText;
        }
      }
    } catch (dbErr) {
      console.warn('[ChatController] Could not fetch resume from Firestore:', dbErr.message);
      // Non-fatal, proceed without resume context
    }

    // 2. Fetch additional DB insights
    let resumeAnalysis = null;
    let benchmarkData = null;
    let roadmapData = null;

    try {
      const [resumesRes, benchmarksRes, roadmapsRes] = await Promise.all([
        db.query(
          `SELECT overall_analysis FROM resumes WHERE student_id = $1 AND status = 'done' ORDER BY is_primary DESC, created_at DESC LIMIT 1`,
          [studentId]
        ),
        db.query(
          `SELECT role_name, fit_score, major_strength, improvement_suggestion FROM benchmark_results WHERE student_id = $1 ORDER BY created_at DESC LIMIT 3`,
          [studentId]
        ),
        db.query(
          `SELECT from_role, to_role, roadmap_data FROM roadmaps WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [studentId]
        )
      ]);

      if (resumesRes.rows.length > 0 && resumesRes.rows[0].overall_analysis) {
        resumeAnalysis = resumesRes.rows[0].overall_analysis;
      }
      if (benchmarksRes.rows.length > 0) {
        benchmarkData = benchmarksRes.rows;
      }
      if (roadmapsRes.rows.length > 0) {
        roadmapData = roadmapsRes.rows[0];
      }
    } catch (dbErr) {
      console.warn('[ChatController] Could not fetch DB insights:', dbErr.message);
    }

    // 2. Construct the strict prompt
    const basePrompt = `
You are an expert AI Career Assistant. 

## Strict Topic Enforcement
- You may ONLY answer questions related to: career advice, resumes, interviews, professional development, and the CareerIQ AI platform.
- If the user asks about ANYTHING ELSE (e.g., general knowledge, coding problems not tied to an interview question, recipes, etc.), you MUST politely decline and state that you are exclusively a Career Assistant.

## Core Behavior
- Answer ONLY the specific question the user asks. Nothing more.
- Do not volunteer feedback, suggestions, or observations they didn't ask for.
- Do not ask clarifying questions unless the question is genuinely ambiguous and you cannot answer without more context.

## How to Answer
- Be direct. Lead with the answer, not a preamble.
- Be actionable. Where relevant, ground advice in something concrete they can do, say, or use.
- Be honest. Speak like a sharp, experienced career mentor.

${resumeText ? 
`## User Context
The user has provided their resume below. 
- Every answer must reference actual details from their resume — their real skills, projects, roles, companies, education, and achievements.
- Never give advice so generic it could apply to anyone.
- Be specific. Name their actual technologies, companies, roles, and experiences in your response.
- If their resume doesn't have enough information to answer well, say so in one sentence, then answer as best you can.

--- RESUME START ---
${resumeText.substring(0, 4000)}
--- RESUME END ---` 
: 
`## User Context
The user has NOT uploaded a resume yet. 
- Answer their question as an expert career assistant.
- You may gently remind them that uploading their resume to CareerIQ AI will allow you to give much more personalized and specific advice.`}

${resumeAnalysis ? `
## Platform Resume Analysis
The CareerIQ platform has already analyzed this resume. Here are the computed insights:
${JSON.stringify(resumeAnalysis, null, 2)}
` : ''}

${benchmarkData ? `
## Benchmarking Results
The user has recently benchmarked their profile against these roles:
${benchmarkData.map(b => `- Role: ${b.role_name} | Fit Score: ${b.fit_score}/100\n  Strength: ${b.major_strength}\n  Needs Improvement: ${b.improvement_suggestion}`).join('\n')}
` : ''}

${roadmapData ? `
## Active Career Roadmap
The user is currently following a Career Roadmap:
- Current Role: ${roadmapData.from_role}
- Target Role: ${roadmapData.to_role}
- Roadmap Details: ${JSON.stringify(roadmapData.roadmap_data, null, 2)}
` : ''}

## User's Question
${message}
`;

    // 3. Call Gemini
    const apiKey = env.geminiApiKeys && env.geminiApiKeys.length > 0 ? env.geminiApiKeys[0] : env.geminiApiKey;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
      }
    });

    const result = await model.generateContent(basePrompt);
    const aiResponse = result.response.text();

    res.json({ success: true, response: aiResponse });

  } catch (error) {
    console.error('[ChatController] Error:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
};

module.exports = {
  handleChat
};
