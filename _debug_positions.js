const fs = require('fs');
const { PdfReader } = require('pdfreader');

const buffer = fs.readFileSync('./resume.pdf');
const rows = {};

new PdfReader().parseBuffer(buffer, (err, item) => {
  if (!item) {
    // Print rows sorted by y
    const sortedYs = Object.keys(rows).map(Number).sort((a,b) => a - b);
    sortedYs.forEach(y => {
      const items = rows[y].sort((a,b) => a.x - b.x);
      const parts = items.map(it => `[x=${it.x.toFixed(1)} w=${it.w.toFixed(1)}] "${it.text}"`);
      console.log(`y=${y.toFixed(2)}:  ${parts.join('   ')}`);
    });
    return;
  }
  if (item.text && item.x !== undefined && item.y !== undefined) {
    const yKey = Math.round(item.y * 4) / 4; // round to 0.25cm
    if (!rows[yKey]) rows[yKey] = [];
    rows[yKey].push({ text: item.text, x: item.x, w: item.w || 0, y: item.y });
  }
});
