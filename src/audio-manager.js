const STORAGE_KEYS = {
  bgmEnabled: 'portfolio-bgm-enabled',
  bgmTime: 'portfolio-bgm-time',
};

const state = {
  bgm: null,
  bgmStarted: false,
  bgmContext: null,
  bgmBuffer: null,
  bgmSource: null,
  bgmGain: null,
  bgmFilter: null,
  bgmFilterEnabled: false,
  bgmFilterConfig: {
    frequency: 2200,
    q: 0.7,
  },
  bgmOffset: 0,
  bgmStartedAt: 0,
  bgmUsingWebAudio: false,
  bgmConfig: {
    src: '/audio/bgm.wav',
    volume: 0.7,
  },
  sfxConfig: {
    pageCurlStart: { src: '/audio/sfx/page-curl-start.wav', volume: 1 },
    aboutDragStart: { src: '/audio/sfx/about-drag-start.wav', volume: 1 },
    enter: { src: '/audio/sfx/enter.wav', volume: 1 },
  },
  sfxCache: new Map(),
  sfxLoops: new Map(),
  gestureBound: false,
  pagehideBound: false,
  toggleBound: false,
  toggles: [],
};

const readStoredValue = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
};

const writeStoredValue = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // ignore storage errors
  }
};

const isBgmEnabled = () => {
  const stored = readStoredValue(STORAGE_KEYS.bgmEnabled);
  if (stored === null) return false;
  return stored !== 'false' && stored !== '0';
};

const restoreBgmTime = (audio) => {
  const stored = readStoredValue(STORAGE_KEYS.bgmTime);
  if (!stored) return 0;
  const parsed = Number(stored);
  if (Number.isFinite(parsed) && parsed > 0) {
    if (audio) {
      try {
        audio.currentTime = parsed;
      } catch (error) {
        // ignore seek errors
      }
    }
    return parsed;
  }
  return 0;
};

const getBgmAudio = () => {
  if (state.bgm) return state.bgm;
  const audio = new Audio(state.bgmConfig.src);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = Math.max(0, Math.min(1, state.bgmConfig.volume));
  state.bgmOffset = restoreBgmTime(audio);
  state.bgm = audio;
  return audio;
};

const getBgmContext = () => {
  if (state.bgmContext) return state.bgmContext;
  const context = new (window.AudioContext || window.webkitAudioContext)();
  state.bgmContext = context;
  return context;
};

const loadBgmBuffer = async () => {
  if (state.bgmBuffer) return state.bgmBuffer;
  const response = await fetch(state.bgmConfig.src);
  const arrayBuffer = await response.arrayBuffer();
  const context = getBgmContext();
  const buffer = await context.decodeAudioData(arrayBuffer);
  state.bgmBuffer = buffer;
  return buffer;
};

const getBgmFilter = () => {
  if (state.bgmFilter) return state.bgmFilter;
  const context = getBgmContext();
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  state.bgmFilter = filter;
  return filter;
};

const applyBgmFilterConfig = () => {
  if (!state.bgmFilter) return;
  const { frequency, q } = state.bgmFilterConfig;
  const context = getBgmContext();
  const now = context.currentTime;
  if (Number.isFinite(frequency)) {
    state.bgmFilter.frequency.setTargetAtTime(
      Math.max(20, Math.min(20000, frequency)),
      now,
      0.03,
    );
  }
  if (Number.isFinite(q)) {
    state.bgmFilter.Q.setTargetAtTime(Math.max(0.1, q), now, 0.03);
  }
};

const reconnectBgmChain = () => {
  if (!state.bgmSource || !state.bgmGain || !state.bgmContext) return;
  try {
    state.bgmSource.disconnect();
  } catch (error) {
    // ignore disconnect errors
  }
  try {
    state.bgmGain.disconnect();
  } catch (error) {
    // ignore disconnect errors
  }
  if (state.bgmFilter) {
    try {
      state.bgmFilter.disconnect();
    } catch (error) {
      // ignore disconnect errors
    }
  }

  if (state.bgmFilterEnabled) {
    const filter = getBgmFilter();
    applyBgmFilterConfig();
    state.bgmSource.connect(filter).connect(state.bgmGain).connect(state.bgmContext.destination);
  } else {
    state.bgmSource.connect(state.bgmGain).connect(state.bgmContext.destination);
  }
};

