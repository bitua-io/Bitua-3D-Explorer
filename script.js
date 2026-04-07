import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import gsap from 'gsap';
import { translations } from './i18n.js';

// --- I18n Engine ---
let currentLang = localStorage.getItem('bitua-lang') || 'es';

function updateUI() {
    try {
        const t = translations[currentLang];
        if (!t) {
            console.error(`❌ Translation for ${currentLang} not found.`);
            return;
        }
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = t[key];
                } else {
                    el.innerHTML = t[key];
                }
            }
        });
        const langLabel = document.getElementById('lang-label');
        if (langLabel) langLabel.textContent = currentLang.toUpperCase();
        
        // Update page title if needed
        if (t.title) document.title = t.title;
    } catch (e) {
        console.error("❌ Error in updateUI:", e);
    }
}

// Initial UI update is handled after dev check

// Language Selector Logic
window.addEventListener('load', () => {
    const langSelector = document.querySelector('.lang-selector');
    langSelector.addEventListener('click', () => {
        currentLang = currentLang === 'es' ? 'en' : 'es';
        localStorage.setItem('bitua-lang', currentLang);
        updateUI();
        console.log(`🌐 Language switched to: ${currentLang}`);
    });
});

// Initialize RectAreaLight support
RectAreaLightUniformsLib.init();
console.log("🚀 Bitua 3D Explorer - Multilingüe V2.2 script started");

// --- Dev Mode Check ---
const urlParams = new URLSearchParams(window.location.search);
const isDev = urlParams.get('dev') === 'true';

// Hide production-unfriendly elements
if (!isDev) {
    const sidebar = document.getElementById('sidebar');
    const debugHint = document.getElementById('debug-toggle-hint');
    const infoContent = document.getElementById('info-content');
    if (sidebar) sidebar.style.display = 'none';
    if (debugHint) debugHint.style.display = 'none';
    if (infoContent) infoContent.setAttribute('data-i18n', 'infoHintProd');
}

// Initial UI Update
updateUI();

// --- Setup ---
const canvas = document.querySelector('#three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
let internalLight = null;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f5f7);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 1.5, 5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 60);
spotLight.position.set(5, 5, 5);
spotLight.castShadow = true;
scene.add(spotLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
fillLight.position.set(-5, 2, -5);
scene.add(fillLight);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
const envScene = new THREE.Scene();

const envLight1 = new THREE.PointLight(0xffffff, 100);
envLight1.position.set(5, 10, 5);
envScene.add(envLight1);

const envLight2 = new THREE.PointLight(0xffffff, 80);
envLight2.position.set(-5, 5, -5);
envScene.add(envLight2);

const envLight3 = new THREE.RectAreaLight(0xffffff, 50, 10, 10);
envLight3.position.set(0, 10, 0);
envLight3.lookAt(0, 0, 0);
envScene.add(envLight3);

const renderTarget = pmremGenerator.fromScene(envScene);
scene.environment = renderTarget.texture;

// --- Model Management ---
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
loader.setDRACOLoader(dracoLoader);

// --- Texture Loading ---
const textureLoader = new THREE.TextureLoader();
const standbyTexture = textureLoader.load('GUI_Standby.png');
standbyTexture.colorSpace = THREE.SRGBColorSpace;
standbyTexture.flipY = false;

let model = null;
let isDoorOpen = false;
let hingePivot = null;
let centerOffset = null;

const DOOR_OPEN_ANGLE = -(Math.PI * 120) / 180;

function setupShadows(m) {
    m.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            if (child.geometry) {
                child.geometry.computeVertexNormals();
            }
            
            if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => {
                    mat.flatShading = false;
                    mat.needsUpdate = true;
                });
            }
        }
    });
}

const polycarbonateMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x4caf50,
    transmission: 0.95,
    opacity: 1,
    thickness: 0.05,
    roughness: 0.1,
    metalness: 0,
    ior: 1.58,
    depthWrite: true,
    envMapIntensity: 2.5,
    side: THREE.DoubleSide,
    flatShading: false
});

