const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const Tesseract = require('tesseract.js');
const { createCanvas } = require('canvas');

pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

const LINE_Y_TOLERANCE = 4.0;
const COLUMN_GAP_THRESHOLD = 50;
const MIN_COLUMN_REGION_ROWS = 2;

const SECTION_HEADINGS = [
  'career objective', 'objective', 'summary', 'profile', 'about me', 'about',
  'education', 'academic background', 'academic details', 'qualifications',
  'experience', 'work experience', 'employment', 'internship', 'internships',
  'projects', 'project work', 'academic projects',
  'skills', 'technical skills', 'core skills', 'key skills', 'competencies',
  'certifications', 'trainings', 'trainings / certifications',
  'achievements', 'awards', 'honors',
  'extra curricular activities', 'extracurricular activities', 'activities',
  'languages', 'hobbies', 'interests',
  'contact', 'references', 'publications',
];

async function getRawItems(pdf) {
  const pages = {};
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    pages[pageNum] = [];
    
    for (const item of textContent.items) {
      if (item.str.trim() !== '') {
        pages[pageNum].push({
          text: item.str,
          x: parseFloat(item.transform[4].toFixed(3)),
          y: parseFloat((-item.transform[5]).toFixed(3)),
          w: item.width || 0,
        });
      }
    }
  }
  return pages;
}

function groupIntoRows(items) {
  if (!items || items.length === 0) return [];
  items.sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
  const rows = [];
  let currentRow = [items[0]];

  for (let i = 1; i < items.length; i++) {
    if (Math.abs(items[i].y - currentRow[0].y) <= LINE_Y_TOLERANCE) {
      currentRow.push(items[i]);
    } else {
      rows.push(currentRow.sort((a, b) => a.x - b.x));
      currentRow = [items[i]];
    }
  }
  rows.push(currentRow.sort((a, b) => a.x - b.x));
  return rows;
}

function findColumnBoundary(rowItems) {
  if (rowItems.length < 2) return null;
  const xPositions = rowItems.map(it => it.x).sort((a, b) => a - b);
  let maxGap = 0;
  let gapMid = null;

  for (let i = 1; i < xPositions.length; i++) {
    const gap = xPositions[i] - xPositions[i - 1];
    if (gap > maxGap) {
      maxGap = gap;
      gapMid = (xPositions[i - 1] + xPositions[i]) / 2;
    }
  }
  return maxGap >= COLUMN_GAP_THRESHOLD ? gapMid : null;
}

function buildSingleColumnLines(items) {
  if (!items || items.length === 0) return [];
  const rows = groupIntoRows(items);
  return rows.map(row =>
    row.map(it => it.text.trim()).filter(Boolean).join(' ')
  ).filter(Boolean);
}

function buildLinesColumnAware(items) {
  const rows = groupIntoRows(items);
  const outputLines = [];
  let i = 0;

  while (i < rows.length) {
    const boundary = findColumnBoundary(rows[i]);

    if (boundary === null) {
      const line = rows[i].map(it => it.text.trim()).filter(Boolean).join(' ');
      if (line) outputLines.push(line);
      i++;
    } else {
      const regionItems = [];
      const regionStart = i;

      while (i < rows.length) {
        const b = findColumnBoundary(rows[i]);
        if (b !== null && Math.abs(b - boundary) < 20) {
          regionItems.push(...rows[i]);
          i++;
        } else {
          break;
        }
      }

      if (i - regionStart >= MIN_COLUMN_REGION_ROWS) {
        const leftItems  = regionItems.filter(it => it.x < boundary);
        const rightItems = regionItems.filter(it => it.x >= boundary);

        const leftLines  = buildSingleColumnLines(leftItems);
        const rightLines = buildSingleColumnLines(rightItems);

        leftLines.forEach(l => { if (l.trim()) outputLines.push(l); });
        outputLines.push(''); 
        rightLines.forEach(l => { if (l.trim()) outputLines.push(l); });
      } else {
        for (let j = regionStart; j < i; j++) {
          const line = rows[j].map(it => it.text.trim()).filter(Boolean).join(' ');
          if (line) outputLines.push(line);
        }
      }
    }
  }
  return outputLines;
}

