const fs = require('fs');

function searchNames(filePath, query1, query2) {
    const buffer = fs.readFileSync(filePath);
    const jsonLen = buffer.readUInt32LE(12);
    const jsonBuf = buffer.slice(20, 20 + jsonLen);
    const gltf = JSON.parse(jsonBuf.toString());
    
    console.log(`Searching for "${query1}" and "${query2}"...`);
    
    if (gltf.nodes) {
        gltf.nodes.forEach((n, i) => {
            if (n.name && (n.name.includes(query1) || n.name.includes(query2))) {
                console.log(`Node [${i}]: ${n.name}`);
            }
        });
    }
    
    if (gltf.meshes) {
        gltf.meshes.forEach((m, i) => {
            if (m.name && (m.name.includes(query1) || m.name.includes(query2))) {
                console.log(`Mesh [${i}]: ${m.name}`);
            }
        });
    }
}

searchNames('Cabinet v2.5 con eje.glb', '37', '41');
