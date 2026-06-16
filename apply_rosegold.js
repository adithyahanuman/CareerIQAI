const fs = require('fs');
const path = require('path');

function replaceColors(content) {
    let newContent = content;
    
    // Hex mappings (Indigo to Vibrant Rose)
    newContent = newContent.replace(/#6366f1/gi, '#f43f5e'); // Indigo 500 -> Rose 500
    newContent = newContent.replace(/#818cf8/gi, '#fb7185'); // Indigo 400 -> Rose 400
    newContent = newContent.replace(/#4f46e5/gi, '#e11d48'); // Indigo 600 -> Rose 600
    newContent = newContent.replace(/#3730a3/gi, '#be123c'); // Indigo 800 -> Rose 700
    newContent = newContent.replace(/#312e81/gi, '#9f1239'); // Indigo 900 -> Rose 800
    newContent = newContent.replace(/#c7d2fe/gi, '#fda4af'); // Indigo 200 -> Rose 300
    
    // RGB mappings
    newContent = newContent.replace(/99,\s*102,\s*241/g, '244, 63, 94');
    newContent = newContent.replace(/79,\s*70,\s*229/g, '225, 29, 72');
    
    return newContent;
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.css') || fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const replaced = replaceColors(content);
            if (content !== replaced) {
                fs.writeFileSync(fullPath, replaced, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

walk(path.join(__dirname, 'frontend', 'public', 'dashboard'));
walk(path.join(__dirname, 'frontend', 'public', 'auth'));
