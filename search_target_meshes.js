const THREE = require('three');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
const fs = require('fs');
const { JSDOM } = require('jsdom');

// Mock window and document for GLTFLoader
const dom = new JSDOM();
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

const loader = new GLTFLoader();

const data = fs.readFileSync('Cabinet v2.5 con eje.glb');
const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

loader.parse(arrayBuffer, '', (gltf) => {
    const targetNames = ['Solid1_114', 'Solid1_37', 'Solid1_41'];
    console.log('--- Searching for specific meshes ---');
    gltf.scene.traverse((child) => {
        if (targetNames.includes(child.name)) {
            console.log(`Found: ${child.name} | Type: ${child.type} | Parent: ${child.parent ? child.parent.name : 'None'}`);
        }
        // Also check if they are contained in the name
        targetNames.forEach(tn => {
            if (child.name.includes(tn) && child.name !== tn) {
                console.log(`Partial Match: ${child.name} (contains ${tn}) | Type: ${child.type}`);
            }
        });
    });
}, (err) => {
    console.error(err);
});