const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 1.0,
    opacity: 1,
    thickness: 0.02,
    roughness: 0,
    metalness: 0,
    ior: 1.5,
    depthWrite: true,
    envMapIntensity: 3.0,
    side: THREE.DoubleSide,
    flatShading: false
});

const acrylicMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.0,
    transparent: false,
    envMapIntensity: 0.8,
    side: THREE.DoubleSide,
    flatShading: false
});

const aluminumMaterial = new THREE.MeshStandardMaterial({
    color: 0xe5e5e5,
    metalness: 1.0,
    roughness: 0.4,
    envMapIntensity: 1.5,
    flatShading: false
});

function setupGlassMaterials(m) {
    const acrylicTargetNames = [
        'A INTERIOR SEPARADOR IZQUIERDO:1',
        'A INTERIOR SEPARADOR ATRAS:1',
        'A INTERIOR SEPARADOR:1',
        'V2.5 A INTERIOR SEPARADOR SUPERIOR:1',
        'V2.5 A TAPA DE REGISTRO INFERIOR:1'
    ];

    try {
        let consoleMaterial = null;
        const meshToUpdate = [];

        m.traverse((child) => {
            if (!child.isMesh) return;
            
            const meshName = child.name || "UNNAMED";
            const parentName = (child.parent && child.parent.name) ? child.parent.name : "";
            
            // Note: Normalization for matching avoids names needing exact symbols
            // BUT we should be consistent with the original logic
            const normMesh = meshName.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const normParent = parentName.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const combinedNorm = normMesh + "_" + normParent;

            // Updated screen detection to handle the "includes" correctly
            const isScreen = normMesh.includes('SOLID161') || combinedNorm.includes('PANTALLANUEVA');
            
            if (isScreen) {
                const geo = child.geometry;
                const positions = geo.attributes.position;
                const bbox = new THREE.Box3().setFromBufferAttribute(positions);
                const size = new THREE.Vector3();
                bbox.getSize(size);
                
                const dims = [
                    { axis: 'x', size: size.x },
                    { axis: 'y', size: size.y },
                    { axis: 'z', size: size.z }
                ].sort((a, b) => b.size - a.size);
                
                const uAxis = dims[0].axis;
                const vAxis = dims[1].axis;
                const uvArr = new Float32Array(positions.count * 2);
                
                for (let i = 0; i < positions.count; i++) {
                    const coords = { x: positions.getX(i), y: positions.getY(i), z: positions.getZ(i) };
                    const u0 = (coords[uAxis] - bbox.min[uAxis]) / Math.max(size[uAxis], 0.001);
                    const v0 = (coords[vAxis] - bbox.min[vAxis]) / Math.max(size[vAxis], 0.001);
                    uvArr[i * 2]     = 1 - v0;
                    uvArr[i * 2 + 1] = 1 - u0;
                }
                geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
                child.material = new THREE.MeshBasicMaterial({ map: standbyTexture, side: THREE.DoubleSide });
                console.log(`📺 Screen textured: ${meshName}`);
            }

            if (combinedNorm.includes('LADODERECHOCONSOLA')) consoleMaterial = child.material;
            if (combinedNorm.includes('SOPORTELECTORBIOMETRICO')) meshToUpdate.push(child);

            const isDoor = combinedNorm.includes('V251PPPVIDRIO') || (combinedNorm.includes('PUERTA') && combinedNorm.includes('VIDRIO')) || (combinedNorm.includes('GLASS') && combinedNorm.includes('DOOR'));
            
            if (isDoor) {
                child.visible = false;
                console.log(`👻 Hiding CAD door: ${meshName}`);
            } else if (combinedNorm.includes('SOPORTE')) {
                child.material = acrylicMaterial;
            } else if (combinedNorm.includes('BANDEJA') && (combinedNorm.includes('VIDRIO') || combinedNorm.includes('GLASS'))) {
                child.material = glassMaterial;
            } else if (combinedNorm.includes('BANDEJA')) {
                child.material = polycarbonateMaterial;
            } else if (combinedNorm.includes('VIDRIO') || combinedNorm.includes('GLASS')) {
                if (child.visible) child.material = glassMaterial;
            } else if (combinedNorm.includes('SEPARADOR') || acrylicTargetNames.includes(parentName.trim()) || acrylicTargetNames.includes(meshName.trim())) {
                child.material = acrylicMaterial;
            } else if (combinedNorm.includes('CILINDRO') || combinedNorm.includes('CERRADURA') || normMesh.includes('SOLID1102')) {
                child.material = aluminumMaterial;
            }
        });

        if (consoleMaterial && meshToUpdate.length > 0) {
            meshToUpdate.forEach(mesh => mesh.material = consoleMaterial);
        }
    } catch (error) {
        console.error("❌ Critical error in setupGlassMaterials:", error);
    }
}