const getBgmOffset = () => {
  if (state.bgmUsingWebAudio && state.bgmContext) {
    const elapsed = state.bgmContext.currentTime - state.bgmStartedAt;
    if (elapsed >= 0 && state.bgmBuffer?.duration) {
      return elapsed % state.bgmBuffer.duration;
    }
  }
  if (state.bgm) {
    return Number.isFinite(state.bgm.currentTime) ? state.bgm.currentTime : 0;
  }
  return state.bgmOffset || 0;
};

const stopBgmWebAudio = () => {
  if (!state.bgmSource) return;
  try {
    state.bgmSource.stop();
  } catch (error) {
    // ignore stop errors
  }
  try {
    state.bgmSource.disconnect();
  } catch (error) {
    // ignore disconnect errors
  }
  state.bgmSource = null;
  if (state.bgmFilter) {
    try {
      state.bgmFilter.disconnect();
    } catch (error) {
      // ignore disconnect errors
    }
  }
};

const startBgmWebAudio = (offset = 0) => {
  if (!state.bgmBuffer) return false;
  const context = getBgmContext();
  const source = context.createBufferSource();
  const gain = state.bgmGain || context.createGain();
  gain.gain.value = Math.max(0, Math.min(1, state.bgmConfig.volume));
  source.buffer = state.bgmBuffer;
  source.loop = true;
  source.loopStart = 0;
  source.loopEnd = state.bgmBuffer.duration;
  state.bgmSource = source;
  state.bgmGain = gain;
  reconnectBgmChain();
  source.start(0, offset);
  state.bgmStartedAt = context.currentTime - offset;
  return true;
};

const bindPagehide = () => {
  if (state.pagehideBound) return;
  state.pagehideBound = true;
  window.addEventListener('pagehide', () => {
    const time = getBgmOffset();
    if (Number.isFinite(time)) {
      writeStoredValue(STORAGE_KEYS.bgmTime, time.toFixed(2));
    }
  });
};

export const ensureBgmStart = async () => {
  if (state.bgmStarted) return true;
  if (!isBgmEnabled()) return false;
  try {
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      const context = getBgmContext();
      if (context.state === 'suspended') {
        await context.resume();
      }
      const buffer = await loadBgmBuffer();
      const storedOffset = state.bgmOffset || restoreBgmTime();
      const offset = buffer.duration
        ? (storedOffset % buffer.duration)
        : storedOffset;
      stopBgmWebAudio();
      if (!startBgmWebAudio(offset)) return false;
      state.bgmUsingWebAudio = true;
    } else {
      const audio = getBgmAudio();
      await audio.play();
      state.bgmUsingWebAudio = false;
    }
    state.bgmStarted = true;
    writeStoredValue(STORAGE_KEYS.bgmEnabled, 'true');
    return true;
  } catch (error) {
    return false;
  }
};

const setBgmEnabled = async (enabled, { save = true } = {}) => {
  const shouldEnable = Boolean(enabled);
  if (save) {
    writeStoredValue(STORAGE_KEYS.bgmEnabled, shouldEnable ? 'true' : 'false');
  }
  updateToggleUi(shouldEnable);
  if (!shouldEnable) {
    state.bgmOffset = getBgmOffset();
    stopAllLoopSfx();
    if (state.bgmUsingWebAudio) {
      stopBgmWebAudio();
    } else if (state.bgm) {
      try {
        state.bgm.pause();
      } catch (error) {
        // ignore pause errors
      }
    }
    return false;
  }
  return ensureBgmStart();
};

const updateToggleUi = (enabled) => {
  const toggles = state.toggles || [];
  toggles.forEach((button) => {
    const icon = button.querySelector('.audio-toggle-icon');
    const label = enabled ? '音声をミュート' : '音声をオン';
    if (icon) {
      icon.textContent = enabled ? 'volume_up' : 'volume_off';
    }
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    button.setAttribute('aria-label', label);
    button.dataset.audioState = enabled ? 'on' : 'off';
  });
};

