/**
 * CareerIQ AI — PDF Resume Extractor (v3)
 * 
 * Handles multi-column layouts by detecting columns and reading
 * each column top-to-bottom independently.
 * 
 * Usage: node extract-resume.js <path-to-pdf>
 *        node extract-resume.js              (defaults to resume.pdf)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { PdfReader } = require('pdfreader');

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// pdfreader uses cm. A typical line is ~0.4cm tall.
const LINE_Y_TOLERANCE = 0.25;

// Gap between x-positions (in cm) that indicates a column boundary
const COLUMN_GAP_THRESHOLD = 6;

// Minimum consecutive multi-column rows to count as a column region
const MIN_COLUMN_REGION_ROWS = 2;

// Known resume section headings
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

// ─── STEP 1: GET RAW POSITIONED ITEMS FROM PDFREADER ─────────────────────────

function getRawItems(buffer) {
  return new Promise((resolve) => {
    const pages = {};
    let currentPage = 0;

    new PdfReader().parseBuffer(buffer, (err, item) => {
      if (!item) { resolve(pages); return; }
      if (err)   { resolve(pages); return; }

      if (item.page) {
        currentPage = item.page;
        pages[currentPage] = [];
      }

      if (item.text !== undefined && item.x !== undefined && item.y !== undefined) {
        pages[currentPage].push({
          text: item.text,
          x: parseFloat(item.x.toFixed(3)),
          y: parseFloat(item.y.toFixed(3)),
          w: item.w || 0,
        });
      }
    });
  });
}

// ─── STEP 2: GROUP ITEMS INTO ROWS (same y ± tolerance) ─────────────────────

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

// ─── STEP 3: DETECT COLUMN BOUNDARIES ────────────────────────────────────────

/**
 * Check if a row has a large x-gap between item clusters, indicating columns.
 * We only use x positions (not w) because pdfreader reports w in different units.
 * Returns the x-midpoint of the biggest gap, or null if single column.
 */
function findColumnBoundary(rowItems) {
  if (rowItems.length < 2) return null;

  // Get sorted unique x starting positions
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

  // A gap of 8+ cm between x-positions strongly indicates two columns
  return maxGap >= COLUMN_GAP_THRESHOLD ? gapMid : null;
}

// ─── STEP 4: BUILD LINES WITH COLUMN-AWARE READING ──────────────────────────

/**
 * The key algorithm:
 * 1. Group all items into rows
 * 2. Walk rows top-to-bottom
 * 3. If a row is single-column, output it as a normal line
 * 4. If a run of consecutive rows are multi-column (share similar gap position),
 *    collect the entire multi-column region, split items left/right of boundary,
 *    and read left column top-to-bottom first, then right column top-to-bottom.
 */
function buildLinesColumnAware(items) {
  const rows = groupIntoRows(items);
  const outputLines = [];

  let i = 0;
  while (i < rows.length) {
    const boundary = findColumnBoundary(rows[i]);

    if (boundary === null) {
      // Single-column row: just join items with spaces
      const line = rows[i].map(it => it.text.trim()).filter(Boolean).join(' ');
      if (line) outputLines.push(line);
      i++;
    } else {
      // Start of a multi-column region. Collect all consecutive multi-column rows
      // whose boundary is in a similar x-position (± 3cm).
      const regionItems = [];
      const regionStart = i;

      while (i < rows.length) {
        const b = findColumnBoundary(rows[i]);
        if (b !== null && Math.abs(b - boundary) < 3) {
          regionItems.push(...rows[i]);
          i++;
        } else {
          break;
        }
      }

      // Only treat as multi-column if we have enough rows
      if (i - regionStart >= MIN_COLUMN_REGION_ROWS) {
        // Split items into left and right columns
        const leftItems  = regionItems.filter(it => it.x < boundary);
        const rightItems = regionItems.filter(it => it.x >= boundary);

        // Build lines for each column independently (top-to-bottom)
        const leftLines  = buildSingleColumnLines(leftItems);
        const rightLines = buildSingleColumnLines(rightItems);

        // Output left column first, then right column
        leftLines.forEach(l => { if (l.trim()) outputLines.push(l); });
        outputLines.push(''); // blank line separator between columns
        rightLines.forEach(l => { if (l.trim()) outputLines.push(l); });
      } else {
        // Not enough rows — treat as normal lines
        for (let j = regionStart; j < i; j++) {
          const line = rows[j].map(it => it.text.trim()).filter(Boolean).join(' ');
          if (line) outputLines.push(line);
        }
      }
    }
  }

  return outputLines;
}