function setupLEDBarLighting(m) {
    let ledBarMesh = null;
    const isLEDBar = (name) => {
        if (!name) return false;
        const normalized = name.toLowerCase().replace(/\s+/g, '');
        return normalized.includes('barraled') || (normalized.includes('barra') && normalized.includes('led'));
    };

    m.traverse((child) => {
        if (isLEDBar(child.name)) {
            if (child.isMesh) ledBarMesh = child;
            else if (child.children.length > 0) {
                child.traverse((subChild) => { if (subChild.isMesh && !ledBarMesh) ledBarMesh = subChild; });
            }
        }
    });

    if (ledBarMesh) {
        ledBarMesh.material = new THREE.MeshStandardMaterial({
            color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 10,
            metalness: 0.1, roughness: 0.1, flatShading: false
        });
        const box = new THREE.Box3().setFromObject(ledBarMesh);
        const size = new THREE.Vector3(); box.getSize(size);
        const width = Math.max(size.x, 0.05); const height = Math.max(size.z, 0.05);
        const center = new THREE.Vector3(); box.getCenter(center);
        const localPos = center.clone().sub(m.position);

        const rectLight = new THREE.RectAreaLight(0xffffff, 5, width, height);
        rectLight.position.set(localPos.x, localPos.y - 0.02, localPos.z);
        rectLight.rotation.x = -Math.PI / 2;
        m.add(rectLight);

        const pointLight = new THREE.PointLight(0xffffff, 3, 5);
        pointLight.position.set(localPos.x, localPos.y - 0.05, localPos.z);
        m.add(pointLight);
    }
}

