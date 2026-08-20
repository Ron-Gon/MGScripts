// ==UserScript==
// @name         WPS&AC unified overlay
// @namespace    violentmonkey
// @version      1.0.3
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
    const CLICK_INTERVAL_MS = 600000; // 10 minutes

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

    let autoClickerTimer = null;
    let isActive = false;
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
            justify-content: space-between;
            align-items: center;
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
            width: 20px;
            height: 20px;
            border: 2px solid #ff4d4d;
            border-radius: 50%;
            pointer-events: auto;
            z-index: 999998;
            transform: translate(-50%, -50%);
            cursor: grab;
            box-shadow: 0 0 6px rgba(0,0,0,0.5);
            transition: border-color 0.3s;
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
        }
        #click-pointer.active::after {
            background: #2ecc71;
        }
        #sse-status {
            font-size: 10px;
            color: #aaa;
            text-align: center;
            word-break: break-word;
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
        </div>
        <div id="sse-status">SSE: Connecting...</div>
    `;
    document.body.appendChild(overlay);

    const pointer = document.createElement('div');
    pointer.id = 'click-pointer';
    pointer.style.left = `${pointerX}px`;
    pointer.style.top = `${pointerY}px`;
    document.body.appendChild(pointer);

    // --- DRAGGABLE OVERLAY & POINTER LOGIC ---
    function makeDraggable(element, handle, onMove) {
        let isDragging = false, startX, startY, initialLeft, initialTop;

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = element.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            
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
        const target = document.elementFromPoint(x, y) || document.body;
        
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

    // --- AUTOCLICKER CONTROL ---
    const toggleBtn = overlay.querySelector('#toggle-autoclick');

    function toggleAutoClicker() {
        isActive = !isActive;
        if (isActive) {
            toggleBtn.textContent = 'AutoClicker: ON';
            toggleBtn.classList.add('active');
            pointer.classList.add('active');
            
            // Execute initial click and start interval
            simulateClick(pointerX, pointerY);
            autoClickerTimer = setInterval(() => {
                simulateClick(pointerX, pointerY);
            }, CLICK_INTERVAL_MS);
        } else {
            toggleBtn.textContent = 'AutoClicker: OFF';
            toggleBtn.classList.remove('active');
            pointer.classList.remove('active');
            clearInterval(autoClickerTimer);
            autoClickerTimer = null;
        }
    }

    toggleBtn.addEventListener('click', toggleAutoClicker);

    // --- SSE STREAM WATCHER ---
    const sseStatus = overlay.querySelector('#sse-status');

    function initSSE() {
        const evtSource = new EventSource(SSE_STREAM_URL);

        evtSource.onmessage = function (event) {
            try {
                const data = JSON.parse(event.data);
                const weather = data.weather || data.state || event.data;
                sseStatus.textContent = `Weather: ${weather}`;

                if (WEATHER_KEYMAP[weather]) {
                    simulateKeyPress(WEATHER_KEYMAP[weather]);
                }
            } catch (e) {
                // Fallback for raw text payload
                const weather = event.data.trim();
                sseStatus.textContent = `Weather: ${weather}`;
                if (WEATHER_KEYMAP[weather]) {
                    simulateKeyPress(WEATHER_KEYMAP[weather]);
                }
            }
        };

        evtSource.onerror = function () {
            sseStatus.textContent = 'SSE: Reconnecting...';
        };
    }

    initSSE();
})();
