import './common.css';
import './about.css';
import gsap from 'gsap';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const initPageMotion = () => {
  const page = document.querySelector('.about-page');
  if (!page) return;

  const background = page.querySelector('.about-page-background');
  const threeCanvas = page.querySelector('.about-three-canvas');
  const title = page.querySelector('.about-title');
  const navLabels = page.querySelectorAll('.about-nav-label');
  const panels = page.querySelectorAll('.about-panel');

  gsap.set([title, navLabels], { autoAlpha: 0, y: 24 });
  gsap.set(panels, { autoAlpha: 0, y: 20, rotateX: 6 });
  gsap.set(background, { scale: 1.04, opacity: 0 });
  gsap.set(threeCanvas, { autoAlpha: 0 });

  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro
    .to(background, { opacity: 1, scale: 1, duration: 1.1 })
    .to(threeCanvas, { autoAlpha: 1, duration: 0.9 }, '-=0.7')
    .to(title, { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.4')
    .to(
      navLabels,
      { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.08 },
      '-=0.45'
    );
};

const initThreeBackground = () => {
  const container = document.querySelector('.about-three-canvas');
  if (!container) return;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 0.25, 3.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 1.6;
  controls.maxDistance = 8;

  const panels = Array.from(
    document.querySelectorAll('.about-panel[data-view]')
  );
  const debugLabel = document.querySelector('.about-title-debug');
  let hasAnimatedPanel = false;
  let currentViewKey = null;
  const setActivePanel = (key) => {
    if (key === currentViewKey) return;
    currentViewKey = key;
    const isTargetPanel = (panel) => {
      const panelView = panel.dataset.view;
      const panelTopic = panel.dataset.topic;
      let isActive = panelView === key;

      if (key === 'left') {
        isActive = panelView === 'left' && panelTopic === 'service';
      } else if (key === 'right') {
        isActive = panelView === 'right' && panelTopic === 'skill';
      }
      return isActive;
    };

    gsap.killTweensOf(panels);
    const activePanels = panels.filter(isTargetPanel);

    panels.forEach((panel) => {
      if (activePanels.includes(panel)) return;
      if (panel.classList.contains('is-active')) {
        panel.classList.remove('is-active');
      }
      gsap.set(panel, { autoAlpha: 0, y: 12, scale: 0.98 });
    });

    activePanels.forEach((panel) => {
      const wasActive = panel.classList.contains('is-active');
      if (!wasActive) {
        panel.classList.add('is-active');
        gsap.fromTo(
          panel,
          { autoAlpha: 0, y: 24, scale: 0.98, rotateX: 6 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            duration: hasAnimatedPanel ? 0.55 : 0.8,
            delay: hasAnimatedPanel ? 0 : 0.5,
            ease: 'power3.out',
            overwrite: true,
          }
        );
        hasAnimatedPanel = true;
      } else {
        gsap.set(panel, { autoAlpha: 1, y: 0, scale: 1, rotateX: 0 });
      }
    });
    if (debugLabel) {
      debugLabel.textContent = `[${key}]`;
    }
  };

  const updateViewPanel = () => {
    if (!controls?.target) return;
    const offset = new THREE.Vector3()
      .copy(camera.position)
      .sub(controls.target)
      .normalize();

    const polar = Math.acos(THREE.MathUtils.clamp(offset.y, -1, 1));
    if (polar > Math.PI * 0.6) {
      setActivePanel('down');
      return;
    }

    const angle = Math.atan2(offset.x, offset.z);
    const angleDeg = THREE.MathUtils.radToDeg(angle);

    if (angleDeg > -45 && angleDeg <= 45) {
      setActivePanel('front');
    } else if (angleDeg > 45 && angleDeg <= 135) {
      setActivePanel('right');
    } else if (angleDeg <= -45 && angleDeg > -135) {
      setActivePanel('left');
    } else {
      setActivePanel('back');
    }
  };

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(4, 6, 4);
  scene.add(keyLight);

  const loader = new GLTFLoader();
  loader.load(
    '/models/portfolio_model.glb',
    (gltf) => {
      const model = gltf.scene;
      const fixTextureSeams = (material) => {
        const textures = [
          material.map,
          material.normalMap,
          material.roughnessMap,
          material.metalnessMap,
          material.emissiveMap,
          material.aoMap,
        ];
        textures.forEach((texture) => {
          if (!texture) return;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.generateMipmaps = false;
          texture.minFilter = THREE.LinearFilter;
          texture.needsUpdate = true;
        });
        material.transparent = false;
        material.depthWrite = true;
      };

      model.traverse((child) => {
        if (!child.isMesh) return;
        if (Array.isArray(child.material)) {
          child.material.forEach(fixTextureSeams);
        } else if (child.material) {
          fixTextureSeams(child.material);
        }
      });
      scene.add(model);

      // モデルを中心に寄せて適切な距離に配置
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      model.position.sub(center);

      const maxAxis = Math.max(size.x, size.y, size.z);
      const scale = 2.5 / maxAxis;
      model.scale.setScalar(scale);

      const adjustedBox = new THREE.Box3().setFromObject(model);
      const adjustedSize = adjustedBox.getSize(new THREE.Vector3());
      const adjustedCenter = adjustedBox.getCenter(new THREE.Vector3());

      model.position.sub(adjustedCenter);

      const groundedBox = new THREE.Box3().setFromObject(model);
      model.position.y -= groundedBox.min.y;
      // 初期状態で少し左寄せ
      model.position.x -= adjustedSize.x * 0.6;

      controls.target.set(0, adjustedSize.y * 0.5, 0);
      controls.update();
      updateViewPanel();
    },
    undefined,
    (error) => {
      console.error('Failed to load GLB model', error);
    }
  );

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);
  const tick = () => {
    controls.update();
    updateViewPanel();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();
};

const initDragGuide = () => {
  const guide = document.querySelector('.about-drag-guide');
  if (!guide) return;

  let isPointerDown = false;
  let lastPoint = null;
  let dragDistance = 0;
  const hideThreshold = 120;

  const onPointerDown = (event) => {
    isPointerDown = true;
    lastPoint = { x: event.clientX, y: event.clientY };
    dragDistance = 0;
  };

  const onPointerMove = (event) => {
    if (!isPointerDown || !lastPoint) return;
    const dx = event.clientX - lastPoint.x;
    const dy = event.clientY - lastPoint.y;
    dragDistance += Math.hypot(dx, dy);
    lastPoint = { x: event.clientX, y: event.clientY };

    if (dragDistance >= hideThreshold) {
      guide.classList.add('is-hidden');
      cleanup();
    }
  };

  const onPointerUp = () => {
    isPointerDown = false;
    lastPoint = null;
  };

  const cleanup = () => {
    document.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
  };

  document.addEventListener('pointerdown', onPointerDown, { passive: true });
  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerup', onPointerUp, { passive: true });
  document.addEventListener('pointercancel', onPointerUp, { passive: true });
};

// ============================================
// 初期化
// ============================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initPageMotion();
    initThreeBackground();
    initDragGuide();
  });
} else {
  initPageMotion();
  initThreeBackground();
  initDragGuide();
}
