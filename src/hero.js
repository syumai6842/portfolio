import './common.css';
import './hero.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'gsap';

// ============================================
// Three.js セットアップ
// ============================================
const canvas = document.getElementById('c');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// ライト設定
const ambientLight = new THREE.HemisphereLight(0xffffff, 0x223344, 1);
ambientLight.castShadow = false;
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = false;
scene.add(directionalLight);

const pointLight1 = new THREE.PointLight(0x667eea, 2, 20);
pointLight1.position.set(5, 5, 5);
pointLight1.castShadow = false;
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x764ba2, 2, 20);
pointLight2.position.set(-5, 5, -5);
pointLight2.castShadow = false;
scene.add(pointLight2);

// グローバル状態
let headModel = null;
let bodyModel = null;

// マウス追跡用の変数
let targetRotationY = 0;
let currentRotationY = 0;

// カメラアニメーション用
const cameraData = {
  position: new THREE.Vector3(0, 7.5, 3.0),
  target: new THREE.Vector3(0, 7.5, 0)
};

// タップ＆ホールド → ズーム → Works遷移
const ZOOM_DURATION_MS = 1000;
const CAMERA_Z_INITIAL = 3.0;
const CAMERA_Z_TARGET = 1.0;
let isHolding = false;
let holdStartTime = 0;

// テクスチャをモデルに適用する関数
function applyTextureToModel(model, texture) {
  model.traverse((obj) => {
    if (obj.isMesh) {
      obj.frustumCulled = true;
      obj.castShadow = false;
      obj.receiveShadow = false;
      
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material = obj.material.map((mat) => {
            if (mat) {
              if (mat.isMeshBasicMaterial) {
                mat.map = texture;
                mat.needsUpdate = true;
                return mat;
              } else {
                return new THREE.MeshBasicMaterial({
                  map: texture
                });
              }
            }
            return new THREE.MeshBasicMaterial({
              map: texture
            });
          });
        } else {
          if (obj.material.isMeshBasicMaterial) {
            obj.material.map = texture;
            obj.material.needsUpdate = true;
          } else {
            obj.material = new THREE.MeshBasicMaterial({
              map: texture
            });
            obj.castShadow = false;
            obj.receiveShadow = false;
          }
        }
      } else {
        obj.material = new THREE.MeshBasicMaterial({
          map: texture
        });
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    }
  });
}

// 複数モデルを読み込んで縦に並べる関数
async function loadModels() {
  const textureLoader = new THREE.TextureLoader();
  const texture = await new Promise((resolve, reject) => {
    textureLoader.load(
      '/models/Model_texture.png',
      (texture) => {
        texture.flipY = false;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      },
      undefined,
      (error) => reject(error)
    );
  });
  
  try {
    // Headモデルの読み込み
    const headLoader = new GLTFLoader();
    const headGltf = await headLoader.loadAsync('/models/portfolio_model_head.glb');
    headModel = headGltf.scene;
    applyTextureToModel(headModel, texture);
    
    // Bodyモデルの読み込み
    const bodyLoader = new GLTFLoader();
    const bodyGltf = await bodyLoader.loadAsync('/models/portfolio_model_body.glb');
    bodyModel = bodyGltf.scene;
    applyTextureToModel(bodyModel, texture);
    
    // Headの配置
    const headBox = new THREE.Box3().setFromObject(headModel);
    const headCenter = new THREE.Vector3();
    headBox.getCenter(headCenter);
    const headSize = new THREE.Vector3();
    headBox.getSize(headSize);
    
    headModel.position.sub(headCenter);
    const headMaxDim = Math.max(headSize.x, headSize.y, headSize.z);
    const headScale = (10.0 / headMaxDim) / 4;
    headModel.scale.set(headScale, headScale, headScale);
    headModel.position.set(0, -1.8, 0);
    scene.add(headModel);
    
    // Bodyの配置
    const bodyBox = new THREE.Box3().setFromObject(bodyModel);
    const bodyCenter = new THREE.Vector3();
    bodyBox.getCenter(bodyCenter);
    const bodySize = new THREE.Vector3();
    bodyBox.getSize(bodySize);
    
    bodyModel.position.sub(bodyCenter);
    const bodyMaxDim = Math.max(bodySize.x, bodySize.y, bodySize.z);
    const bodyScale = 10.0 / bodyMaxDim;
    bodyModel.scale.set(bodyScale, bodyScale, bodyScale);
    bodyModel.position.set(0, -2.0, 0);
    scene.add(bodyModel);
    
    // マテリアルを強制的にMeshBasicMaterialに設定
    headModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        
        if (!child.material || !child.material.map) {
          child.material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: false,
            opacity: 1.0
          });
          child.castShadow = false;
          child.receiveShadow = false;
        } else {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((mat) => {
              if (mat) {
                return new THREE.MeshBasicMaterial({
                  map: texture,
                  transparent: false,
                  opacity: 1.0
                });
              }
              return new THREE.MeshBasicMaterial({
                map: texture,
                transparent: false,
                opacity: 1.0
              });
            });
          } else {
            child.material = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: false,
              opacity: 1.0
            });
          }
        }
        
        child.visible = true;
        child.frustumCulled = false;
      }
    });
    
    // bodyModelのすべてのメッシュからも影を無効化
    bodyModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    
    // シーン全体のすべてのメッシュから影を無効化
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
    
    return true;
  } catch (e) {
    console.error('モデル読み込みエラー:', e);
    return false;
  }
}