function setupHingePivot() {
    const hingeAssemblies = [];
    const doorNodes = [];
    let ejeRotacionNode = null;
    let leftPanelNode = null;

    model.traverse((child) => {
        if (!child.name) return;
        if (child.name.includes('BISAGRA')) {
            if (child.parent && !child.parent.name.includes('BISAGRA')) hingeAssemblies.push(child);
        }
        const normChildDoor = child.name.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const parentNameUpper = (child.parent && child.parent.name) ? child.parent.name.toUpperCase() : '';
        if (child.name === 'V251_PPP_PUERTA1' || (normChildDoor.includes('PUERTA') && !parentNameUpper.includes('PUERTA'))) doorNodes.push(child);
        if (child.name.toLowerCase().includes('eje') && child.name.toLowerCase().includes('rotaci')) ejeRotacionNode = child;
        else if (child.name.includes('Eje') && child.name.includes('rotaci')) ejeRotacionNode = child;
        if (child.name.toUpperCase().includes('PANEL IZQUIERDO')) leftPanelNode = child;
    });

    if (hingeAssemblies.length === 0 && doorNodes.length === 0 && !ejeRotacionNode) return;

    const hingeNodes = [];
    hingeAssemblies.forEach(assembly => {
        const allMeshes = [];
        assembly.traverse((child) => { if (child.isMesh) allMeshes.push(child); });
        if (allMeshes.length > 0) {
            let minX = Infinity; let maxX = -Infinity;
            const centers = new Map();
            allMeshes.forEach(mesh => {
                const box = new THREE.Box3().setFromObject(mesh);
                const c = new THREE.Vector3(); box.getCenter(c);
                centers.set(mesh, c);
                if (c.x < minX) minX = c.x; if (c.x > maxX) maxX = c.x;
            });
            const thresholdX = (minX + Math.max(minX + 0.001, maxX)) / 2;
            allMeshes.forEach(mesh => { if (centers.get(mesh).x > thresholdX) hingeNodes.push(mesh); });
        } else hingeNodes.push(assembly);
    });

    let pivotWorldPos = new THREE.Vector3();
    if (ejeRotacionNode) {
        new THREE.Box3().setFromObject(ejeRotacionNode).getCenter(pivotWorldPos);
        ejeRotacionNode.visible = false;
    } else if (hingeNodes.length > 0) {
        hingeNodes.forEach(h => { const wp = new THREE.Vector3(); h.getWorldPosition(wp); pivotWorldPos.add(wp); });
        pivotWorldPos.divideScalar(hingeNodes.length);
    } else {
        const box = new THREE.Box3().setFromObject(doorNodes[0]);
        pivotWorldPos.set(box.min.x, (box.min.y + box.max.y) / 2, box.min.z);
    }
    pivotWorldPos.y = 0;

    hingePivot = new THREE.Group();
    hingePivot.name = 'HingePivot';
    hingePivot.position.copy(pivotWorldPos);
    model.add(hingePivot);

    const nodesToReparent = [...doorNodes, ...hingeNodes];
    nodesToReparent.forEach(node => {
        const wp = new THREE.Vector3(); const wq = new THREE.Quaternion(); const ws = new THREE.Vector3();
        node.getWorldPosition(wp); node.getWorldQuaternion(wq); node.getWorldScale(ws);
        if (node.parent) node.parent.remove(node);
        hingePivot.add(node);
        const pivotWM = new THREE.Matrix4(); hingePivot.updateWorldMatrix(true, false);
        pivotWM.copy(hingePivot.matrixWorld).invert();
        const newWM = new THREE.Matrix4().compose(wp, wq, ws);
        const newLM = pivotWM.multiply(newWM);
        const np = new THREE.Vector3(); const nq = new THREE.Quaternion(); const ns = new THREE.Vector3();
        newLM.decompose(np, nq, ns);
        node.position.copy(np); node.quaternion.copy(nq); node.scale.copy(ns);
    });
}

// Load Model
loader.load('V2.5.1 AAA ENSAMBLE CABINET MAIN 3D visualizer.glb', (gltf) => {
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    centerOffset = box.getCenter(new THREE.Vector3());
    model.position.sub(centerOffset);
    setupShadows(model); setupGlassMaterials(model); setupLEDBarLighting(model);
    scene.add(model); setupHingePivot();
    document.getElementById('progress').style.width = '100%';
    document.getElementById('loader').style.opacity = '0';
    setTimeout(() => document.getElementById('loader').style.display = 'none', 500);
}, (progress) => {
    if (progress.total > 0) document.getElementById('progress').style.width = (progress.loaded / progress.total * 100) + '%';
}, (error) => console.error(error));

// --- Interaction ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredMesh = null;
let currentLockTarget = null;

function isInteractiveMesh(object) {
    if (!object) return false;
    let combinedNorm = object.name.toUpperCase();
    object.traverseAncestors(a => { if (a.name) combinedNorm += " " + a.name.toUpperCase(); });
    if (combinedNorm.includes('CILINDRO') || combinedNorm.includes('CERRADURA') || combinedNorm.includes('SOLID1_70')) return true;
    if (combinedNorm.includes('SOLID1_82') || combinedNorm.includes('SOLID1_37') || combinedNorm.includes('SOLID1_41') ||
        combinedNorm.includes('SOLID1_40') || combinedNorm.includes('SOLID1_39') ||
        combinedNorm.includes('HUELLERO') || combinedNorm.includes('LECTOR') || combinedNorm.includes('BIOMETRICO')) return true;
    if (combinedNorm.includes('SOLID1_71')) return true;
    if (combinedNorm.includes('MESHFEATURE1') || combinedNorm.includes('SOLID1_73')) return true;
    if (combinedNorm.includes('SOLID1_81') || combinedNorm.includes('SOLID1_43') || combinedNorm.includes('PANTALLANUEVA')) return true;
    let isDoor = false;
    object.traverseAncestors((ancestor) => {
        if (ancestor.name && (ancestor.name.includes('PUERTA') || ancestor.name.includes('BISAGRA') || ancestor.name === 'HingePivot')) isDoor = true;
    });
    return isDoor;
}

