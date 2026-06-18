/**
 * CareerIQ AI — Browser-Based PDF Resume Extractor
 * 
 * Uses pdf.js to extract text while maintaining advanced multi-column detection.
 */

const ResumeExtractor = (function() {
  // ─── CONSTANTS ────────────────────────────────────────────────────────────────
  
  // pdf.js coordinates are in points. A typical line height is ~12-16 points.
  const LINE_Y_TOLERANCE = 4.0;
  
  // Gap between x-positions that indicates a column boundary (in points)
  // ~50 points is roughly a 0.7 inch gap.
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

  // ─── UTILS ──────────────────────────────────────────────────────────────────

  async function getRawItems(fileArrayBuffer) {
    // Ensure pdf.js is loaded
    if (typeof pdfjsLib === 'undefined') {
      throw new Error("pdfjsLib is not loaded. Please include pdf.js before running extraction.");
    }
    
    // Always set worker src to ensure CDN worker is used
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const loadingTask = pdfjsLib.getDocument({ 
      data: fileArrayBuffer,
      standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true
    });
    const pdf = await loadingTask.promise;
    const pages = {};

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      pages[pageNum] = [];
      
      for (const item of textContent.items) {
        if (item.str.trim() !== '') {
          // item.transform is [scaleX, skewY, skewX, scaleY, translateX, translateY]
          pages[pageNum].push({
            text: item.str,
            x: parseFloat(item.transform[4].toFixed(3)),
            // Invert Y because pdf.js coordinates originate from bottom-left
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
          if (b !== null && Math.abs(b - boundary) < 20) { // 20 points ~ 0.25 inch tolerance for boundary
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

  function buildSingleColumnLines(items) {
    if (!items || items.length === 0) return [];
    const rows = groupIntoRows(items);
    return rows.map(row =>
      row.map(it => it.text.trim()).filter(Boolean).join(' ')
    ).filter(Boolean);
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

  // ─── PUBLIC API ─────────────────────────────────────────────────────────────
  
  return {
    /**
     * Extracts structured text from a PDF File object using advanced column detection.
     * @param {File} file - The uploaded PDF file
     * @returns {Promise<{raw_text: string, sections: object}>}
     */
    extractFromFile: async function(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;
            const pages = await getRawItems(arrayBuffer);
            
            let allLines = [];
            Object.values(pages).forEach(pageItems => {
              const lines = buildLinesColumnAware(pageItems);
              allLines = allLines.concat(lines);
            });

            // Remove page number lines
            allLines = allLines.filter(l => !/^Page\s*[-\u2013]\s*\d+\/\d+$/i.test(l));

            const sections = splitIntoSections(allLines);
            const rawText = allLines.filter(l => l.trim()).join('\n');
            
            resolve({ raw_text: rawText, sections: sections });
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
      });
    }
  };
})();

window.ResumeExtractor = ResumeExtractor;
