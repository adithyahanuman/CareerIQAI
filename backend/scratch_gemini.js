require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { maxOutputTokens: 16384 }
    });
    const res = await model.generateContent("hello");
    console.log("Success:", res.response.text());
  } catch (e) {
    console.error("Error:", e.message);
  }
}
run();
