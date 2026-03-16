const fs = require('fs');

try {
    const data = fs.readFileSync('Cabinet v2.5 con eje.glb').toString('binary');
    const names = new Set();
    
    // Find json part
    const jsonStart = data.indexOf('{"');
    if (jsonStart > -1) {
        let jsonEnd = data.indexOf('BIN\x00');
        if (jsonEnd === -1) {
             jsonEnd = data.indexOf('BIN');
        }
        let jsonStr;
        if (jsonEnd > -1) {
             // 8 bytes chunk header before BIN
             jsonStr = data.slice(jsonStart, jsonEnd - 8);
        } else {
             jsonStr = data.slice(jsonStart, Math.min(jsonStart + 1000000, data.length));
        }
        
        try {
            const parsed = JSON.parse(jsonStr);
            const nodes = parsed.nodes || [];
            nodes.forEach(n => {
                if (n.name && n.name.toUpperCase().includes('BISAGRA')) {
                    names.add(n.name);
                } else if (n.name && (n.name.toUpperCase().includes('FIJA') || n.name.toUpperCase().includes('MOVIL') || n.name.toUpperCase().includes('PANEL'))) {
                    names.add(n.name);
                }
            });
            console.log("JSON Parse successful.");
            console.log([...names].sort());
        } catch (e) {
            console.log("Failed parsing JSON:", e.message);
            // fallback
            const parts = data.split('"name":"');
            for (let i = 1; i < parts.length; i++) {
                const name = parts[i].split('"')[0];
                if (name.toUpperCase().includes('BISAGRA') || name.toUpperCase().includes('FIJA') || name.toUpperCase().includes('MOVIL') || name.toUpperCase().includes('PANEL')) {
                     names.add(name);
                }
            }
            console.log("Fallback extraction:");
            console.log([...names].sort());
        }
    }
} catch(e) {
    console.error(e);
}
