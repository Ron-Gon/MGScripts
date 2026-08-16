// ==UserScript==
// @name         WPS&AC unified overlay
// @namespace    violentmonkey
// @version      1.0.0
// @description  Unified floating overlay for Canvas Autoclicker and Weather Pet Team Swapper
// @author       Awon Gemini
// @match        https://magiccircle.gg/r/*
// @match        https://magicgarden.gg/r/*
// @match        https://starweaver.org/r/*
// @uploadURL    https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/WPS&AC.user.js
// @downloadURL  https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/WPS&AC.user.js
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  'use strict';

  // ==========================================
  // CONFIGURATION & CONSTANTS
  // ==========================================
  const SSE_STREAM_URL = 'https://mg-api.ariedam.fr/live/weather/stream';
  const CLICK_INTERVAL = 600000; // 10 minutes (in ms)

  const KEY_MAPPING = {
    'AmberMoon': '1',
    'Snow': '2',
    'Thunderstorm': '3',
    'Clear Skies': '4',
    'Dawn': '5',
    'Rain': '4'
  };

  // State Variables
  let isClickerActive = false;
  let clickTimer = null;
  let isPetSwapEnabled = true;
  let isMinimized = false;

  // Cleanup old overlays if re-running
  ['mg-unified-overlay', 'canvas-clicker-target'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  // ==========================================
  // UNIVERSAL DRAGGABLE UTILITY
  // ==========================================
  function makeDraggable(element, handle = element, onSingleTap = null) {
    let isDragging = false;
    let hasMoved = false;
    let startX = 0, startY = 0;
    let offsetX = 0, offsetY = 0;

    function onDragStart(e) {
      if (e.target.tagName === 'BUTTON' && e.target !== handle) return;

      isDragging = true;
      hasMoved = false;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      startX = clientX;
      startY = clientY;

      const rect = element.getBoundingClientRect();
      offsetX = clientX - rect.left;
      offsetY = clientY - rect.top;
    }

    function onDragMove(e) {
      if (!isDragging) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      if (Math.hypot(clientX - startX, clientY - startY) > 5) {
        hasMoved = true;
      }

      element.style.left = `${clientX - offsetX}px`;
      element.style.top = `${clientY - offsetY}px`;
      element.style.right = 'auto';
    }

    function onDragEnd(e) {
      if (isDragging && !hasMoved && onSingleTap) {
        onSingleTap(e);
      }
      isDragging = false;
    }

    handle.addEventListener('mousedown', onDragStart);
    handle.addEventListener('touchstart', onDragStart, { passive: true });
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('touchmove', onDragMove, { passive: true });
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchend', onDragEnd);
  }

  // ==========================================
  // UI CONSTRUCTION
  // ==========================================

  // 1. Target Marker (Floating Crosshair for Autoclicker)
  const target = document.createElement('div');
  target.id = 'canvas-clicker-target';
  target.innerHTML = '+';
  Object.assign(target.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: '36px',
    height: '36px',
    marginTop: '-18px',
    marginLeft: '-18px',
    zIndex: '999998',
    backgroundColor: 'rgba(255, 0, 0, 0.4)',
    border: '2px solid red',
    borderRadius: '50%',
    color: 'white',
    fontSize: '24px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 8px rgba(0,0,0,0.5)',
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'move'
  });
  makeDraggable(target);

  // 2. Main Floating Panel & CSS
  const style = document.createElement('style');
  style.textContent = `
    #mg-unified-overlay {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 240px;
      z-index: 999999;
      background: rgba(20, 24, 33, 0.90);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      user-select: none;
      overflow: hidden;
      transition: width 0.2s ease;
      touch-action: none;
    }
    #mg-unified-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.06);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      cursor: move;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .mg-btn-icon {
      background: none;
      border: none;
      color: #a0aec0;
      cursor: pointer;
      padding: 2px 4px;
      font-size: 12px;
      line-height: 1;
      border-radius: 4px;
    }
    .mg-btn-icon:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }
    #mg-unified-body {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .mg-section-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #94a3b8;
      font-weight: 700;
      margin-bottom: -4px;
    }
    .mg-toggle-btn {
      width: 100%;
      padding: 7px;
      border-radius: 6px;
      border: none;
      font-weight: 700;
      font-size: 11px;
      cursor: pointer;
      transition: background-color 0.2s ease, transform 0.1s ease;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .mg-toggle-btn:active {
      transform: scale(0.98);
    }
    .btn-active {
      background-color: #10b981;
      color: #ffffff;
    }
    .btn-paused {
      background-color: #ef4444;
      color: #ffffff;
    }
    #mg-weather-log {
      background: rgba(0, 0, 0, 0.35);
      border-radius: 6px;
      padding: 6px 8px;
      font-family: monospace;
      font-size: 11px;
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    #mg-unified-overlay.minimized #mg-unified-body {
      display: none;
    }
    #mg-unified-overlay.minimized {
      width: 180px;
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'mg-unified-overlay';
  overlay.innerHTML = `
    <div id="mg-unified-header">
      <span>🛠️ MG Suite</span>
      <button id="mg-min-btn" class="mg-btn-icon" title="Minimize">—</button>
    </div>
    <div id="mg-unified-body">
      <!-- Autoclicker Module -->
      <div class="mg-section-title">Autoclicker</div>
      <button id="mg-clicker-btn" class="mg-toggle-btn btn-paused">Clicker: OFF</button>

      <!-- Weather Pet Swap Module -->
      <div class="mg-section-title">Pet Swapper</div>
      <button id="mg-weather-btn" class="mg-toggle-btn btn-active">Pet Swap: ACTIVE</button>
      <div id="mg-weather-log">Waiting for stream...</div>
    </div>
  `;

  const mount = () => {
    document.body.appendChild(target);
    document.body.appendChild(overlay);
  };
  if (document.body) mount();
  else window.addEventListener('DOMContentLoaded', mount);

  makeDraggable(overlay, overlay.querySelector('#mg-unified-header'));

  // Minimize Toggle
  const minBtn = overlay.querySelector('#mg-min-btn');
  minBtn.addEventListener('click', () => {
    isMinimized = !isMinimized;
    overlay.classList.toggle('minimized', isMinimized);
    minBtn.textContent = isMinimized ? '┼' : '—';
  });

  // ==========================================
  // AUTOCLICKER CORE LOGIC
  // ==========================================
  function performClickAtTarget() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const targetRect = target.getBoundingClientRect();
    const centerX = targetRect.left + targetRect.width / 2;
    const centerY = targetRect.top + targetRect.height / 2;

    const eventParams = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: centerX,
      clientY: centerY,
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true
    };

    target.style.pointerEvents = 'none';
    overlay.style.pointerEvents = 'none';

    const hitElement = document.elementFromPoint(centerX, centerY) || canvas;

    hitElement.dispatchEvent(new PointerEvent('pointerdown', eventParams));
    hitElement.dispatchEvent(new PointerEvent('pointerup', eventParams));
    hitElement.dispatchEvent(new MouseEvent('click', eventParams));

    target.style.pointerEvents = 'auto';
    overlay.style.pointerEvents = 'auto';
  }

  const clickerBtn = overlay.querySelector('#mg-clicker-btn');
  clickerBtn.addEventListener('click', () => {
    isClickerActive = !isClickerActive;

    if (isClickerActive) {
      clickerBtn.textContent = 'Clicker: ON';
      clickerBtn.className = 'mg-toggle-btn btn-active';
      target.style.backgroundColor = 'rgba(0, 255, 0, 0.4)';
      target.style.borderColor = '#00ff00';

      performClickAtTarget();
      clickTimer = setInterval(performClickAtTarget, CLICK_INTERVAL);
    } else {
      clickerBtn.textContent = 'Clicker: OFF';
      clickerBtn.className = 'mg-toggle-btn btn-paused';
      target.style.backgroundColor = 'rgba(255, 0, 0, 0.4)';
      target.style.borderColor = 'red';

      clearInterval(clickTimer);
      clickTimer = null;
    }
  });

  // ==========================================
  // PET SWAPPER CORE LOGIC
  // ==========================================
  const petSwapBtn = overlay.querySelector('#mg-weather-btn');
  petSwapBtn.addEventListener('click', () => {
    isPetSwapEnabled = !isPetSwapEnabled;
    if (isPetSwapEnabled) {
      petSwapBtn.textContent = 'Pet Swap: ACTIVE';
      petSwapBtn.className = 'mg-toggle-btn btn-active';
    } else {
      petSwapBtn.textContent = 'Pet Swap: PAUSED';
      petSwapBtn.className = 'mg-toggle-btn btn-paused';
    }
  });

  function updateLog(text) {
    const logEl = overlay.querySelector('#mg-weather-log');
    if (logEl) logEl.textContent = text;
  }

  function triggerCtrlKeypress(digit) {
    const charCode = 48 + parseInt(digit, 10);
    const keyData = {
      key: digit,
      code: `Digit${digit}`,
      keyCode: charCode,
      which: charCode,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window
    };

    const activeTarget = document.activeElement || document;
    activeTarget.dispatchEvent(new KeyboardEvent('keydown', keyData));
    activeTarget.dispatchEvent(new KeyboardEvent('keypress', keyData));
    activeTarget.dispatchEvent(new KeyboardEvent('keyup', keyData));
  }

  function connectStream() {
    const eventSource = new EventSource(SSE_STREAM_URL);

    eventSource.addEventListener('weather', (event) => {
      try {
        const payload = JSON.parse(event.data);
        const weatherType = payload.weather;
        const keyDigit = KEY_MAPPING[weatherType];

        if (!isPetSwapEnabled) {
          updateLog(`[Paused] ${weatherType}`);
          return;
        }

        if (keyDigit) {
          updateLog(`🌦️ ${weatherType} (Ctrl+${keyDigit})`);
          triggerCtrlKeypress(keyDigit);
        } else {
          updateLog(`❓ ${weatherType} (No Key)`);
        }
      } catch (err) {
        console.error('[Weather Stream] Failed to parse payload:', err);
      }
    });

    eventSource.onerror = () => {
      updateLog('⚠️ Reconnecting...');
    };
  }

  connectStream();
})();
