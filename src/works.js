import './common.css';
import './works.css';
import { gsap } from 'gsap';
import { initAudio, playSfx, setBgmHighCut } from './audio-manager.js';

// ============================================
// 作品データ
// ============================================
const fallbackWorksData = {
  development: [
    {
      id: 'dev-1',
      title: 'Web Application',
      description: 'ReactとTypeScriptを使用したモダンなWebアプリケーション',
      tags: ['React', 'TypeScript', 'Node.js'],
      image: null,
      images: []
    },
    {
      id: 'dev-2',
      title: 'API Service',
      description: 'RESTful APIとGraphQLを組み合わせたバックエンドサービス',
      tags: ['GraphQL', 'Express', 'MongoDB'],
      image: null,
      images: []
    },
    {
      id: 'dev-3',
      title: 'Mobile App',
      description: 'React Nativeで開発したクロスプラットフォームアプリ',
      tags: ['React Native', 'Firebase'],
      image: null,
      images: []
    }
  ],
  design: [
    {
      id: 'design-1',
      title: 'Brand Identity',
      description: '企業ブランドのビジュアルアイデンティティデザイン',
      tags: ['Branding', 'Logo Design'],
      image: null,
      images: []
    },
    {
      id: 'design-2',
      title: 'UI/UX Design',
      description: 'ユーザー体験を重視したインターフェースデザイン',
      tags: ['UI Design', 'UX Research'],
      image: null,
      images: []
    }
  ],
  music: [
    {
      id: 'music-1',
      title: 'Original Composition',
      description: 'オリジナル楽曲の制作とアレンジ',
      tags: ['Composition', 'Arrangement'],
      image: null,
      images: []
    },
    {
      id: 'music-2',
      title: 'Sound Design',
      description: 'ゲームや映像作品のためのサウンドデザイン',
      tags: ['Sound Design', 'Foley'],
      image: null,
      images: []
    }
  ],
  project: [
    {
      id: 'project-1',
      title: 'Portfolio Website',
      description: 'このポートフォリオサイト自体の制作',
      tags: ['Three.js', 'GSAP', 'Web Design'],
      image: null,
      images: []
    },
    {
      id: 'project-2',
      title: 'Open Source',
      description: 'オープンソースプロジェクトへの貢献',
      tags: ['Open Source', 'GitHub'],
      image: null
    }
  ]
};

const validCategories = ['development', 'design', 'music', 'project'];
let worksData = JSON.parse(JSON.stringify(fallbackWorksData));
let worksDataLoaded = false;
let worksDataLoadingPromise = null;

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.filter(tag => typeof tag === 'string' && tag.trim()).map(tag => tag.trim());
  }
  if (typeof tags === 'string') {
    return tags.split(',').map(tag => tag.trim()).filter(Boolean);
  }
  return [];
}

function normalizeImages(item) {
  const candidates = [
    item?.images,
    item?.relatedImages,
    item?.gallery
  ];
  const images = candidates
    .filter(Array.isArray)
    .flat()
    .filter((image) => typeof image === 'string' && image.trim())
    .map((image) => image.trim());

  const primaryImage = typeof item?.image === 'string' ? item.image.trim() : '';
  if (primaryImage && !images.includes(primaryImage)) {
    images.unshift(primaryImage);
  }
  return images;
}

