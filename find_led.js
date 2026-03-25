const fs = require('fs');

function findBarra(filePath) {
    const buffer = fs.readFileSync(filePath);
    const content = buffer.toString('utf8');
    
    // Find all occurrences of names starting with "Bar" or "led"
    const regex = /"name"\s*:\s*"([^"]*bar[^"]*)"/gi;
    let match;
    const results = new Set();
    while ((match = regex.exec(content)) !== null) {
        results.add(match[1]);
    }
    
    const regex2 = /"name"\s*:\s*"([^"]*led[^"]*)"/gi;
    while ((match = regex2.exec(content)) !== null) {
        results.add(match[1]);
    }

    console.log('Found names:', Array.from(results));
}

findBarra('Cabinet v2.5 con eje.glb');
