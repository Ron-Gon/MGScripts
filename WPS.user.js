// ==UserScript==
// @name         Weather Pet Swap
// @namespace    violentmonkey
// @version      1.0.2
// @description  Auto swap pet teams per weather via keybind with AriesMod
// @author       AWON Gemini
// @match        https://magiccircle.gg/r/*
// @match        https://magicgarden.gg/r/*
// @match        https://starweaver.org/r/*
// @grant        none
// @uploadURL    https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/WPS.user.js
// @downloadURL  https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/WPS.user.js
// ==/UserScript==

(function () {
  'use strict';

  const SSE_STREAM_URL = 'https://magicgarden.gg/platform/v1/weather';

  const KEY_MAPPING = {
    'Amber Moon': '1',
    'AmberMoon': '1',
    'Snow': '2',
    'Frost': '2',
    'Thunderstorm': '3',
    'null': '4',
    'Clear Skies': '4',
    'Dawn': '5',
    'Rain': '4'
  };

  let isEnabled = true;
  let isMinimized = false;

  /**
   * Inject floating overlay container, CSS, and UI components.
   */
  function createOverlayUI() {
    // Inject custom stylesheet for the overlay
    const style = document.createElement('style');
    style.textContent = `
      #mg-weather-overlay {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 240px;
        z-index: 999999;
        background: rgba(20, 24, 33, 0.88);
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
        transition: height 0.2s ease, width 0.2s ease;
        touch-action: none; /* Prevents touch scrolling while dragging */
      }
      #mg-weather-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.06);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        cursor: move;
        font-weight: 600;
        letter-spacing: 0.5px;
        touch-action: none;
      }
      #mg-weather-header-title {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .mg-weather-btn-icon {
        background: none;
        border: none;
        color: #a0aec0;
        cursor: pointer;
        padding: 2px 4px;
        font-size: 12px;
        line-height: 1;
        border-radius: 4px;
      }
      .mg-weather-btn-icon:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.1);
      }
      #mg-weather-body {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #mg-weather-toggle-btn {
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
      #mg-weather-toggle-btn:active {
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
      #mg-weather-overlay.minimized #mg-weather-body {
        display: none;
      }
      #mg-weather-overlay.minimized {
        width: 180px;
      }
    `;
    document.head.appendChild(style);

    // Build DOM structure
    const overlay = document.createElement('div');
    overlay.id = 'mg-weather-overlay';
    overlay.innerHTML = `
      <div id="mg-weather-header">
        <div id="mg-weather-header-title">
          <span>🌦️ Weather SSE</span>
        </div>
        <div>
          <button id="mg-weather-min-btn" class="mg-weather-btn-icon" title="Minimize">—</button>
        </div>
      </div>
      <div id="mg-weather-body">
        <button id="mg-weather-toggle-btn" class="btn-active">SWITCH: ACTIVE</button>
        <div id="mg-weather-log">Waiting for stream...</div>
      </div>
    `;

    const mount = () => document.body.appendChild(overlay);
    if (document.body) mount();
    else window.addEventListener('DOMContentLoaded', mount);

    // Make window draggable via Mouse and Touch
    makeDraggable(overlay, overlay.querySelector('#mg-weather-header'));

    // Toggle button handler
    const toggleBtn = overlay.querySelector('#mg-weather-toggle-btn');
    toggleBtn.addEventListener('click', () => {
      isEnabled = !isEnabled;
      if (isEnabled) {
        toggleBtn.textContent = 'SWITCH: ACTIVE';
        toggleBtn.className = 'btn-active';
      } else {
        toggleBtn.textContent = 'SWITCH: PAUSED';
        toggleBtn.className = 'btn-paused';
      }
    });

    // Minimize button handler
    const minBtn = overlay.querySelector('#mg-weather-min-btn');
    minBtn.addEventListener('click', () => {
      isMinimized = !isMinimized;
      overlay.classList.toggle('minimized', isMinimized);
      minBtn.textContent = isMinimized ? '┼' : '—';
    });
  }

  /**
   * Universal Draggable utility supporting both Mouse and Touch events.
   */
  function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    // Mouse Listeners
    handle.addEventListener('mousedown', dragStart);
    // Touch Listeners
    handle.addEventListener('touchstart', dragStart, { passive: false });

    function getCoordinates(e) {
      if (e.touches && e.touches.length > 0) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      }
      return { clientX: e.clientX, clientY: e.clientY };
    }

    function dragStart(e) {
      if (e.target.tagName === 'BUTTON') return;

      // Prevent page scrolling while dragging on touch devices
      if (e.type === 'touchstart') {
        e.preventDefault();
      }

      const coords = getCoordinates(e);
      pos3 = coords.clientX;
      pos4 = coords.clientY;

      document.addEventListener('mouseup', closeDragElement);
      document.addEventListener('mousemove', elementDrag);
      document.addEventListener('touchend', closeDragElement);
      document.addEventListener('touchmove', elementDrag, { passive: false });
    }

    function elementDrag(e) {
      if (e.type === 'touchmove') {
        e.preventDefault(); // Stop default browser gestures/scrolling
      }

      const coords = getCoordinates(e);
      pos1 = pos3 - coords.clientX;
      pos2 = pos4 - coords.clientY;
      pos3 = coords.clientX;
      pos4 = coords.clientY;

      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
      element.style.right = 'auto'; // Break initial CSS right binding
    }

    function closeDragElement() {
      document.removeEventListener('mouseup', closeDragElement);
      document.removeEventListener('mousemove', elementDrag);
      document.removeEventListener('touchend', closeDragElement);
      document.removeEventListener('touchmove', elementDrag);
    }
  }

  /**
   * Update status log inside the floating overlay.
   */
  function updateLog(text) {
    const logEl = document.querySelector('#mg-weather-log');
    if (logEl) {
      logEl.textContent = text;
    }
  }

  /**
   * Simulates a Ctrl + [digit] keypress sequence.
   */
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

    const target = document.activeElement || document;

    target.dispatchEvent(new KeyboardEvent('keydown', keyData));
    target.dispatchEvent(new KeyboardEvent('keypress', keyData));
    target.dispatchEvent(new KeyboardEvent('keyup', keyData));
  }

  /**
   * Connect to the SSE endpoint and listen for weather events.
   */
  function connectStream() {
    const eventSource = new EventSource(SSE_STREAM_URL);

    eventSource.addEventListener('weather', (event) => {
      try {
        const payload = JSON.parse(event.data);
        const weatherType = payload.weather;
        const keyDigit = KEY_MAPPING[weatherType];

        if (!isEnabled) {
          updateLog(`[Activate] ${weatherType}`);
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

  // Initialize
  createOverlayUI();
  connectStream();
})();

