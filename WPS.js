// ==UserScript==
// @name         Weather Pet Swap
// @namespace    violentmonkey
// @version      1.8
// @description  Autopet swap per weather
// @author       AWON Gemini
// @match        https://www.magicgarden.gg/r/*
// @match        https://www.magiccircle.gg/r/*
// @match        https://www.starweaver.gg/r/*
// @grant        GM_xmlhttpRequest
// @connect      mg-api.ariedam.fr
// @updateURL    https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/WPS.js
// @downloadURL  https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/WPS.js
// ==/UserScript==

(function () {
  'use strict';

  const SSE_STREAM_URL = 'https://mg-api.ariedam.fr/live/weather/stream';

  const KEY_MAPPING = {
    'AmberMoon': '1',
    'Snow': '2',
    'Thunderstorm': '3',
    'Clear Skies': '4',
    'Dawn': '5'
  };

  const EMOJI_MAPPING = {
    'Rain': '🌧️',
    'Clear Skies': '☀️',
    'Snow': '❄️',
    'Frozen': '❄️',
    'Thunderstorm': '🌩️',
    'AmberMoon': '🌅',
    'Dawn': '🌌'
  };

  let isEnabled = false;
  let isMinimized = false;
  let lastTriggeredWeather = null;

  function getWeatherEmoji(weatherType) {
    return EMOJI_MAPPING[weatherType] || '🌦️';
  }

  /**
   * Inject floating overlay container, CSS, and UI components.
   */
  function createOverlayUI() {
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
        <button id="mg-weather-toggle-btn" class="btn-paused">AUTOMATOR: PAUSED</button>
        <div id="mg-weather-log">Waiting for stream...</div>
      </div>
    `;

    const mount = () => document.body.appendChild(overlay);
    if (document.body) mount();
    else window.addEventListener('DOMContentLoaded', mount);

    makeDraggable(overlay, overlay.querySelector('#mg-weather-header'));

    const toggleBtn = overlay.querySelector('#mg-weather-toggle-btn');
    toggleBtn.addEventListener('click', () => {
      isEnabled = !isEnabled;
      if (isEnabled) {
        lastTriggeredWeather = null;
        toggleBtn.textContent = 'AUTOMATOR: ACTIVE';
        toggleBtn.className = 'btn-active';
        updateLog('▶️ Resumed (Ready)');
      } else {
        toggleBtn.textContent = 'AUTOMATOR: PAUSED';
        toggleBtn.className = 'btn-paused';
        updateLog('⏸️ Paused');
      }
    });

    const minBtn = overlay.querySelector('#mg-weather-min-btn');
    minBtn.addEventListener('click', () => {
      isMinimized = !isMinimized;
      overlay.classList.toggle('minimized', isMinimized);
      minBtn.textContent = isMinimized ? '┼' : '—';
    });
  }

  /**
   * Draggable utility logic.
   */
  function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      if (e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
      element.style.right = 'auto';
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
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

    const target = document.activeElement || document.body || document;

    target.dispatchEvent(new KeyboardEvent('keydown', keyData));
    target.dispatchEvent(new KeyboardEvent('keypress', keyData));
    target.dispatchEvent(new KeyboardEvent('keyup', keyData));
  }

  /**
   * Process a single JSON weather payload string.
   */
  function handleWeatherPayload(rawJson) {
    try {
      const payload = JSON.parse(rawJson);
      const weatherType = payload.weather;
      const keyDigit = KEY_MAPPING[weatherType];
      const emoji = getWeatherEmoji(weatherType);

      if (!isEnabled) {
        updateLog(`[Ignored] ${emoji} ${weatherType}`);
        return;
      }

      if (weatherType === lastTriggeredWeather) {
        updateLog(`🔄 Unchanged: ${emoji} ${weatherType}`);
        return;
      }

      if (keyDigit) {
        lastTriggeredWeather = weatherType;
        updateLog(`${emoji} ${weatherType} (Ctrl+${keyDigit})`);
        triggerCtrlKeypress(keyDigit);
      } else {
        updateLog(`${emoji} ${weatherType} (No Key)`);
      }
    } catch (err) {
      console.error('[Weather Stream] JSON parse error:', err);
    }
  }

  /**
   * Connect to SSE using GM_xmlhttpRequest to bypass CORS restrictions.
   */
  function connectStream() {
    let processedLength = 0;

    GM_xmlhttpRequest({
      method: 'GET',
      url: SSE_STREAM_URL,
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      onreadystatechange: function (response) {
        if (response.readyState === 3 || response.readyState === 4) {
          const newData = response.responseText.substring(processedLength);
          processedLength = response.responseText.length;

          const lines = newData.split('\n');
          for (let line of lines) {
            line = line.trim();
            if (line.startsWith('data:')) {
              const jsonString = line.replace(/^data:\s*/, '');
              if (jsonString) {
                handleWeatherPayload(jsonString);
              }
            }
          }
        }
      },
      onerror: function () {
        updateLog('⚠️ Stream Error. Retrying...');
        setTimeout(connectStream, 3000);
      },
      onload: function () {
        // Reconnect if stream ends normally
        setTimeout(connectStream, 1000);
      }
    });
  }

  // Initialize
  createOverlayUI();
  connectStream();
})();
