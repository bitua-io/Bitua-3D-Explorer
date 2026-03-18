const fs = require('fs');

function checkIndices(filePath) {
    const buffer = fs.readFileSync(filePath);
    const jsonLen = buffer.readUInt32LE(12);
    const jsonBuf = buffer.slice(20, 20 + jsonLen);
    const gltf = JSON.parse(jsonBuf.toString());
    
    [37, 41].forEach(idx => {
        console.log(`Node [${idx}]:`, gltf.nodes[idx] ? gltf.nodes[idx].name : 'OUT OF RANGE');
        if (gltf.nodes[idx] && gltf.nodes[idx].mesh !== undefined) {
            const meshIdx = gltf.nodes[idx].mesh;
            console.log(`  Mesh [${meshIdx}]:`, gltf.meshes[meshIdx].name);
        }
    });

    [37, 41].forEach(idx => {
        console.log(`Mesh [${idx}]:`, gltf.meshes[idx] ? gltf.meshes[idx].name : 'OUT OF RANGE');
    });
}

checkIndices('Cabinet v2.5 con eje.glb');