const bindToggleButtons = () => {
  if (state.toggleBound) return;
  state.toggleBound = true;
  state.toggles = Array.from(document.querySelectorAll('.audio-toggle'));
  updateToggleUi(isBgmEnabled());

  state.toggles.forEach((button) => {
    button.addEventListener('click', () => {
      const nextEnabled = !isBgmEnabled();
      setBgmEnabled(nextEnabled);
    });
  });
};

const bindGestureStart = () => {
  if (state.gestureBound) return;
  state.gestureBound = true;

  const handler = () => {
    ensureBgmStart().then((started) => {
      if (started) {
        window.removeEventListener('pointerdown', handler);
        window.removeEventListener('touchstart', handler);
        window.removeEventListener('keydown', handler);
        state.gestureBound = false;
      }
    });
  };

  window.addEventListener('pointerdown', handler, { passive: true });
  window.addEventListener('touchstart', handler, { passive: true });
  window.addEventListener('keydown', handler);
};

export const initAudio = (config = {}) => {
  if (config?.bgm?.src) state.bgmConfig.src = config.bgm.src;
  if (Number.isFinite(config?.bgm?.volume)) {
    state.bgmConfig.volume = config.bgm.volume;
  }
  if (Number.isFinite(config?.bgm?.highCutFrequency)) {
    state.bgmFilterConfig.frequency = config.bgm.highCutFrequency;
  }
  if (Number.isFinite(config?.bgm?.highCutQ)) {
    state.bgmFilterConfig.q = config.bgm.highCutQ;
  }
  if (config?.sfx) {
    state.sfxConfig = { ...state.sfxConfig, ...config.sfx };
  }

  bindToggleButtons();
  bindGestureStart();
  bindPagehide();

  if (navigator.userActivation?.hasBeenActive) {
    ensureBgmStart();
  }
};

export const setBgmHighCut = (enabled, options = {}) => {
  state.bgmFilterEnabled = Boolean(enabled);
  if (Number.isFinite(options.frequency)) {
    state.bgmFilterConfig.frequency = options.frequency;
  }
  if (Number.isFinite(options.q)) {
    state.bgmFilterConfig.q = options.q;
  }
  if (!state.bgmUsingWebAudio) return;
  if (!state.bgmSource || !state.bgmGain) return;
  reconnectBgmChain();
};

const getSfxAudio = (key) => {
  const config = state.sfxConfig[key];
  if (!config) return null;
  if (state.sfxCache.has(key)) return state.sfxCache.get(key);
  const audio = new Audio(config.src);
  audio.preload = 'auto';
  audio.volume = Math.max(0, Math.min(1, config.volume ?? 1));
  state.sfxCache.set(key, audio);
  return audio;
};

export const playSfx = (key) => {
  if (!isBgmEnabled()) return;
  const base = getSfxAudio(key);
  if (!base) return;

  const audio = base.paused ? base : base.cloneNode(true);
  audio.volume = base.volume;
  try {
    audio.currentTime = 0;
  } catch (error) {
    // ignore seek errors
  }
  audio.play().catch(() => {});
};

const stopAllLoopSfx = () => {
  if (!state.sfxLoops.size) return;
  Array.from(state.sfxLoops.keys()).forEach((key) => stopLoopSfx(key));
};

export const startLoopSfx = (key) => {
  if (!isBgmEnabled()) return null;
  const config = state.sfxConfig[key];
  if (!config) return null;
  stopLoopSfx(key);
  const audio = new Audio(config.src);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = Math.max(0, Math.min(1, config.volume ?? 1));
  state.sfxLoops.set(key, audio);
  audio.play().catch(() => {});
  return audio;
};

export const stopLoopSfx = (key) => {
  const audio = state.sfxLoops.get(key);
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (error) {
    // ignore stop errors
  }
  state.sfxLoops.delete(key);
};