/**
 * Build normal lines from items (single column, sort by y then x).
 */
function buildSingleColumnLines(items) {
  if (!items || items.length === 0) return [];

  const rows = groupIntoRows(items);
  return rows.map(row =>
    row.map(it => it.text.trim()).filter(Boolean).join(' ')
  ).filter(Boolean);
}

// ─── STEP 5: DETECT SECTION HEADINGS AND SPLIT ──────────────────────────────

function isHeading(line) {
  const clean = line.trim();
  if (!clean || clean.length > 80) return false;

  const lower = clean.toLowerCase().replace(/[^a-z0-9\s\/]/g, '').trim();

  // Known heading keyword match
  if (SECTION_HEADINGS.some(kw => lower === kw || lower.startsWith(kw))) return true;

  // ALL-CAPS short line — typical resume heading
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

// ─── STEP 6: BUILD OUTPUT FILES ─────────────────────────────────────────────

function buildTxt(metadata, sections) {
  const SEP  = '═'.repeat(60);
  const LINE = '─'.repeat(60);

  let out = '';
  out += `RESUME EXTRACTION\n`;
  out += `File      : ${metadata.file_name}\n`;
  out += `Pages     : ${metadata.pages}\n`;
  out += `Extracted : ${metadata.extracted_at}\n`;
  out += `${SEP}\n\n`;

  Object.entries(sections).forEach(([heading, content]) => {
    out += `${heading}\n${LINE}\n`;
    out += `${content}\n\n`;
  });

  return out;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function extractResume(filePath) {
  const absPath  = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`\u274C File not found: ${absPath}`);
    process.exit(1);
  }

  const buffer   = fs.readFileSync(absPath);
  const fileName = path.basename(absPath);
  console.log(`\n\uD83D\uDCC4 Extracting: ${fileName}\n`);

  // ── Get positioned items ─────────────────────────────────────────────────
  const pages = await getRawItems(buffer);
  const pageCount = Object.keys(pages).length;

  // ── Build lines with column-aware reading ────────────────────────────────
  let allLines = [];
  Object.values(pages).forEach(pageItems => {
    const lines = buildLinesColumnAware(pageItems);
    allLines = allLines.concat(lines);
  });

  // Remove page number lines
  allLines = allLines.filter(l => !/^Page\s*[-\u2013]\s*\d+\/\d+$/i.test(l));

  // ── Split into sections ──────────────────────────────────────────────────
  const sections = splitIntoSections(allLines);

  // ── Stats ────────────────────────────────────────────────────────────────
  const rawText = allLines.filter(l => l.trim()).join('\n');
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  const sectionCount = Object.keys(sections).length;

  const metadata = {
    file_name: fileName,
    pages: pageCount,
    extracted_at: new Date().toISOString(),
  };

  // ── Console output ───────────────────────────────────────────────────────
  const bar = '\u2501'.repeat(50);
  console.log(bar);
  console.log('\uD83D\uDCCA EXTRACTION SUMMARY');
  console.log(bar);
  console.log(`  File     : ${fileName}`);
  console.log(`  Pages    : ${pageCount}`);
  console.log(`  Words    : ${wordCount}`);
  console.log(`  Sections : ${sectionCount}`);
  console.log(bar);

  console.log('\n\uD83D\uDCD1 SECTIONS:');
  Object.keys(sections).forEach(s => console.log(`  \u2022 ${s}`));

  console.log('\n\uD83D\uDCDD TEXT PREVIEW:');
  console.log(bar);
  console.log(rawText.substring(0, 500));
  console.log(bar);

  // ── Save JSON ────────────────────────────────────────────────────────────
  const base = path.basename(filePath, '.pdf');
  const jsonOut = { metadata, sections, raw_text: rawText };
  fs.writeFileSync(`${base}_extracted.json`, JSON.stringify(jsonOut, null, 2), 'utf8');
  console.log(`\n\u2705 JSON saved : ${base}_extracted.json`);

  // ── Save TXT ─────────────────────────────────────────────────────────────
  const txtContent = buildTxt(metadata, sections);
  fs.writeFileSync(`${base}_extracted.txt`, txtContent, 'utf8');
  console.log(`\u2705 TXT saved  : ${base}_extracted.txt\n`);
}

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────
const filePath = process.argv[2] || './resume.pdf';
extractResume(filePath).catch(err => console.error('Error:', err.message));
