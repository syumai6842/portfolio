import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 基本要素の取得
const canvas = document.getElementById('c');

// Three.jsの基本設定
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 200);
camera.position.set(0.6, 1.3, 2.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.05, 0);
controls.enableDamping = true;

// ライト設定
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(2, 4, 3);
key.castShadow = false;
scene.add(key);

// 地面
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(2.2, 64),
  new THREE.MeshStandardMaterial({ color: 0x0f141a, roughness: 0.95, metalness: 0.0 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = false;
ground.castShadow = false;
scene.add(ground);

// フォグ
scene.fog = new THREE.Fog(0x05070a, 3.5, 12);

// グローバル状態
let currentModel = null;
let currentPivot = null;
let mixer = null;
let activeAction = null;
let availableClips = [];
let clock = new THREE.Clock();
let isPlaying = false;

/**
 * モデルをフィットさせる
 */
function fitToObject(object3dOrGroup) {
  const box = new THREE.Box3().setFromObject(object3dOrGroup);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  object3dOrGroup.position.sub(center);
  object3dOrGroup.position.y += size.y * 0.5;

  controls.target.set(0, size.y * 0.55, 0);
  controls.update();

  const maxDim = Math.max(size.x, size.y, size.z);
  const dist = maxDim * 1.6;
  camera.position.set(0.0, size.y * 0.85, dist);
  camera.near = Math.max(0.01, dist / 200);
  camera.far = dist * 50;
  camera.updateProjectionMatrix();
}

/**
 * 再生状態を設定
 */
function setPlaying(next) {
  isPlaying = next;
  if (activeAction) {
    if (isPlaying) {
      activeAction.paused = false;
      activeAction.play();
    } else {
      activeAction.paused = true;
    }
  }
}

/**
 * アニメーションクリップを設定
 */
function setClipByIndex(idx) {
  if (!mixer) return;
  const nextClip = availableClips[idx] || availableClips[0];
  if (!nextClip) return;

  if (activeAction) {
    activeAction.fadeOut(0.15);
  }
  activeAction = mixer.clipAction(nextClip);
  activeAction.reset();
  activeAction.fadeIn(0.15);
  activeAction.play();
  activeAction.paused = !isPlaying;
}

/**
 * モデルをロード
 */
async function loadModel(modelPath) {
  const loader = new GLTFLoader();

  try {
    const gltf = await loader.loadAsync(modelPath);

    // 既存のモデルを削除
    if (currentPivot) {
      scene.remove(currentPivot);
      currentPivot = null;
    }

    const model = gltf.scene;
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = true;
        obj.castShadow = false;
        obj.receiveShadow = false;
        if (obj.material) {
          obj.material.dithering = true;
        }
      }
    });

    currentModel = model;
    currentPivot = new THREE.Group();
    currentPivot.add(model);
    scene.add(currentPivot);
    fitToObject(currentPivot);

    mixer = new THREE.AnimationMixer(model);
    availableClips = gltf.animations || [];

    // 最初のクリップを自動再生
    if (availableClips.length > 0) {
      setClipByIndex(0);
      setPlaying(true);
    }

    return true;
  } catch (e) {
    console.error('モデル読み込みエラー:', e);
    return false;
  }
}

/**
 * リサイズ処理
 */
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/**
 * レンダーループ
 */
function tick() {
  requestAnimationFrame(tick);
  controls.update();
  
  if (mixer && isPlaying) {
    const dt = Math.min(clock.getDelta(), 1 / 30);
    mixer.update(dt);
  } else {
    clock.getDelta();
  }
  
  renderer.render(scene, camera);
}

// モデルを読み込み
loadModel('/models/Drowning_human.glb').catch((e) => {
  console.error('モデル読み込み失敗:', e);
});

// レンダーループ開始
tick();
