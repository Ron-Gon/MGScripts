// ==UserScript==
// @name         BuyAll & Click Bell Widget Integration 
// @namespace    Violentmonkey
// @version      1.2.1
// @description  Automatically clicks the notification bell button and buys all alerted Item
// @author       AWON & Gemini
// @match        https://magicgarden.gg/r/*
// @run-at       document-idle
// @grant        none
//downloadURL    https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/BACBWInt.user.js
//uploadURL      https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/BACBWInt.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Settings
    const FIVE_MINUTES_MS = 2000;  // Bell timer interval (5 minutes)
    const ONE_SECOND_MS = 1000;             // Delay between the 2 bell clicks
    const WAIT_AFTER_BUY_ALL_MS = 900;      // Cooldown after clicking "Buy All" buttons

    let isBuyAllProcessing = false;

    // --- 1. BELL CLICKER MODULE ---

    // Deep search through light DOM and Shadow DOMs for the bell button
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
            console.log(`[Bell Clicker] First click performed at ${new Date().toLocaleTimeString()}`);

            // Second Click (1 second later)
            setTimeout(() => {
                const recheckedBell = findBellDeep() || bell;
                simulateFullClick(recheckedBell);
                console.log(`[Bell Clicker] Second click performed at ${new Date().toLocaleTimeString()}`);

                // Trigger buy-all check 500ms after the second click in case popup opened
                setTimeout(clickAllBuyAllButtons, 500);
            }, ONE_SECOND_MS);
        } else {
            console.warn('[Bell Clicker] Bell element not found.');
        }
    }


    // --- 2. BUY ALL MODULE ---

    // Helper to fetch all currently visible "Buy all" buttons
    function getBuyAllButtons() {
        return Array.from(document.querySelectorAll('button, div[role="button"], a'))
            .filter(el => {
                const text = el.innerText ? el.innerText.trim().toLowerCase() : '';
                return text === 'buy all' && el.offsetWidth > 0 && el.offsetHeight > 0;
            });
    }

    async function clickAllBuyAllButtons() {
        if (isBuyAllProcessing) return;
        isBuyAllProcessing = true;

        let availableButtons = getBuyAllButtons();

        while (availableButtons.length > 0) {
            console.log(`[Buy All] Pressing all ${availableButtons.length} "Buy all" buttons...`);

            // Press every single "Buy all" button immediately
            availableButtons.forEach((btn, index) => {
                console.log(`[Buy All] Pressing button #${index + 1}`);
                btn.click();
            });

            // Wait cooldown period
            await new Promise(resolve => setTimeout(resolve, WAIT_AFTER_BUY_ALL_MS));

            // Re-scan for remaining/new buttons
            availableButtons = getBuyAllButtons();
        }

        isBuyAllProcessing = false;
    }


    // --- 3. INITIALIZATION & OBSERVERS ---

    // Watch DOM for dynamic popups appearing with "Buy all" buttons
    const observer = new MutationObserver(() => {
        const buttons = getBuyAllButtons();
        if (buttons.length > 0 && !isBuyAllProcessing) {
            clickAllBuyAllButtons();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Timers for Bell sequence
    setInterval(performDoubleTapSequence, FIVE_MINUTES_MS);
    setTimeout(performDoubleTapSequence, 5000); // Initial start 5s after load

    // Expose window.buyAll() for manual testing via console/Eruda
    window.buyAll = clickAllBuyAllButtons;
})();
