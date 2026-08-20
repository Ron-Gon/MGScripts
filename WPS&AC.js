// ==UserScript==
// @name         WPS&AC unified overlay
// @namespace    violentmonkey
// @version      1.0.4
// @description  Unified floating overlay for Canvas Autoclicker and Weather Pet Team Swapper
// @author       Awon Gemini
// @match        https://magiccircle.gg/r/*
// @match        https://magicgarden.gg/r/*
// @match        https://starweaver.org/r/*
// @uploadURL    https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/WPS&AC.js
// @downloadURL  https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/WPS&AC.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // --- CONFIGURATION ---
    const SSE_STREAM_URL = 'https://mg-api.ariedam.fr/live/weather/stream';
    const CLICK_INTERVAL_MS = 1000; // 10 minutes

    // Weather to keypress mapping
    const WEATHER_KEYMAP = {
        'AmberMoon': { key: '1', ctrlKey: true },
        'Frost': { key: '2', ctrlKey: true },       // Frost = Snow
        'Snow': { key: '2', ctrlKey: true },
        'Thunderstorm': { key: '3', ctrlKey: true },
        'Clear Skies': { key: '4', ctrlKey: true },
        'Rain': { key: '4', ctrlKey: true },
        'Dawn': { key: '5', ctrlKey: true }
    };

    // State Variables
    let autoClickerTimer = null;
    let isAutoClickerActive = false;
    let isSSEActive = false;
    let evtSource = null;

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;

    // --- STYLES ---
    const style = document.createElement('style');
    style.textContent = `
        #unified-overlay {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            background: rgba(20, 20, 20, 0.85);
            backdrop-filter: blur(8px);
            color: #fff;
            padding: 12px;
            border-radius: 10px;
            font-family: sans-serif;
            font-size: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            user-select: none;
            width: 180px;
        }
        #unified-overlay-header {
            font-weight: bold;
            margin-bottom: 8px;
            cursor: move;
            text-align: center;
            border-bottom: 1px solid #444;
            padding-bottom: 4px;
        }
        .overlay-row {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 8px;
        }
        .toggle-btn {
            width: 100%;
            padding: 6px;
            border: none;
            border-radius: 5px;
            font-weight: bold;
            color: #fff;
            background-color: #ff4d4d;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .toggle-btn.active {
            background-color: #2ecc71;
        }
        #click-pointer {
            position: fixed;
            width: 24px;
            height: 24px;
            border: 2px dashed #ff4d4d;
            border-radius: 50%;
            pointer-events: auto;
            z-index: 999998;
            transform: translate(-50%, -50%);
            cursor: move;
            box-shadow: 0 0 6px rgba(0,0,0,0.5);
            transition: border-color 0.3s, background-color 0.2s;
            background: rgba(255, 77, 77, 0.1);
        }
        #click-pointer::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 4px;
            height: 4px;
            background: #ff4d4d;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: background 0.3s;
        }
        #click-pointer.active {
            border-color: #2ecc71;
            border-style: solid;
            background: rgba(46, 204, 113, 0.1);
        }
        #click-pointer.active::after {
            background: #2ecc71;
        }
        #sse-status {
            font-size: 10px;
            color: #aaa;
            text-align: center;
            word-break: break-word;
            margin-top: 4px;
        }
    `;
    document.head.appendChild(style);

    // --- DOM ELEMENTS ---
    const overlay = document.createElement('div');
    overlay.id = 'unified-overlay';
    overlay.innerHTML = `
        <div id="unified-overlay-header">Control Overlay</div>
        <div class="overlay-row">
            <button id="toggle-autoclick" class="toggle-btn">AutoClicker: OFF</button>
            <button id="toggle-sse" class="toggle-btn">SSE Watcher: OFF</button>
        </div>
        <div id="sse-status">SSE: Disabled</div>
    `;
    document.body.appendChild(overlay);

    const pointer = document.createElement('div');
    pointer.id = 'click-pointer';
    pointer.title = 'Drag me to set click location';
    pointer.style.left = `${pointerX}px`;
    pointer.style.top = `${pointerY}px`;
    document.body.appendChild(pointer);

    // --- DRAGGABLE HANDLER ---
    function makeDraggable(element, handle, onMove) {
        let isDragging = false, startX, startY, initialLeft, initialTop;

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = element.getBoundingClientRect();
            // Calculate center point offset if dragging the pointer
            initialLeft = rect.left + (element === pointer ? rect.width / 2 : 0);
            initialTop = rect.top + (element === pointer ? rect.height / 2 : 0);
            
            const onMouseMove = (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                const newLeft = initialLeft + dx;
                const newTop = initialTop + dy;
                
                element.style.left = `${newLeft}px`;
                element.style.top = `${newTop}px`;
                
                if (onMove) onMove(newLeft, newTop);
            };

            const onMouseUp = () => {
                isDragging = false;
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    }

    makeDraggable(overlay, overlay.querySelector('#unified-overlay-header'));
    makeDraggable(pointer, pointer, (x, y) => {
        pointerX = x;
        pointerY = y;
    });

    // --- SIMULATION FUNCTIONS ---
    function simulateClick(x, y) {
        // Temporarily hide pointer so elementFromPoint targets the underlying DOM element
        pointer.style.display = 'none';
        const target = document.elementFromPoint(x, y) || document.body;
        pointer.style.display = 'block';

        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(eventType => {
            const event = new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
            });
            target.dispatchEvent(event);
        });
    }

    function simulateKeyPress(keyConfig) {
        ['keydown', 'keypress', 'keyup'].forEach(eventType => {
            const event = new KeyboardEvent(eventType, {
                key: keyConfig.key,
                code: `Digit${keyConfig.key}`,
                keyCode: keyConfig.key.charCodeAt(0),
                which: keyConfig.key.charCodeAt(0),
                ctrlKey: keyConfig.ctrlKey || false,
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
        });
    }

    // --- AUTOCLICKER TOGGLE ---
    const toggleClickBtn = overlay.querySelector('#toggle-autoclick');

    toggleClickBtn.addEventListener('click', () => {
        isAutoClickerActive = !isAutoClickerActive;
        if (isAutoClickerActive) {
            toggleClickBtn.textContent = 'AutoClicker: ON';
            toggleClickBtn.classList.add('active');
            pointer.classList.add('active');

            simulateClick(pointerX, pointerY);
            autoClickerTimer = setInterval(() => {
                simulateClick(pointerX, pointerY);
            }, CLICK_INTERVAL_MS);
        } else {
            toggleClickBtn.textContent = 'AutoClicker: OFF';
            toggleClickBtn.classList.remove('active');
            pointer.classList.remove('active');
            
            clearInterval(autoClickerTimer);
            autoClickerTimer = null;
        }
    });

    // --- SSE WATCHER TOGGLE ---
    const toggleSseBtn = overlay.querySelector('#toggle-sse');
    const sseStatus = overlay.querySelector('#sse-status');

    toggleSseBtn.addEventListener('click', () => {
        isSSEActive = !isSSEActive;
        if (isSSEActive) {
            toggleSseBtn.textContent = 'SSE Watcher: ON';
            toggleSseBtn.classList.add('active');
            sseStatus.textContent = 'SSE: Connecting...';

            evtSource = new EventSource(SSE_STREAM_URL);

            evtSource.onmessage = function (event) {
                let weather = '';
                try {
                    const data = JSON.parse(event.data);
                    weather = data.weather || data.state || event.data;
                } catch (e) {
                    weather = event.data.trim();
                }

                sseStatus.textContent = `Weather: ${weather}`;

                if (WEATHER_KEYMAP[weather]) {
                    simulateKeyPress(WEATHER_KEYMAP[weather]);
                }
            };

            evtSource.onerror = function () {
                if (isSSEActive) {
                    sseStatus.textContent = 'SSE: Reconnecting...';
                }
            };
        } else {
            toggleSseBtn.textContent = 'SSE Watcher: OFF';
            toggleSseBtn.classList.remove('active');
            sseStatus.textContent = 'SSE: Disabled';

            if (evtSource) {
                evtSource.close();
                evtSource = null;
            }
        }
    });
})();