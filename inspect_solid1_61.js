const fs = require('fs');

function inspectMesh(filePath, query) {
    const buffer = fs.readFileSync(filePath);
    const jsonLen = buffer.readUInt32LE(12);
    const jsonBuf = buffer.slice(20, 20 + jsonLen);
    const gltf = JSON.parse(jsonBuf.toString());
    
    console.log(`Inspecting mesh named "${query}"...`);
    
    let targetMesh = null;
    let targetNode = null;

    if (gltf.nodes) {
        gltf.nodes.forEach((n, i) => {
            if (n.name && n.name.toUpperCase().includes(query.toUpperCase())) {
                console.log(`Node [${i}]: ${n.name}`);
                targetNode = n;
                if (n.mesh !== undefined) {
                    targetMesh = gltf.meshes[n.mesh];
                    console.log(`  Linked Mesh: ${targetMesh.name || 'unnamed'}`);
                }
            }
        });
    }

    if (!targetMesh && gltf.meshes) {
        gltf.meshes.forEach((m, i) => {
            if (m.name && m.name.toUpperCase().includes(query.toUpperCase())) {
                console.log(`Mesh [${i}]: ${m.name}`);
                targetMesh = m;
            }
        });
    }

    if (targetMesh) {
        console.log('\nMesh Details:');
        targetMesh.primitives.forEach((p, i) => {
            console.log(`  Primitive [${i}]:`);
            console.log(`    Attributes: ${Object.keys(p.attributes).join(', ')}`);
            if (p.material !== undefined) {
                const mat = gltf.materials[p.material];
                console.log(`    Material: ${mat.name || 'unnamed'}`);
            }
        });
    } else {
        console.log('Target mesh not found.');
    }
}

inspectMesh('Cabinet v2.5 con eje.glb', 'Solid1_61');
