import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import fs from 'fs';

// To run this in node, I need to do something simpler since I don't have a DOM.
// Actually, let's just use `parse` from gltf-pipeline or just regular expression on the JSON string.
// I will just read the GLB JSON header.