// リサイズ
function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ヒーロー タップ＆ホールド → ズーム → Works遷移
const heroEl = document.getElementById('hero');
const zoomOverlay = document.getElementById('zoom-overlay');
const holdCursor = document.getElementById('hold-cursor');

let holdPointerX = 0;
let holdPointerY = 0;

function transitionToWorks() {
  // 別ページに遷移
  window.location.href = '/works.html';
}

function updateHoldCursorPosition(x, y) {
  holdPointerX = x;
  holdPointerY = y;
  if (holdCursor) {
    holdCursor.style.left = `${x}px`;
    holdCursor.style.top = `${y}px`;
  }
}

function onHeroPointerDown(e) {
  e.preventDefault();
  isHolding = true;
  holdStartTime = performance.now();
  updateHoldCursorPosition(e.clientX, e.clientY);
  
  if (zoomOverlay) {
    zoomOverlay.style.visibility = 'visible';
    zoomOverlay.style.opacity = '0';
  }
  
  if (holdCursor) {
    holdCursor.classList.add('is-visible');
    holdCursor.setAttribute('aria-hidden', 'false');
  }
}

function onHeroPointerUp() {
  if (!isHolding) return;
  isHolding = false;
  const elapsed = performance.now() - holdStartTime;
  const progress = Math.min(elapsed / ZOOM_DURATION_MS, 1);
  if (progress >= 1) return;
  
  gsap.to(camera.position, {
    z: CAMERA_Z_INITIAL,
    duration: 0.5,
    ease: 'power2.out'
  });
  
  if (zoomOverlay) {
    zoomOverlay.style.opacity = '0';
    zoomOverlay.style.visibility = 'hidden';
  }
  
  if (holdCursor) {
    holdCursor.classList.remove('is-visible');
    holdCursor.setAttribute('aria-hidden', 'true');
  }
}

function onHeroPointerMove(e) {
  if (isHolding) updateHoldCursorPosition(e.clientX, e.clientY);
}

if (heroEl) {
  heroEl.addEventListener('pointerdown', onHeroPointerDown, { passive: false });
  heroEl.addEventListener('pointerup', onHeroPointerUp);
  heroEl.addEventListener('pointercancel', onHeroPointerUp);
  heroEl.addEventListener('pointerleave', onHeroPointerUp);
  heroEl.addEventListener('pointermove', onHeroPointerMove, { passive: true });
  window.addEventListener('pointerup', onHeroPointerUp);
  window.addEventListener('pointercancel', onHeroPointerUp);
  window.addEventListener('pointermove', onHeroPointerMove, { passive: true });
}

// マウス追跡イベント
function updateMouseTracking(e) {
  const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  targetRotationY = mouseX * 0.3;
}

document.addEventListener('mousemove', updateMouseTracking);
document.addEventListener('pointermove', (e) => {
  updateMouseTracking(e);
}, { passive: true });

// レンダーループ
function animate() {
  requestAnimationFrame(animate);

  // タップ＆ホールド中: カメラズーム
  if (isHolding) {
    const elapsed = performance.now() - holdStartTime;
    const rawProgress = Math.min(elapsed / ZOOM_DURATION_MS, 1);
    const easeOut = 1 - Math.pow(1 - rawProgress, 1.2);
    camera.position.z = CAMERA_Z_INITIAL + (CAMERA_Z_TARGET - CAMERA_Z_INITIAL) * easeOut;
    
    if (zoomOverlay) {
      zoomOverlay.style.opacity = rawProgress.toString();
      zoomOverlay.style.visibility = rawProgress > 0 ? 'visible' : 'hidden';
    }
    
    if (rawProgress >= 1) transitionToWorks();
  }

  // スムーズな回転補間
  if (headModel) {
    currentRotationY += (targetRotationY - currentRotationY) * 0.1;
    headModel.rotation.y = currentRotationY;
  }

  camera.lookAt(cameraData.target);
  renderer.render(scene, camera);
}
animate();

