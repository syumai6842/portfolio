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
let currentSection = 0;
const sections = ['hero', 'about', 'skills', 'projects', 'contact'];
const cameraPositions = [
  { x: 0, y: 1, z: 5 },
  { x: 3, y: 1.5, z: 4 },
  { x: -3, y: 1.5, z: 4 },
  { x: 0, y: 2, z: 3.5 },
  { x: 0, y: 1, z: 5 }
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

    // モデル出現アニメーション
    gsap.from(currentPivot.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1.5,
      ease: 'back.out(1.7)'
    });

    gsap.from(currentPivot.rotation, {
      y: Math.PI * 2,
      duration: 2,
      ease: 'power3.out'
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

  renderer.render(scene, camera);
}
animate();

// モデル読み込み
loadModel('/models/Drowning_human.glb');

// ============================================
// GSAP アニメーションシステム
// ============================================

// セクション要素の取得
const sectionElements = document.querySelectorAll('.fullscreen-section');
let isScrolling = false;

// 現在のセクションインデックスを取得
function getCurrentSectionIndex() {
  const scrollPosition = window.scrollY + window.innerHeight / 2;
  let currentIndex = 0;
  
  sectionElements.forEach((section, index) => {
    const sectionTop = section.offsetTop;
    const sectionBottom = sectionTop + section.offsetHeight;
    if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
      currentIndex = index;
    }
  });
  
  return currentIndex;
}

// カメラをセクションに応じて移動
function updateCamera(sectionIndex) {
  if (sectionIndex < 0 || sectionIndex >= cameraPositions.length) return;
  
  const targetPos = cameraPositions[sectionIndex];
  gsap.to(camera.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration: 1.5,
    ease: 'power3.inOut'
  });

  // モデルの回転アニメーション
  if (currentPivot) {
    gsap.to(currentPivot.rotation, {
      y: sectionIndex * Math.PI * 0.5,
      duration: 1.5,
      ease: 'power3.inOut'
    });
  }

  currentSection = sectionIndex;
}

// スナップスクロールの実装
let scrollTimeout;
let lastScrollTime = 0;

window.addEventListener('wheel', (e) => {
  if (isScrolling) return;
  
  const now = Date.now();
  if (now - lastScrollTime < 100) return;
  lastScrollTime = now;
  
  const currentIndex = getCurrentSectionIndex();
  
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    if (e.deltaY > 0 && currentIndex < sections.length - 1) {
      isScrolling = true;
      const nextSection = document.getElementById(sections[currentIndex + 1]);
      if (nextSection) {
        nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          isScrolling = false;
          updateCamera(currentIndex + 1);
        }, 1500);
      }
    } else if (e.deltaY < 0 && currentIndex > 0) {
      isScrolling = true;
      const prevSection = document.getElementById(sections[currentIndex - 1]);
      if (prevSection) {
        prevSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          isScrolling = false;
          updateCamera(currentIndex - 1);
        }, 1500);
      }
    }
  }, 50);
}, { passive: true });

// スクロール時のセクション更新
window.addEventListener('scroll', () => {
  if (!isScrolling) {
    const currentIndex = getCurrentSectionIndex();
    if (currentIndex !== currentSection) {
      updateCamera(currentIndex);
    }
  }
}, { passive: true });

// 初期カメラ位置
camera.position.set(cameraPositions[0].x, cameraPositions[0].y, cameraPositions[0].z);
camera.lookAt(0, 1, 0);

// ScrollTriggerでセクションごとのアニメーション
sectionElements.forEach((section, index) => {
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom top',
    onEnter: () => {
      updateCamera(index);
      
      // セクション内の要素をアニメーション
      const title = section.querySelector('.section-title');
      const cards = section.querySelectorAll('.skill-card, .project-card');
      const descriptions = section.querySelectorAll('.about-description');
      
      if (title) {
        gsap.from(title, {
          opacity: 0,
          y: 100,
          rotationX: -90,
          duration: 1,
          ease: 'power3.out',
          transformOrigin: 'center bottom'
        });
      }
      
      cards.forEach((card, i) => {
        gsap.from(card, {
          opacity: 0,
          y: 50,
          scale: 0.8,
          duration: 0.8,
          delay: i * 0.1,
          ease: 'back.out(1.7)'
        });
      });
      
      descriptions.forEach((desc, i) => {
        gsap.from(desc, {
          opacity: 0,
          x: -50,
          duration: 0.8,
          delay: i * 0.2,
          ease: 'power3.out'
        });
      });
    }
  });
});

// パララックス効果: スクロールに応じて3Dシーンを動かす
ScrollTrigger.create({
  trigger: 'body',
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    const progress = self.progress;
    
    if (currentPivot) {
      gsap.to(currentPivot.rotation, {
        y: progress * Math.PI * 2,
        duration: 0.3,
        ease: 'none'
      });
    }
    
    // カメラのズーム
    const targetZ = 5 - progress * 1.5;
    camera.position.z = targetZ;
  }
});

// ページロード時のアニメーション
window.addEventListener('load', () => {
  // ヒーローセクションのアニメーション
  const heroTimeline = gsap.timeline();
  
  heroTimeline
    .to('.hero-title-line', {
      opacity: 1,
      y: 0,
      duration: 1,
      stagger: 0.2,
      ease: 'power3.out'
    })
    .to('.hero-subtitle', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out'
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
      stagger: 0.1,
      ease: 'back.out(1.7)'
    }, '-=0.3')
    .to('.scroll-indicator', {
      opacity: 1,
      duration: 0.8,
      ease: 'power3.out'
    }, '-=0.4');

  // ナビゲーションのフェードイン
  gsap.from('.nav', {
    y: -100,
    opacity: 0,
    duration: 1,
    ease: 'power3.out'
  });
});

// マウス追従インタラクション
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
    currentPivot.rotation.y += targetX * 0.01;
    currentPivot.rotation.x = targetY * 0.01;
  }
  
  // カメラの微細な動き（アニメーション中の場合は無効化）
  if (currentSection < cameraPositions.length) {
    const basePos = cameraPositions[currentSection];
    if (!isScrolling) {
      camera.position.x = basePos.x + targetX * 0.3;
      camera.position.y = basePos.y + targetY * 0.2;
    }
  }
  
  requestAnimationFrame(updateMouseFollow);
}
updateMouseFollow();

// ナビゲーションクリック
document.querySelectorAll('.nav-link').forEach((link, index) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetSection = document.querySelector(link.getAttribute('href'));
    if (targetSection && !isScrolling) {
      isScrolling = true;
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        isScrolling = false;
        updateCamera(index);
      }, 1500);
    }
  });
});

// ナビゲーションのアクティブ状態
ScrollTrigger.create({
  trigger: 'body',
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    const scrollProgress = self.progress;
    const activeIndex = Math.round(scrollProgress * (sections.length - 1));
    
    document.querySelectorAll('.nav-link').forEach((link, index) => {
      if (index === activeIndex) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
});
