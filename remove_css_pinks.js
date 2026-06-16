const fs = require('fs');
const path = require('path');

function replaceColors(content) {
    const map = [
        // RGB replacements first
        { p: /rgba?\(\s*244\s*,\s*165\s*,\s*176/gi, r: 'rgba(99, 102, 241' }, // f4a5b0
        { p: /rgba?\(\s*194\s*,\s*24\s*,\s*91/gi, r: 'rgba(79, 70, 229' }, // c2185b
        { p: /rgba?\(\s*255\s*,\s*179\s*,\s*176/gi, r: 'rgba(129, 140, 248' }, // ffb3b0
        { p: /rgba?\(\s*255\s*,\s*215\s*,\s*222/gi, r: 'rgba(241, 245, 249' }, // ffd7de
        
        // Hex replacements
        { p: /#c2185b/gi, r: '#4f46e5' }, // Dark Indigo
        { p: /#f4a5b0/gi, r: '#6366f1' }, // Indigo
        { p: /#e8607a/gi, r: '#4f46e5' }, // Dark Indigo
        { p: /#ffb3b0/gi, r: '#e0e7ff' }, // Very light Indigo BG / text
        { p: /#ffd7de/gi, r: '#f1f5f9' }, // Light Gray BG
        { p: /#e8a0b0/gi, r: '#8b5cf6' }, // Purple
        { p: /#9a6080/gi, r: '#64748b' }  // Slate Gray
    ];
    
    let newContent = content;
    map.forEach(rule => {
        newContent = newContent.replace(rule.p, rule.r);
    });
    return newContent;
}

const targetFiles = [
    './frontend/public/dashboard/dashboard.css',
    './frontend/public/dashboard/placementiq.css',
    './frontend/public/dashboard/tabs/benchmarking/benchmarking.css',
    './frontend/public/dashboard/tabs/resume-analysis/resume-analysis.css',
    './frontend/public/dashboard/tabs/career-roadmap/career-roadmap.css', // if it exists
    './frontend/public/dashboard/dashboard.js',
    './frontend/public/dashboard/placementiq.js',
    './frontend/public/dashboard/tabs/benchmarking/benchmarking.js',
    './frontend/public/dashboard/tabs/home/home.html',
    './frontend/public/dashboard.html'
];

targetFiles.forEach(f => {
    try {
        const fullPath = path.resolve(f);
        if (fs.existsSync(fullPath)) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = replaceColors(content);
            if (updated !== content) {
                fs.writeFileSync(fullPath, updated);
                console.log('Updated', f);
            }
        }
    } catch(e) {
        console.error('Error with', f, e.message);
    }
});
