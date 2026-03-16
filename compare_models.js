import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import { Blob } from 'buffer';

// Simulating a browser environment for Three.js in Node
global.Blob = Blob;

async function inspectModels() {
    const loader = new GLTFLoader();
    
    const file1 = 'd:/Bitua-3D-Explorer/Bita-3D-Explorer/V2.5.1 AAA ENSAMBLE CABINET MAIN REVIT puerta cerrada.glb';
    const file2 = 'd:/Bitua-3D-Explorer/Bita-3D-Explorer/V2.5.1 AAA ENSAMBLE CABINET MAIN REVIT puerta abierta.glb';

    console.log('--- Model Comparison ---');
    
    // Note: In Node we can't easily load GLB directly with GLTFLoader without more setup
    // I will use a simple script in the browser console instructions instead if this is too complex for Node.
    // However, I can just use Three.js in the browser directly.
}

console.log('Inspector script ready. Actually, I can just update index.html to log these comparisons.');