function applyHoverGlow(mesh) {
    if (!mesh.userData.glowCloned) {
        const origMat = mesh.material;
        mesh.material = origMat.clone();
        mesh.userData.origEmissive = mesh.material.emissive ? mesh.material.emissive.getHex() : 0x000000;
        mesh.userData.origEmissiveIntensity = mesh.material.emissiveIntensity || 0;
        mesh.userData.glowCloned = true;
    }
    if (mesh.material.emissive) {
        mesh.material.emissive.setHex(0x88bbff);
        mesh.material.emissiveIntensity = 0.22;
    }
}

function removeHoverGlow(mesh) {
    if (!mesh || !mesh.userData.glowCloned) return;
    if (mesh.material.emissive) {
        mesh.material.emissive.setHex(mesh.userData.origEmissive);
        mesh.material.emissiveIntensity = mesh.userData.origEmissiveIntensity;
    }
}

function zoomToLock() {
    smoothCameraTransition(new THREE.Vector3(0.8528, 0.087, 1.0604), new THREE.Vector3(0.4028, -0.063, 0.3104));
}
function zoomToBiometric() {
    smoothCameraTransition(new THREE.Vector3(0.048, 0.720, 4.001), new THREE.Vector3(-0.033, -0.279, 0.108));
}
function zoomToCamera() {
    smoothCameraTransition(new THREE.Vector3(1.333, 0.388, 1.915), new THREE.Vector3(0.094, 0.287, 0.417));
}

function showAnnotation(target, contentHTML) {
    currentLockTarget = target;
    const annotation = document.getElementById('lock-annotation');
    annotation.innerHTML = contentHTML;
    annotation.style.display = 'block';
    document.getElementById('leader-line').style.display = 'block';
    updateAnnotationPosition();
}

function hideAnnotation() {
    currentLockTarget = null;
    document.getElementById('lock-annotation').style.display = 'none';
    document.getElementById('leader-line').style.display = 'none';
}

function updateAnnotationPosition() {
    if (!currentLockTarget) return;
    const wp = new THREE.Vector3(); currentLockTarget.getWorldPosition(wp);
    const vector = wp.clone().project(camera);
    const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (1 - (vector.y * 0.5 + 0.5)) * canvas.clientHeight;
    const annotation = document.getElementById('lock-annotation');
    const bx = x + 100; const by = y - 50;
    annotation.style.left = `${bx}px`; annotation.style.top = `${by}px`;
    const br = annotation.getBoundingClientRect();
    const sx = bx; const sy = by + br.height / 2;
    document.getElementById('line-path').setAttribute('d', `M ${sx} ${sy} L ${x} ${y}`);
}

