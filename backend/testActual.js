const fs = require('fs');
const extractPdfText = require('./src/utils/extractPdfText');

async function test() {
  try {
    const pdfBuffer = fs.readFileSync('../Charan resume.pdf');
    const result = await extractPdfText(pdfBuffer);
    console.log("Success! Method:", result.method);
    console.log("Extracted text length:", result.raw_text.length);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
