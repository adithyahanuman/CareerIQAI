const fs = require('fs');

function replacePinks(filepath) {
    let code = fs.readFileSync(filepath, 'utf8');
    
    const rules = [
        { p: /"#f4a5b099"/g, r: 'COLORS.chart[0] + "99"' },
        { p: /"#f4a5b0"/g, r: 'COLORS.chart[0]' },
        { p: /"#e8607a"/g, r: 'COLORS.chart[1]' },
        { p: /"#ffb3b0"/g, r: 'COLORS.chart[2]' },
        { p: /"#c2185b"/g, r: 'COLORS.chart[3]' },
        { p: /"#ffd7de"/g, r: 'COLORS.chart[4]' },
        { p: /"#e8a0b0"/g, r: 'COLORS.chart[5]' },
        { p: /"#9a6080"/g, r: 'COLORS.chart[6]' },
        
        { p: /'#f4a5b099'/g, r: 'COLORS.chart[0] + "99"' },
        { p: /'#f4a5b0'/g, r: 'COLORS.chart[0]' },
        { p: /'#e8607a'/g, r: 'COLORS.chart[1]' },
        { p: /'#ffb3b0'/g, r: 'COLORS.chart[2]' },
        { p: /'#c2185b'/g, r: 'COLORS.chart[3]' },
        { p: /'#ffd7de'/g, r: 'COLORS.chart[4]' },
        { p: /'#e8a0b0'/g, r: 'COLORS.chart[5]' },
        { p: /'#9a6080'/g, r: 'COLORS.chart[6]' },
    ];
    
    rules.forEach(rule => {
        code = code.replace(rule.p, rule.r);
    });
    
    fs.writeFileSync(filepath, code);
}

replacePinks('./frontend/public/dashboard/dashboard.js');
replacePinks('./frontend/public/dashboard/placementiq.js');
replacePinks('./frontend/public/dashboard/tabs/benchmarking/benchmarking.js');

console.log("Colors updated successfully.");