function isHeading(line) {
  const clean = line.trim();
  if (!clean || clean.length > 80) return false;
  const lower = clean.toLowerCase().replace(/[^a-z0-9\s\/]/g, '').trim();
  if (SECTION_HEADINGS.some(kw => lower === kw || lower.startsWith(kw))) return true;

  const lettersOnly = clean.replace(/[^A-Za-z\s\/]/g, '').trim();
  if (
    lettersOnly.length >= 4 &&
    lettersOnly === lettersOnly.toUpperCase() &&
    !/^[\d\s]+$/.test(clean) &&
    !clean.includes(',') &&
    !/\d{4}/.test(clean) &&
    !/@/.test(clean) &&
    clean.split(' ').length <= 5
  ) return true;

  return false;
}

function splitIntoSections(lines) {
  const sections = {};
  let currentSection = null;
  let buffer = [];

  lines.forEach(line => {
    if (isHeading(line)) {
      if (currentSection !== null && buffer.length > 0) {
        sections[currentSection] = buffer.join('\n').trim();
      }
      currentSection = line.trim();
      buffer = [];
    } else {
      if (currentSection === null && line.trim()) {
        currentSection = 'CONTACT';
      }
      if (line.trim()) buffer.push(line.trim());
    }
  });

  if (currentSection !== null && buffer.length > 0) {
    sections[currentSection] = buffer.join('\n').trim();
  }
  return sections;
}

function needsOCR(rawText, numPages) {
  const text = rawText.trim();
  // Check 1: too short, likely scanned
  if (text.length < 100) return true;

  // Check 2: non-ASCII character ratio > 10% (garbled/corrupted encoding)
  let nonAsciiCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) nonAsciiCount++;
  }
  if ((nonAsciiCount / text.length) > 0.10) return true;

  // Check 3: average words per page < 20 (image-based PDF with no embedded text)
  const wordCount = text.split(/\s+/).length;
  if ((wordCount / numPages) < 20) return true;

  // Check 4: Alphabetic character ratio < 50%
  // Mapped fonts often resolve to ASCII symbols rather than letters.
  let alphaCount = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      alphaCount++;
    }
  }
  if ((alphaCount / text.length) < 0.5) return true;

  return false;
}

async function performOCR(pdf) {
  let fullText = '';
  let totalConfidence = 0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // scale up for OCR accuracy
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    const buffer = canvas.toBuffer('image/png');
    const result = await Tesseract.recognize(buffer, 'eng');
    fullText += result.data.text + '\n';
    totalConfidence += result.data.confidence;
  }

  return {
    raw_text: fullText.trim(),
    confidence: totalConfidence / pdf.numPages / 100 // Convert 0-100 to 0-1
  };
}

/**
 * Extracts text from a PDF Buffer, falling back to OCR if the PDF text layer is poor.
 * @param {Buffer} buffer - The PDF file buffer
 * @returns {Promise<{raw_text: string, sections: object, method: string, confidence: number}>}
 */
async function extractPdfText(buffer) {
  // Load PDF with PDF.js
  const dataArray = new Uint8Array(buffer);
  const path = require('path');
  const standardFontDataUrl = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts/');
  
  const pdf = await pdfjsLib.getDocument({ 
    data: dataArray,
    standardFontDataUrl
  }).promise;
  
  // 1. Try standard text extraction
  const pages = await getRawItems(pdf);
  let allLines = [];
  Object.values(pages).forEach(pageItems => {
    const lines = buildLinesColumnAware(pageItems);
    allLines = allLines.concat(lines);
  });

  // Filter out page numbers
  allLines = allLines.filter(l => !/^Page\s*[-\u2013]\s*\d+\/\d+$/i.test(l));

  let raw_text = allLines.filter(l => l.trim()).join('\n');
  
  // 2. Quality Check
  if (needsOCR(raw_text, pdf.numPages)) {
    // 3. Fallback to OCR
    const ocrResult = await performOCR(pdf);
    
    if (!ocrResult.raw_text.trim()) {
      throw new Error('PDF extraction failed: OCR returned empty text');
    }

    const ocrLines = ocrResult.raw_text.split('\n').filter(Boolean);
    const sections = splitIntoSections(ocrLines);

    return {
      raw_text: ocrResult.raw_text,
      sections,
      method: 'ocr',
      confidence: ocrResult.confidence
    };
  }

  // If quality check passes, return pdf.js result
  const sections = splitIntoSections(allLines);
  return {
    raw_text,
    sections,
    method: 'pdfjs',
    confidence: 1.0
  };
}

module.exports = extractPdfText;
