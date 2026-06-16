const fs = require('fs');
const path = require('path');

function replaceColors(content) {
    let newContent = content;
    
    // Replace light pink RGB with light indigo RGB
    newContent = newContent.replace(/244,\s*165,\s*176/g, '99, 102, 241');
    
    // Replace deep pink RGB with deep indigo RGB
    newContent = newContent.replace(/194,\s*24,\s*91/g, '79, 70, 229');
    
    // Replace hardcoded pink hex codes with vibrant red where they are used for errors/warnings/badges
    newContent = newContent.replace(/#ffb3b0/gi, '#ef4444');
    newContent = newContent.replace(/#f4a5b0/gi, '#6366f1');
    newContent = newContent.replace(/#c2185b/gi, '#4f46e5');
    
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
