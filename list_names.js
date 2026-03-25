const fs = require('fs');

function listAllNames(filePath) {
    const buffer = fs.readFileSync(filePath);
    
    // Simple way to find names in a GLB: look for the JSON chunk
    const jsonBuf = buffer.slice(20, 20 + buffer.readUInt32LE(12));
    const gltf = JSON.parse(jsonBuf.toString());
    
    console.log('--- MESHES ---');
    if (gltf.meshes) {
        gltf.meshes.forEach(m => console.log(m.name));
    }
    
    console.log('\n--- NODES ---');
    if (gltf.nodes) {
        gltf.nodes.forEach(n => console.log(n.name));
    }
}

listAllNames('Cabinet v2.5 con eje.glb');
