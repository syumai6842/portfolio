import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ============================================
// Three.js セットアップ
// ============================================
const canvas = document.getElementById('c');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

// ライト設定
const ambientLight = new THREE.HemisphereLight(0xffffff, 0x223344, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const pointLight1 = new THREE.PointLight(0x667eea, 2, 20);
pointLight1.position.set(5, 5, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x764ba2, 2, 20);
pointLight2.position.set(-5, 5, -5);
scene.add(pointLight2);

// グローバル状態
let currentModel = null;
let currentPivot = null;
let mixer = null;
let clock = new THREE.Clock();

// カメラアニメーション用
const cameraData = {
  position: new THREE.Vector3(0, 1, 5),
  target: new THREE.Vector3(0, 1, 0),
  currentSection: 0
};

// セクションごとのカメラ設定
const sectionCameraConfigs = [
  { position: { x: 0, y: 1, z: 5 }, target: { x: 0, y: 1, z: 0 } },
  { position: { x: 3, y: 1.5, z: 4 }, target: { x: 0, y: 1, z: 0 } },
  { position: { x: -3, y: 1.5, z: 4 }, target: { x: 0, y: 1, z: 0 } },
  { position: { x: 0, y: 2, z: 3.5 }, target: { x: 0, y: 1.5, z: 0 } },
  { position: { x: 0, y: 1, z: 5 }, target: { x: 0, y: 1, z: 0 } }
];

// モデル読み込み
async function loadModel(path) {
  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync(path);
    const model = gltf.scene;
    
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = true;
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });

    currentModel = model;
    currentPivot = new THREE.Group();
    currentPivot.add(model);
    scene.add(currentPivot);

    // モデルを中央に配置
    const box = new THREE.Box3().setFromObject(currentPivot);
    const center = new THREE.Vector3();
    box.getCenter(center);
    currentPivot.position.sub(center);
    currentPivot.position.y += 1;

    // スケール調整
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2.5 / maxDim;
    currentPivot.scale.set(scale, scale, scale);

    // アニメーション
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
    }

    // モデル出現アニメーション（Timeline使用）
    const modelTimeline = gsap.timeline();
    modelTimeline
      .from(currentPivot.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.5,
        ease: 'back.out(1.7)'
      })
      .from(currentPivot.rotation, {
        y: Math.PI * 2,
        duration: 2,
        ease: 'power3.out'
      }, '-=1');

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

// レンダーループ
function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  // アニメーションミキサー更新
  if (mixer) {
    mixer.update(clock.getDelta());
  }

  // ライトのアニメーション
  pointLight1.position.x = Math.sin(time * 0.5) * 5;
  pointLight1.position.z = Math.cos(time * 0.5) * 5;
  pointLight1.intensity = 2 + Math.sin(time * 0.8) * 0.5;

  pointLight2.position.x = Math.cos(time * 0.6) * 5;
  pointLight2.position.z = Math.sin(time * 0.6) * 5;
  pointLight2.intensity = 2 + Math.cos(time * 0.9) * 0.5;

  // モデルの微細な動き
  if (currentPivot) {
    currentPivot.position.y = 1 + Math.sin(time * 0.4) * 0.1;
  }

  // カメラのターゲットを追従
  camera.lookAt(cameraData.target);

  renderer.render(scene, camera);
}
animate();

// モデル読み込み
loadModel('/models/Drowning_human.glb');

// ============================================
// GSAP アニメーションシステム（prty.jpスタイル）
// ============================================

// セクション要素の取得
const sections = ['hero', 'about', 'skills', 'projects', 'contact'];
const sectionElements = document.querySelectorAll('.fullscreen-section');

// カメラアニメーション関数
function animateCameraToSection(index) {
  if (index < 0 || index >= sectionCameraConfigs.length) return;
  
  const config = sectionCameraConfigs[index];
  const timeline = gsap.timeline();
  
  timeline
    .to(camera.position, {
      x: config.position.x,
      y: config.position.y,
      z: config.position.z,
      duration: 1.5,
      ease: 'power3.inOut'
    })
    .to(cameraData.target, {
      x: config.target.x,
      y: config.target.y,
      z: config.target.z,
      duration: 1.5,
      ease: 'power3.inOut'
    }, '-=1.5');
  
  // モデルの回転アニメーション
  if (currentPivot) {
    gsap.to(currentPivot.rotation, {
      y: index * Math.PI * 0.5,
      duration: 1.5,
      ease: 'power3.inOut'
    });
  }
  
  cameraData.currentSection = index;
}

// 初期カメラ位置
camera.position.set(sectionCameraConfigs[0].position.x, sectionCameraConfigs[0].position.y, sectionCameraConfigs[0].position.z);
cameraData.target.set(sectionCameraConfigs[0].target.x, sectionCameraConfigs[0].target.y, sectionCameraConfigs[0].target.z);
camera.lookAt(cameraData.target);

// ScrollTriggerでセクションごとのアニメーション（prty.jpスタイル）
sectionElements.forEach((section, index) => {
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom top',
    scrub: 1,
    onEnter: () => {
      animateCameraToSection(index);
      animateSectionContent(section, index);
    },
    onEnterBack: () => {
      animateCameraToSection(index);
      animateSectionContent(section, index);
    }
  });
});