function normalizeLinks(links) {
  if (!Array.isArray(links)) return [];
  return links
    .map((link) => {
      if (typeof link === 'string') {
        return { label: link.replace(/^https?:\/\//, ''), url: link };
      }
      if (link && typeof link === 'object') {
        const url = typeof link.url === 'string'
          ? link.url
          : (typeof link.href === 'string' ? link.href : '');
        const label = typeof link.label === 'string'
          ? link.label
          : (typeof link.title === 'string' ? link.title : url);
        if (!url) return null;
        return { label, url };
      }
      return null;
    })
    .filter(Boolean);
}

function normalizeItem(item, fallbackId) {
  const title = typeof item?.title === 'string' ? item.title : '';
  if (!title) return null;

  const description = typeof item?.description === 'string' ? item.description : '';
  const image = typeof item?.image === 'string'
    ? item.image
    : (typeof item?.imageUrl === 'string' ? item.imageUrl : null);
  const images = normalizeImages(item);
  const primaryImage = image || images[0] || null;
  const links = normalizeLinks(item?.links || item?.relatedLinks);

  return {
    id: typeof item?.id === 'string' ? item.id : fallbackId,
    title,
    description,
    tags: normalizeTags(item?.tags),
    image: primaryImage,
    images,
    links
  };
}

async function loadWorksData() {
  if (worksDataLoaded) return worksData;
  if (worksDataLoadingPromise) return worksDataLoadingPromise;

  worksDataLoadingPromise = (async () => {
    try {
      const response = await fetch('/content/works.json', { cache: 'no-store' });
      if (!response.ok) {
        worksDataLoaded = true;
        return worksData;
      }

      const rawData = await response.json();
      const freshData = {};

      validCategories.forEach((category) => {
        const list = Array.isArray(rawData?.[category]) ? rawData[category] : [];
        freshData[category] = list
          .map((item, index) => normalizeItem(item, `${category}-${index + 1}`))
          .filter(Boolean);
      });

      const hasAny = Object.values(freshData).some(list => list.length > 0);
      if (hasAny) {
        worksData = freshData;
      }
    } catch (error) {
      console.error('Failed to load works data:', error);
    }

    worksDataLoaded = true;
    return worksData;
  })();

  return worksDataLoadingPromise;
}

// ============================================
// 作品一覧の表示・操作
// ============================================

// 作品一覧を表示
async function showWorksList(category) {
  const worksListContainer = document.querySelector('.works-list-container');
  const worksListTitle = document.querySelector('.works-list-title');
  const worksListItems = document.querySelector('.works-list-items');
  
  if (!worksListContainer || !worksListTitle || !worksListItems) {
    console.error('作品一覧の要素が見つかりません');
    return;
  }
  
  const categoryNames = {
    development: 'Development',
    design: 'Design',
    music: 'Music',
    project: 'Project'
  };
  
  worksListTitle.textContent = categoryNames[category] || 'Works';
  
  worksListItems.innerHTML = '<div class="works-list-message">Loading...</div>';

  await loadWorksData();

  const items = worksData[category] || [];
  console.log('カテゴリー:', category, '作品数:', items.length);

  worksListItems.innerHTML = '';

  if (!items.length) {
    worksListItems.innerHTML = '<div class="works-list-message">準備中です</div>';
  } else {
    items.forEach(item => {
      const itemElement = createWorksItem(item);
      worksListItems.appendChild(itemElement);
    });
  }

  console.log('作品アイテム数:', worksListItems.children.length);
  
  worksListContainer.setAttribute('aria-hidden', 'false');
  worksListContainer.classList.add('is-visible');
  worksListContainer.scrollTop = 0;
  setWorksListMuffle(true);
}

// 作品アイテムを作成
function createWorksItem(item) {
  const itemElement = document.createElement('div');
  itemElement.className = 'works-item';
  itemElement.dataset.workId = item.id;
  
  // 画像の有無に応じてHTMLを生成
  const thumbnail = item.images?.[0] || item.image;
  const image = thumbnail 
    ? `<img src="${thumbnail}" alt="${item.title}" class="works-item-image">`
    : `<div class="works-item-image no-image">noimage</div>`;
  
  // タグのHTML生成
  const tags = item.tags.map(tag => 
    `<span class="works-item-tag">${tag}</span>`
  ).join('');
  
  // 新しいレイアウト：画像の上にコンテンツをオーバーレイ
  itemElement.innerHTML = `
    ${image}
    <div class="works-item-content">
      <h3 class="works-item-title">${item.title}</h3>
      <p class="works-item-description">${item.description}</p>
      <div class="works-item-tags">${tags}</div>
    </div>
  `;

  itemElement.addEventListener('click', () => {
    openWorksDetailOverlay(item);
  });
  
  return itemElement;
}

let lastExpandedCorner = null;
let overlayClickHandlerAttached = false;
let worksListMuffled = false;

const setWorksListMuffle = (enabled) => {
  if (worksListMuffled === enabled) return;
  worksListMuffled = enabled;
  setBgmHighCut(enabled, { frequency: 600, q: 0.7 });
};

// 作品一覧を閉じる
function closeWorksList() {
  const worksPage = document.querySelector('.works-page');
  const worksListContainer = document.querySelector('.works-list-container');
  if (!worksListContainer) return;
  
  worksListContainer.classList.remove('is-visible');
  worksListContainer.setAttribute('aria-hidden', 'true');
  setWorksListMuffle(false);
  closeWorksDetailOverlay();
  
  if (worksPage) {
    worksPage.classList.remove('is-expanding');
    worksPage.removeAttribute('data-active-corner');
  }
  
  if (typeof window.resetPageCurlSizesStaggered === 'function') {
    window.resetPageCurlSizesStaggered(lastExpandedCorner);
  } else {
    resetAllCurls();
  }
  lastExpandedCorner = null;
}

// すべてのページカールを元のサイズに戻す
function resetAllCurls() {
  // resetPageCurlSizes関数を呼び出して、curlSizesを更新してclip-pathもアニメーション付きで戻す
  if (typeof window.resetPageCurlSizes === 'function') {
    window.resetPageCurlSizes(true); // トランジション付きで戻す
  }
}

function getOverlayElements() {
  const overlay = document.querySelector('.works-detail-overlay');
  if (!overlay) return null;
  const title = overlay.querySelector('.works-detail-title');
  const description = overlay.querySelector('.works-detail-description');
  const gallery = overlay.querySelector('.works-detail-gallery');
  const links = overlay.querySelector('.works-detail-links');
  return { overlay, title, description, gallery, links };
}

function openWorksDetailOverlay(item) {
  const elements = getOverlayElements();
  if (!elements) return;
  const { overlay, title, description, gallery, links } = elements;

  title.textContent = item.title || '';
  description.textContent = item.description || '';

  gallery.innerHTML = '';
  if (item.images?.length) {
    item.images.forEach((src) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'works-detail-image';
      const img = document.createElement('img');
      img.src = src;
      img.alt = item.title;
      wrapper.appendChild(img);
      gallery.appendChild(wrapper);
    });
  } else {
    const empty = document.createElement('div');
    empty.className = 'works-detail-image no-image';
    empty.textContent = 'noimage';
    gallery.appendChild(empty);
  }

  links.innerHTML = '';
  if (item.links?.length) {
    item.links.forEach((link) => {
      const anchor = document.createElement('a');
      anchor.className = 'works-detail-link';
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      anchor.textContent = link.label || link.url;
      links.appendChild(anchor);
    });
  } else {
    const empty = document.createElement('p');
    empty.className = 'works-detail-empty';
    empty.textContent = '関連リンクは準備中です。';
    links.appendChild(empty);
  }

  overlay.classList.add('is-visible');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeWorksDetailOverlay() {
  const elements = getOverlayElements();
  if (!elements) return;
  const { overlay } = elements;
  if (!overlay.classList.contains('is-visible')) return;
  overlay.classList.remove('is-visible');
  overlay.setAttribute('aria-hidden', 'true');
}

// 作品一覧の初期化
function initWorksList() {
  const worksListContainer = document.querySelector('.works-list-container');
  const worksCloseBtn = document.querySelector('.works-close-btn');
  const worksDetailOverlay = document.querySelector('.works-detail-overlay');
  
  if (!worksListContainer) return;
  
  // 閉じるボタンが存在する場合のみイベントリスナーを設定
  if (worksCloseBtn) {
    worksCloseBtn.addEventListener('click', closeWorksList);
  }
  
  worksListContainer.addEventListener('click', (e) => {
    if (e.target === worksListContainer) {
      closeWorksList();
    }
  });

  if (worksDetailOverlay && !overlayClickHandlerAttached) {
    worksDetailOverlay.addEventListener('click', () => {
      closeWorksDetailOverlay();
    });
    overlayClickHandlerAttached = true;
  }
}

// ============================================
// 付箋の捲れた部分をドラッグで操作する機能
// ============================================
function initPageCurlDrag() {
  const pageCurls = document.querySelectorAll('.page-curl');
  const worksPageBackground = document.querySelector('.works-page-background');
  const worksPage = document.querySelector('.works-page');
  const shadows = {
    topLeft: document.querySelector('.page-curl-shadow-top-left'),
    topRight: document.querySelector('.page-curl-shadow-top-right'),
    bottomLeft: document.querySelector('.page-curl-shadow-bottom-left'),
    bottomRight: document.querySelector('.page-curl-shadow-bottom-right')
  };
  
  if (!worksPageBackground) return;
  
  const BASE_CURL = {
    size: 95,
    min: 12,
    max: 340,
    threshold: 200
  };
  
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  
  const getCurlScale = () => {
    const aspect = window.innerWidth / window.innerHeight;
    const baseAspect = 16 / 9;
    const aspectScale = Math.sqrt(aspect / baseAspect);
    return clamp(aspectScale * 1.1, 0.65, 1.45);
  };
  
  const getCurlConfig = () => {
    const scale = getCurlScale();
    return {
      scale,
      initialSize: Math.round(BASE_CURL.size * scale),
      minSize: Math.round(BASE_CURL.min * scale),
      maxSize: Math.round(BASE_CURL.max * scale),
      threshold: Math.round(BASE_CURL.threshold * scale)
    };
  };
  
  let curlConfig = getCurlConfig();
  
  const curlSizes = {
    topLeft: { x: curlConfig.initialSize, y: curlConfig.initialSize },
    topRight: { x: curlConfig.initialSize, y: curlConfig.initialSize },
    bottomLeft: { x: curlConfig.initialSize, y: curlConfig.initialSize },
    bottomRight: { x: curlConfig.initialSize, y: curlConfig.initialSize }
  };
  
  const updateClipPath = (withTransition = false, duration = 0.15) => {
    const { topLeft, topRight, bottomLeft, bottomRight } = curlSizes;
    
    if (withTransition) {
      const easing = duration > 0.3 ? 'cubic-bezier(0.4, 0, 0.2, 1)' : 'ease-out';
      worksPageBackground.style.transition = `clip-path ${duration}s ${easing}`;
      Object.values(shadows).forEach(shadow => {
        if (shadow) shadow.style.transition = `width ${duration}s ${easing}, height ${duration}s ${easing}`;
      });
    }
    
    const clipPath = `polygon(
      0 ${topLeft.y}px,
      ${topLeft.x}px 0,
      calc(100% - ${topRight.x}px) 0,
      100% ${topRight.y}px,
      100% calc(100% - ${bottomRight.y}px),
      calc(100% - ${bottomRight.x}px) 100%,
      ${bottomLeft.x}px 100%,
      0 calc(100% - ${bottomLeft.y}px),
      0 ${topLeft.y}px
    )`;
    worksPageBackground.style.clipPath = clipPath;
    
    const shadowMultiplier = 3;
    if (shadows.topLeft) {
      const tlSize = (topLeft.x + topLeft.y) / 2;
      shadows.topLeft.style.width = `${tlSize * shadowMultiplier}px`;
      shadows.topLeft.style.height = `${tlSize * shadowMultiplier}px`;
    }
    if (shadows.topRight) {
      const trSize = (topRight.x + topRight.y) / 2;
      shadows.topRight.style.width = `${trSize * shadowMultiplier}px`;
      shadows.topRight.style.height = `${trSize * shadowMultiplier}px`;
    }
    if (shadows.bottomLeft) {
      const blSize = (bottomLeft.x + bottomLeft.y) / 2;
      shadows.bottomLeft.style.width = `${blSize * shadowMultiplier}px`;
      shadows.bottomLeft.style.height = `${blSize * shadowMultiplier}px`;
    }
    if (shadows.bottomRight) {
      const brSize = (bottomRight.x + bottomRight.y) / 2;
      shadows.bottomRight.style.width = `${brSize * shadowMultiplier}px`;
      shadows.bottomRight.style.height = `${brSize * shadowMultiplier}px`;
    }
    
    if (withTransition) {
      setTimeout(() => {
        worksPageBackground.style.transition = '';
        Object.values(shadows).forEach(shadow => {
          if (shadow) shadow.style.transition = '';
        });
      }, duration * 1000);
    }
  };
  
  const applyCurlSize = (corner, size, curlElement, withTransition = false, duration = 0.15) => {
    curlSizes[corner] = { x: size, y: size };
    
    if (curlElement) {
      if (withTransition) {
        curlElement.style.transition = `border-width ${duration}s ease-out`;
      }
      
      if (corner === 'topLeft') {
        curlElement.style.borderWidth = `0 0 ${size}px ${size}px`;
      } else if (corner === 'topRight') {
        curlElement.style.borderWidth = `0 ${size}px ${size}px 0`;
      } else if (corner === 'bottomLeft') {
        curlElement.style.borderWidth = `0 ${size}px ${size}px 0`;
      } else if (corner === 'bottomRight') {
        curlElement.style.borderWidth = `0 0 ${size}px ${size}px`;
      }
      
      if (withTransition) {
        setTimeout(() => {
          curlElement.style.transition = '';
        }, duration * 1000);
      }
    }
  };
  
  pageCurls.forEach((curl) => {
    let isDragging = false;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let currentSize = 0;
    
    // 対応するシャドウ要素を取得
    let correspondingShadow = null;
    if (curl.classList.contains('page-curl-top-left')) {
      correspondingShadow = shadows.topLeft;
    } else if (curl.classList.contains('page-curl-top-right')) {
      correspondingShadow = shadows.topRight;
    } else if (curl.classList.contains('page-curl-bottom-left')) {
      correspondingShadow = shadows.bottomLeft;
    } else if (curl.classList.contains('page-curl-bottom-right')) {
      correspondingShadow = shadows.bottomRight;
    }
    
    // ホバーイベント
    curl.addEventListener('mouseenter', () => {
      if (correspondingShadow) {
        correspondingShadow.classList.add('hover');
      }
    });
    
    curl.addEventListener('mouseleave', () => {
      if (correspondingShadow) {
        correspondingShadow.classList.remove('hover');
      }
    });
    
    const handleStart = (e) => {
      isDragging = true;
      hasMoved = false;
      const point = e.touches ? e.touches[0] : e;
      startX = point.clientX;
      startY = point.clientY;
      playSfx('pageCurlStart');

      if (worksPage) {
        worksPage.classList.add('is-dragging');
      }
      
      // ドラッグ開始時にホバースタイルを削除
      if (correspondingShadow) {
        correspondingShadow.classList.remove('hover');
      }
      
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.body.style.mozUserSelect = 'none';
      document.body.style.msUserSelect = 'none';
      
      if (curl.classList.contains('page-curl-top-left')) {
        currentSize = { x: curlSizes.topLeft.x, y: curlSizes.topLeft.y };
      } else if (curl.classList.contains('page-curl-top-right')) {
        currentSize = { x: curlSizes.topRight.x, y: curlSizes.topRight.y };
      } else if (curl.classList.contains('page-curl-bottom-left')) {
        currentSize = { x: curlSizes.bottomLeft.x, y: curlSizes.bottomLeft.y };
      } else if (curl.classList.contains('page-curl-bottom-right')) {
        currentSize = { x: curlSizes.bottomRight.x, y: curlSizes.bottomRight.y };
      }
    };
    
    const handleMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const point = e.touches ? e.touches[0] : e;
      const deltaX = point.clientX - startX;
      const deltaY = point.clientY - startY;
      
      // 5px以上動いたらドラッグとみなす
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMoved = true;
      }
      
      let newSizeX, newSizeY;
      if (curl.classList.contains('page-curl-top-left')) {
        newSizeX = currentSize.x + deltaX;
        newSizeY = currentSize.y + deltaY;
      } else if (curl.classList.contains('page-curl-top-right')) {
        newSizeX = currentSize.x - deltaX;
        newSizeY = currentSize.y + deltaY;
      } else if (curl.classList.contains('page-curl-bottom-left')) {
        newSizeX = currentSize.x + deltaX;
        newSizeY = currentSize.y - deltaY;
      } else if (curl.classList.contains('page-curl-bottom-right')) {
        newSizeX = currentSize.x - deltaX;
        newSizeY = currentSize.y - deltaY;
      }
      
      newSizeX = clamp(newSizeX, curlConfig.minSize, curlConfig.maxSize);
      newSizeY = clamp(newSizeY, curlConfig.minSize, curlConfig.maxSize);
      
      if (curl.classList.contains('page-curl-top-left')) {
        curlSizes.topLeft = { x: newSizeX, y: newSizeY };
        curl.style.borderWidth = `0 0 ${newSizeY}px ${newSizeX}px`;
      } else if (curl.classList.contains('page-curl-top-right')) {
        curlSizes.topRight = { x: newSizeX, y: newSizeY };
        curl.style.borderWidth = `0 ${newSizeX}px ${newSizeY}px 0`;
      } else if (curl.classList.contains('page-curl-bottom-left')) {
        curlSizes.bottomLeft = { x: newSizeX, y: newSizeY };
        curl.style.borderWidth = `0 ${newSizeX}px ${newSizeY}px 0`;
      } else if (curl.classList.contains('page-curl-bottom-right')) {
        curlSizes.bottomRight = { x: newSizeX, y: newSizeY };
        curl.style.borderWidth = `0 0 ${newSizeY}px ${newSizeX}px`;
      }
      
      updateClipPath();
    };
    
    const handleEnd = () => {
      if (!isDragging) return;
      isDragging = false;

      if (worksPage) {
        worksPage.classList.remove('is-dragging');
      }
      
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.mozUserSelect = '';
      document.body.style.msUserSelect = '';
      
      // クリックの場合（ドラッグしていない場合）は直接作品一覧を表示
      if (!hasMoved) {
        const currentCorner = curl.classList.contains('page-curl-top-left')
          ? 'topLeft'
          : curl.classList.contains('page-curl-top-right')
            ? 'topRight'
            : curl.classList.contains('page-curl-bottom-left')
              ? 'bottomLeft'
              : 'bottomRight';
        resetCurlSize(currentCorner, curl);
        return;
      }
      
      const THRESHOLD = curlConfig.threshold;
      let currentCorner = '';
      let currentAverageSize = 0;
      let category = '';
      
      if (curl.classList.contains('page-curl-top-left')) {
        currentCorner = 'topLeft';
        currentAverageSize = (curlSizes.topLeft.x + curlSizes.topLeft.y) / 2;
        category = 'Development';
      } else if (curl.classList.contains('page-curl-top-right')) {
        currentCorner = 'topRight';
        currentAverageSize = (curlSizes.topRight.x + curlSizes.topRight.y) / 2;
        category = 'Design';
      } else if (curl.classList.contains('page-curl-bottom-left')) {
        currentCorner = 'bottomLeft';
        currentAverageSize = (curlSizes.bottomLeft.x + curlSizes.bottomLeft.y) / 2;
        category = 'Music';
      } else if (curl.classList.contains('page-curl-bottom-right')) {
        currentCorner = 'bottomRight';
        currentAverageSize = (curlSizes.bottomRight.x + curlSizes.bottomRight.y) / 2;
        category = 'Project';
      }
      
      if (currentAverageSize >= THRESHOLD) {
        expandToFullScreen(currentCorner, curl, category.toLowerCase());
      } else {
        resetCurlSize(currentCorner, curl);
      }
    };
    
    const expandToFullScreen = (corner, curlElement, category) => {
      const screenDiagonal = Math.sqrt(
        window.innerWidth ** 2 + window.innerHeight ** 2
      );
      const fullSize = Math.ceil(screenDiagonal * 1.5);
      
      if (worksPage) {
        worksPage.classList.add('is-expanding');
        worksPage.setAttribute('data-active-corner', corner.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`));
      }
      
      lastExpandedCorner = corner;
      
      Object.keys(curlSizes).forEach((key) => {
        if (key !== corner) {
          curlSizes[key] = { x: 0, y: 0 };
        }
      });
      
      const findCornerForCurl = (targetCurl) => {
        if (targetCurl.classList.contains('page-curl-top-left')) return 'topLeft';
        if (targetCurl.classList.contains('page-curl-top-right')) return 'topRight';
        if (targetCurl.classList.contains('page-curl-bottom-left')) return 'bottomLeft';
        return 'bottomRight';
      };
      
      pageCurls.forEach((otherCurl) => {
        const otherCorner = findCornerForCurl(otherCurl);
        if (otherCorner !== corner) {
          applyCurlSize(otherCorner, 0, otherCurl, false);
        }
      });
      
      curlSizes[corner] = { x: fullSize, y: fullSize };
      
      curlElement.style.transition = 'border-width 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      
      if (corner === 'topLeft') {
        curlElement.style.borderWidth = `0 0 ${fullSize}px ${fullSize}px`;
      } else if (corner === 'topRight') {
        curlElement.style.borderWidth = `0 ${fullSize}px ${fullSize}px 0`;
      } else if (corner === 'bottomLeft') {
        curlElement.style.borderWidth = `0 ${fullSize}px ${fullSize}px 0`;
      } else if (corner === 'bottomRight') {
        curlElement.style.borderWidth = `0 0 ${fullSize}px ${fullSize}px`;
      }
      
      updateClipPath(true, 0.6);
      
      setTimeout(() => {
        curlElement.style.transition = '';
        showWorksList(category);
        if (worksPage) {
          worksPage.classList.remove('is-expanding');
          worksPage.removeAttribute('data-active-corner');
        }
      }, 600);
    };
    
    const resetCurlSize = (corner, curlElement) => {
      const { initialSize } = curlConfig;
      applyCurlSize(corner, initialSize, curlElement, true, 0.15);
      updateClipPath(true);
    };
    
    curl.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    
    curl.addEventListener('touchstart', handleStart, { passive: false });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  });
  
  updateClipPath();
  
  window.resetPageCurlSizes = (withTransition = false) => {
    curlConfig = getCurlConfig();
    const { initialSize } = curlConfig;
    
    pageCurls.forEach(curl => {
      if (curl.classList.contains('page-curl-top-left')) {
        applyCurlSize('topLeft', initialSize, curl, withTransition, 0.3);
      } else if (curl.classList.contains('page-curl-top-right')) {
        applyCurlSize('topRight', initialSize, curl, withTransition, 0.3);
      } else if (curl.classList.contains('page-curl-bottom-left')) {
        applyCurlSize('bottomLeft', initialSize, curl, withTransition, 0.3);
      } else if (curl.classList.contains('page-curl-bottom-right')) {
        applyCurlSize('bottomRight', initialSize, curl, withTransition, 0.3);
      }
    });
    
    // clip-pathをトランジション付きで更新
    updateClipPath(withTransition, 0.3);
  };

  window.resetPageCurlSizesStaggered = (activeCorner, duration = 0.35) => {
    curlConfig = getCurlConfig();
    const { initialSize } = curlConfig;
    const delay = Math.round((duration * 1000) + 80);
    
    if (!activeCorner) {
      window.resetPageCurlSizes(true);
      return;
    }
    
    const findCornerForCurl = (curl) => {
      if (curl.classList.contains('page-curl-top-left')) return 'topLeft';
      if (curl.classList.contains('page-curl-top-right')) return 'topRight';
      if (curl.classList.contains('page-curl-bottom-left')) return 'bottomLeft';
      return 'bottomRight';
    };
    
    const activeCurl = Array.from(pageCurls).find(curl => findCornerForCurl(curl) === activeCorner);
    if (!activeCurl) {
      window.resetPageCurlSizes(true);
      return;
    }
    
    applyCurlSize(activeCorner, initialSize, activeCurl, true, duration);
    updateClipPath(true, duration);
    
    setTimeout(() => {
      pageCurls.forEach((curl) => {
        const corner = findCornerForCurl(curl);
        if (corner !== activeCorner) {
          applyCurlSize(corner, 0, curl, false);
          applyCurlSize(corner, initialSize, curl, true, duration);
        }
      });
      updateClipPath(true, duration);
    }, delay);
  };
  
  window.addEventListener('resize', () => {
    window.resetPageCurlSizes(true);
  });
  
  // 初期サイズを画面比率に合わせて反映
  window.resetPageCurlSizes(false);
}

// ============================================
// 初期化
// ============================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    initWorksList();
    initPageCurlDrag();
    
    // テスト用：URLパラメータでカテゴリーを指定した場合は自動表示
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    if (category && validCategories.includes(category)) {
      setTimeout(() => showWorksList(category), 100);
    }
  });
} else {
  initAudio();
  initWorksList();
  initPageCurlDrag();
  
  // テスト用：URLパラメータでカテゴリーを指定した場合は自動表示
  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get('category');
  if (category && validCategories.includes(category)) {
    setTimeout(() => showWorksList(category), 100);
  }
}