window.addEventListener('click', (event) => {
    if (event.target.closest('#sidebar') || event.target.closest('#camera-debug') || event.target.closest('.lang-selector')) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const object = intersects[0].object;
        console.log('📦 Clicked Part:', {
            name: object.name,
            parent: object.parent ? object.parent.name : 'root',
            object: object
        });
        const t = translations[currentLang];
        let combinedName = object.name.toUpperCase();
        object.traverseAncestors(a => { if (a.name) combinedName += " " + a.name.toUpperCase(); });

        let isDoorClick = false;
        object.traverseAncestors((ancestor) => {
            if (ancestor.name && (ancestor.name.includes('PUERTA') || ancestor.name.includes('BISAGRA') || ancestor.name === 'HingePivot')) isDoorClick = true;
        });

        if (combinedName.includes('CILINDRO') || combinedName.includes('CERRADURA') || combinedName.includes('SOLID1_70')) {
            zoomToLock();
            showAnnotation(object, `<strong>${t.lockTitle}</strong><br>${t.lockBody}`);
        } else if (combinedName.includes('SOLID1_82') || combinedName.includes('SOLID1_37') || combinedName.includes('SOLID1_41') || combinedName.includes('SOLID1_40') || combinedName.includes('SOLID1_39') || combinedName.includes('HUELLERO') || combinedName.includes('LECTOR') || combinedName.includes('BIOMETRICO')) {
            zoomToBiometric();
            showAnnotation(object, `<strong>${t.bioTitle}</strong><br><div style="margin-top: 5px; font-size: 14px; font-weight: 400; line-height: 1.4;">${t.bioSubtitle}<br><strong>${t.bioUser.split(':')[0]}:</strong> ${t.bioUser.split(':')[1]} <br><strong>${t.bioOp.split(':')[0]}:</strong> ${t.bioOp.split(':')[1]}</div>`);
            if (!isDoorOpen) toggleDoor();
        } else if (combinedName.includes('SOLID1_71')) {
            zoomToBiometric();
            showAnnotation(object, `<strong>${t.faceTitle}</strong><br>${t.faceBody}`);
        } else if (combinedName.includes('MESHFEATURE1') || combinedName.includes('SOLID1_73')) {
            zoomToCamera();
            showAnnotation(object, `<strong>${t.camTitle}</strong><br>${t.camBody}`);
        } else if (combinedName.includes('SOLID1_81')) {
            smoothCameraTransition(new THREE.Vector3(0.3826, 0.3248, 0.657), new THREE.Vector3(0.3328, 0.2782, 0.121));
            showAnnotation(object, `<strong>${t.screenTitle}</strong><br>${t.screenBody}`);
        } else if (combinedName.includes('SOLID1_43') || combinedName.includes('PANTALLANUEVA')) {
            smoothCameraTransition(new THREE.Vector3(0.4489, 0.328, 0.6403), new THREE.Vector3(0.4363, 0.3089, 0.4923));
            showAnnotation(object, `<strong>${t.homeScreenTitle}</strong><br>${t.homeScreenBody}`);
        } else if (object.name.includes('PUERTA') || object.name.includes('BISAGRA') || isDoorClick) {
            toggleDoor(); hideAnnotation();
        } else {
            hideAnnotation();
        }
    } else {
        hideAnnotation();
    }
});

window.addEventListener('mousemove', (event) => {
    if (!model || event.target.closest('#sidebar') || event.target.closest('.lang-selector')) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    const hit = intersects.length > 0 ? intersects[0].object : null;
    const interactive = hit && isInteractiveMesh(hit) ? hit : null;
    if (interactive !== hoveredMesh) {
        if (hoveredMesh) removeHoverGlow(hoveredMesh);
        if (interactive) applyHoverGlow(interactive);
        hoveredMesh = interactive;
        canvas.style.cursor = interactive ? 'pointer' : 'default';
    }
});

function smoothCameraTransition(newPos, newTarget, duration = 1.5) {
    gsap.to(camera.position, { x: newPos.x, y: newPos.y, z: newPos.z, duration, ease: "power2.inOut", overwrite: "auto" });
    gsap.to(controls.target, { x: newTarget.x, y: newTarget.y, z: newTarget.z, duration, ease: "power2.inOut", overwrite: "auto", onUpdate: () => camera.lookAt(controls.target) });
}

function toggleDoor() {
    if (!hingePivot) return;
    isDoorOpen = !isDoorOpen;
    gsap.to(hingePivot.rotation, { y: isDoorOpen ? DOOR_OPEN_ANGLE : 0, duration: 1.2, ease: "power2.inOut" });
}