// セクションコンテンツのアニメーション
function animateSectionContent(section, index) {
  // セクション内の要素を取得
  const title = section.querySelector('.section-title');
  const cards = section.querySelectorAll('.skill-card, .project-card');
  const descriptions = section.querySelectorAll('.about-description');
  const buttons = section.querySelectorAll('.btn');
  
  const contentTimeline = gsap.timeline();
  
  // タイトルアニメーション
  if (title) {
    contentTimeline.from(title, {
      opacity: 0,
      y: 100,
      rotationX: -90,
      duration: 1,
      ease: 'power3.out',
      transformOrigin: 'center bottom'
    });
  }
  
  // カードアニメーション（スタガー）
  if (cards.length > 0) {
    contentTimeline.from(cards, {
      opacity: 0,
      y: 80,
      scale: 0.8,
      rotationY: 45,
      duration: 0.8,
      stagger: 0.15,
      ease: 'back.out(1.7)',
      transformOrigin: 'center center'
    }, '-=0.5');
  }
  
  // 説明テキストアニメーション
  if (descriptions.length > 0) {
    contentTimeline.from(descriptions, {
      opacity: 0,
      x: -100,
      duration: 0.8,
      stagger: 0.2,
      ease: 'power3.out'
    }, '-=0.5');
  }
  
  // ボタンアニメーション
  if (buttons.length > 0) {
    contentTimeline.from(buttons, {
      opacity: 0,
      scale: 0,
      rotation: -180,
      duration: 0.6,
      stagger: 0.1,
      ease: 'back.out(1.7)'
    }, '-=0.3');
  }
}

// パララックス効果: スクロールに応じて3Dシーンを動かす
ScrollTrigger.create({
  trigger: 'body',
  start: 'top top',
  end: 'bottom bottom',
  scrub: 1,
  onUpdate: (self) => {
    const progress = self.progress;
    
    // モデルの回転
    if (currentPivot) {
      gsap.to(currentPivot.rotation, {
        y: progress * Math.PI * 2,
        duration: 0.1,
        ease: 'none'
      });
    }
    
    // カメラのズーム（微細な調整）
    const baseZ = sectionCameraConfigs[cameraData.currentSection].position.z;
    camera.position.z = baseZ - progress * 0.5;
  }
});

// ページロード時のアニメーション（prty.jpスタイル）
window.addEventListener('load', () => {
  const masterTimeline = gsap.timeline();
  
  // ナビゲーションのフェードイン
  masterTimeline.from('.nav', {
    y: -100,
    opacity: 0,
    duration: 1,
    ease: 'power3.out'
  });
  
  // ヒーローセクションのアニメーション
  const heroTimeline = gsap.timeline();
  
  heroTimeline
    .to('.hero-title-line', {
      opacity: 1,
      y: 0,
      duration: 1.2,
      stagger: {
        amount: 0.4,
        from: 'start'
      },
      ease: 'power3.out'
    })
    .to('.hero-subtitle', {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 1,
      ease: 'back.out(1.7)'
    }, '-=0.5')
    .to('.hero-buttons', {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.8,
      ease: 'back.out(1.7)'
    }, '-=0.4')
    .from('.hero-buttons .btn', {
      scale: 0,
      rotation: -180,
      duration: 0.6,
      stagger: 0.15,
      ease: 'back.out(1.7)'
    }, '-=0.3')
    .to('.scroll-indicator', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out'
    }, '-=0.4');
  
  masterTimeline.add(heroTimeline, '-=0.5');
});

// マウス追従インタラクション（prty.jpスタイル）
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// スムーズなマウス追従
function updateMouseFollow() {
  targetX += (mouseX - targetX) * 0.05;
  targetY += (mouseY - targetY) * 0.05;
  
  if (currentPivot) {
    gsap.to(currentPivot.rotation, {
      y: currentPivot.rotation.y + targetX * 0.01,
      x: targetY * 0.01,
      duration: 0.3,
      ease: 'power2.out'
    });
  }
  
  // カメラの微細な動き
  const basePos = sectionCameraConfigs[cameraData.currentSection].position;
  gsap.to(camera.position, {
    x: basePos.x + targetX * 0.2,
    y: basePos.y + targetY * 0.15,
    duration: 0.5,
    ease: 'power2.out'
  });
  
  requestAnimationFrame(updateMouseFollow);
}
updateMouseFollow();

// ナビゲーションクリック
document.querySelectorAll('.nav-link').forEach((link, index) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetSection = document.querySelector(link.getAttribute('href'));
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      animateCameraToSection(index);
    }
  });
});

// ナビゲーションのアクティブ状態（ScrollTrigger）
ScrollTrigger.create({
  trigger: 'body',
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    const scrollProgress = self.progress;
    const activeIndex = Math.round(scrollProgress * (sections.length - 1));
    
    document.querySelectorAll('.nav-link').forEach((link, index) => {
      if (index === activeIndex) {
        gsap.to(link, {
          color: '#667eea',
          duration: 0.3,
          ease: 'power2.out'
        });
        link.classList.add('active');
      } else {
        gsap.to(link, {
          color: '#e8eef7',
          duration: 0.3,
          ease: 'power2.out'
        });
        link.classList.remove('active');
      }
    });
  }
});

// カードホバーアニメーション（prty.jpスタイル）
document.querySelectorAll('.skill-card, .project-card').forEach((card) => {
  card.addEventListener('mouseenter', () => {
    gsap.to(card, {
      y: -10,
      scale: 1.05,
      rotationY: 5,
      duration: 0.4,
      ease: 'power2.out'
    });
  });
  
  card.addEventListener('mouseleave', () => {
    gsap.to(card, {
      y: 0,
      scale: 1,
      rotationY: 0,
      duration: 0.4,
      ease: 'power2.out'
    });
  });
});

// ボタンホバーアニメーション
document.querySelectorAll('.btn').forEach((btn) => {
  btn.addEventListener('mouseenter', () => {
    gsap.to(btn, {
      scale: 1.05,
      y: -2,
      duration: 0.3,
      ease: 'power2.out'
    });
  });
  
  btn.addEventListener('mouseleave', () => {
    gsap.to(btn, {
      scale: 1,
      y: 0,
      duration: 0.3,
      ease: 'power2.out'
    });
  });
});