// モデル読み込み
loadModels();

// カメラ位置を固定
camera.position.set(cameraData.position.x, cameraData.position.y, cameraData.position.z);
cameraData.target.set(cameraData.target.x, cameraData.target.y, cameraData.target.z);
camera.lookAt(cameraData.target);

// ============================================
// GSAP 幾何学的背景アニメーション
// ============================================
function initGeometricAnimations() {
  const shapes = document.querySelectorAll('.geo-shape');
  const lines = document.querySelectorAll('.geo-line');
  
  if (shapes.length === 0 && lines.length === 0) {
    console.error('幾何学的背景要素が見つかりません');
    return;
  }
  
  gsap.set('.geo-shape, .geo-line', {
    opacity: 0.5,
    visibility: 'visible'
  });
  
  // 円形のアニメーション
  gsap.to('.geo-circle-1', {
    rotation: 360,
    duration: 20,
    ease: 'none',
    repeat: -1
  });
  
  gsap.to('.geo-circle-2', {
    rotation: -360,
    duration: 25,
    ease: 'none',
    repeat: -1
  });
  
  gsap.to('.geo-circle-3', {
    scale: 1.5,
    duration: 4,
    ease: 'power2.inOut',
    yoyo: true,
    repeat: -1
  });
  
  // 三角形のアニメーション
  gsap.to('.geo-triangle-1', {
    rotation: 360,
    x: 100,
    y: -50,
    duration: 15,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1
  });
  
  gsap.to('.geo-triangle-2', {
    rotation: -360,
    x: -80,
    y: 60,
    duration: 18,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1
  });
  
  // 四角形のアニメーション
  gsap.to('.geo-square-1', {
    rotation: '+=360',
    scale: 1.3,
    duration: 12,
    ease: 'power2.inOut',
    yoyo: true,
    repeat: -1
  });
  
  gsap.to('.geo-square-2', {
    rotation: '-=360',
    scale: 0.7,
    x: 50,
    y: -30,
    duration: 10,
    ease: 'power2.inOut',
    yoyo: true,
    repeat: -1
  });
  
  // 六角形のアニメーション
  gsap.to('.geo-hexagon-1', {
    rotation: '+=360',
    scale: 1.2,
    y: -30,
    duration: 16,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1
  });
  
  gsap.to('.geo-hexagon-2', {
    rotation: '-=360',
    scale: 1.4,
    x: 40,
    y: 40,
    duration: 14,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1
  });
  
  // 線のアニメーション
  gsap.to('.geo-line-1', {
    x: 200,
    y: -100,
    opacity: 0.6,
    duration: 8,
    ease: 'power2.inOut',
    yoyo: true,
    repeat: -1
  });
  
  gsap.to('.geo-line-2', {
    x: -150,
    y: 80,
    opacity: 0.6,
    duration: 10,
    ease: 'power2.inOut',
    yoyo: true,
    repeat: -1
  });
  
  gsap.to('.geo-line-3', {
    x: 100,
    opacity: 0.5,
    scale: 1.5,
    duration: 6,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1
  });
  
  gsap.to('.geo-line-4', {
    x: -80,
    y: -60,
    opacity: 0.5,
    scale: 1.3,
    duration: 7,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1
  });
  
  // マウス追跡によるインタラクティブなアニメーション
  let mouseX = 0;
  let mouseY = 0;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    
    gsap.to('.geo-circle-1', {
      x: mouseX * 30,
      y: mouseY * 30,
      duration: 1,
      ease: 'power2.out'
    });
    
    gsap.to('.geo-circle-2', {
      x: mouseX * -20,
      y: mouseY * -20,
      duration: 1,
      ease: 'power2.out'
    });
    
    gsap.to('.geo-triangle-1', {
      x: mouseX * 25,
      y: mouseY * 25,
      duration: 1,
      ease: 'power2.out'
    });
    
    gsap.to('.geo-square-1', {
      x: mouseX * -15,
      y: mouseY * -15,
      duration: 1,
      ease: 'power2.out'
    });
  });
  
  // スクロール連動アニメーション
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const scrollProgress = scrollY / window.innerHeight;
    
    gsap.to('.geo-shape', {
      opacity: 0.15 - scrollProgress * 0.1,
      scale: 1 - scrollProgress * 0.2,
      duration: 0.5,
      ease: 'power2.out'
    });
  }, { passive: true });
}

// DOMが読み込まれたらアニメーションを開始
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGeometricAnimations);
} else {
  initGeometricAnimations();
}
