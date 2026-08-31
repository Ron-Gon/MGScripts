// ==UserScript==
// @name         Auto Click Notification Bell (2 Clicks / 5 Mins)
// @namespace    Violentmonkey
// @version      1.3.0
// @description  Clicks the bell twice (1s apart) every 5 minutes using full event simulation and deep DOM search.
// @author       AWON & Gemini
// @match        *://*/*
// @allFrames    true
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const FIVE_MINUTES_MS = 5 * 60 * 1000; // 5 minutes
    const ONE_SECOND_MS = 1000;            // 1 second delay between the two clicks

    // Deep search through light DOM and Shadow DOMs
    function findBellDeep(root = document) {
        let target = root.querySelector('button[data-notification-bell-widget="1"], button[title="Notifications"], button[aria-label="Notifications"]');
        if (target) return target;

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

        element.dispatchEvent(new PointerEvent('pointerdown', eventOptions));
        element.dispatchEvent(new MouseEvent('mousedown', eventOptions));
        element.dispatchEvent(new PointerEvent('pointerup', eventOptions));
        element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
        element.dispatchEvent(new MouseEvent('click', eventOptions));

        if (typeof element.click === 'function') {
            element.click();
        }
    }

    // Performs two clicks separated by 1 second
    function performDoubleTapSequence() {
        const bell = findBellDeep();
        if (bell) {
            // First Click
            simulateFullClick(bell);
            console.log(`[Auto Clicker] First click performed at ${new Date().toLocaleTimeString()}`);

            // Second Click (1 second later)
            setTimeout(() => {
                const recheckedBell = findBellDeep() || bell;
                simulateFullClick(recheckedBell);
                console.log(`[Auto Clicker] Second click performed at ${new Date().toLocaleTimeString()}`);
            }, ONE_SECOND_MS);
        } else {
            console.warn('[Auto Clicker] Bell element not found.');
        }
    }

    // Run every 5 minutes
    setInterval(performDoubleTapSequence, FIVE_MINUTES_MS);

    // Initial run 5 seconds after page load
    setTimeout(performDoubleTapSequence, 5000);
})();
