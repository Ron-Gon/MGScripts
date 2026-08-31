// ==UserScript==
// @name         Auto Click Notification Bell
// @namespace    Violentmonkey
// @version      1.0.3
// @description  Automatically clicks the notification bell button
// @author       AWON & Gemini
// @match        https://magicgarden.gg/r/*
// @run-at       document-idle
// @grant        none
//downloadURL    https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/CBW.user.js
//uploadURL      https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/CBS.user.js
// ==/UserScript==

(function () {
    'use strict';

    const INTERVAL_MS = 2000; // 2 sec

    // Deep search through light DOM and Shadow DOMs
    function findBellDeep(root = document) {
        // Direct attribute match
        let target = root.querySelector('button[data-notification-bell-widget="1"], button[title="Notifications"], button[aria-label="Notifications"]');
        if (target) return target;

        // Search text for 🔔 emoji
        const candidates = root.querySelectorAll('button, div, span');
        for (const el of candidates) {
            if (el.shadowRoot) {
                const foundInShadow = findBellDeep(el.shadowRoot);
                if (foundInShadow) return foundInShadow;
            }
            if (el.children.length === 0 && el.textContent.includes('🔔')) {
                return el.closest('button') || el;
            }
        }
        return null;
    }

    // Fully simulate natural user click sequence
    function simulateFullClick(element) {
        const rect = element.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;

        const eventOptions = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: clientX,
            clientY: clientY,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true
        };

        // Dispatch complete sequence: Pointer -> Mouse -> Touch (if needed)
        element.dispatchEvent(new PointerEvent('pointerdown', eventOptions));
        element.dispatchEvent(new MouseEvent('mousedown', eventOptions));
        element.dispatchEvent(new PointerEvent('pointerup', eventOptions));
        element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
        element.dispatchEvent(new MouseEvent('click', eventOptions));

        if (typeof element.click === 'function') {
            element.click();
        }
    }

    function executeClick() {
        const bell = findBellDeep();
        if (bell) {
            simulateFullClick(bell);
            console.log(`[Auto Clicker] Bell trigger fired at ${new Date().toLocaleTimeString()}`);
        } else {
            console.warn('[Auto Clicker] Bell element was not found in active DOM/Shadow DOM.');
        }
    }

    // Run every 2 minutes
    setInterval(executeClick, INTERVAL_MS);
    
    // First trigger 3 seconds after load
    setTimeout(executeClick, 5000);
})();