// --- UI Logic ---
document.getElementById('sidebar-header').addEventListener('click', () => {
    const sb = document.getElementById('sidebar');
    sb.classList.toggle('collapsed');
    document.getElementById('sidebar-toggle-icon').textContent = sb.classList.contains('collapsed') ? '📦' : '✕';
});

document.getElementById('btn-home').addEventListener('click', (e) => {
    e.stopPropagation();
    smoothCameraTransition(new THREE.Vector3(3, 1.5, 5), new THREE.Vector3(0, 0, 0));
});

// --- Simulator Logic ---
let simBoxes = [];
const INTERIOR_SIZE = { x: 0.8, y: 1.6, z: 0.5 };
const INTERIOR_OFFSET = { x: 0, y: 0.5, z: 0 };

document.getElementById('btn-simulate').addEventListener('click', () => {
    simBoxes.forEach(box => scene.remove(box)); simBoxes = [];
    const pw = parseFloat(document.getElementById('prod-w').value) / 100;
    const ph = parseFloat(document.getElementById('prod-h').value) / 100;
    const pd = parseFloat(document.getElementById('prod-d').value) / 100;
    if (isNaN(pw) || isNaN(ph) || isNaN(pd) || pw <= 0) return;
    const gap = 0.005;
    const nx = Math.floor(INTERIOR_SIZE.x / (pw + gap));
    const ny = Math.floor(INTERIOR_SIZE.y / (ph + gap));
    const nz = Math.floor(INTERIOR_SIZE.z / (pd + gap));
    const total = nx * ny * nz;
    document.getElementById('result-panel').style.display = 'block';
    document.getElementById('result-count').innerText = total;

    const visualLimit = Math.min(total, 500);
    const boxGeo = new THREE.BoxGeometry(pw, ph, pd);
    const boxMat = new THREE.MeshPhongMaterial({ color: 0x007aff, transparent: true, opacity: 0.7, shininess: 50 });
    let spawned = 0;
    for (let z = 0; z < nz && spawned < visualLimit; z++) {
        for (let y = 0; y < ny && spawned < visualLimit; y++) {
            for (let x = 0; x < nx && spawned < visualLimit; x++) {
                const m = new THREE.Mesh(boxGeo, boxMat);
                m.position.set((x * (pw + gap)) - (INTERIOR_SIZE.x / 2) + (pw / 2), (y * (ph + gap)) - (INTERIOR_SIZE.y / 2) + (ph / 2) + INTERIOR_OFFSET.y, (z * (pd + gap)) - (INTERIOR_SIZE.z / 2) + (pd / 2));
                scene.add(m); simBoxes.push(m); spawned++;
            }
        }
    }
    if (simBoxes.length > 0) gsap.from(simBoxes.map(b => b.scale), { x: 0, y: 0, z: 0, duration: 0.5, stagger: 0.01, ease: "back.out(1.7)" });
    if (!isDoorOpen) toggleDoor();
});

// --- Debug Logic ---
if (isDev) {
    const debugOverlay = document.getElementById('camera-debug');
    const camPosEl = document.getElementById('cam-pos');
    const camTgtEl = document.getElementById('cam-tgt');
    let debugEnabled = false;
    debugOverlay.style.display = 'none';

    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'd') {
            debugEnabled = !debugEnabled;
            debugOverlay.style.display = debugEnabled ? 'block' : 'none';
        }
    });

    document.getElementById('btn-copy-debug').addEventListener('click', () => {
        const p = camera.position; const t = controls.target;
        const text = `POS: ${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}\nTGT: ${t.x.toFixed(3)}, ${t.y.toFixed(3)}, ${t.z.toFixed(3)}`;
        navigator.clipboard.writeText(text);
    });
}

// --- Render Loop ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    updateAnnotationPosition();
    if (document.getElementById('camera-debug').style.display !== 'none') {
        const p = camera.position; const t = controls.target;
        document.getElementById('cam-pos').textContent = `${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}`;
        document.getElementById('cam-tgt').textContent = `${t.x.toFixed(3)}, ${t.y.toFixed(3)}, ${t.z.toFixed(3)}`;
    }
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
