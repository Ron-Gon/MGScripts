// ==UserScript==
// @name         BuyAll & Click Bell Widget Integration 
// @namespace    Violentmonkey
// @version      1.2.0
// @description  Automatically clicks the notification bell button and buys all alerted Item
// @author       AWON & Gemini
// @match        https://magicgarden.gg/r/*
// @run-at       document-idle
// @grant        none
//downloadURL    https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/BuyAllCBWInt.user.js
//uploadURL      https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/BuyAllCBSInt.user.js
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

(function () {
  'use strict';

  const WAIT_AFTER_CLICKING_ALL_MS = 900; // Delay in ms after pressing all buttons
  let isProcessing = false;

  // Helper to fetch all currently visible "Buy all" buttons
  function getBuyAllButtons() {
    return Array.from(document.querySelectorAll('button, div[role="button"], a'))
      .filter(el => {
        const text = el.innerText ? el.innerText.trim().toLowerCase() : '';
        return text === 'buy all' && el.offsetWidth > 0 && el.offsetHeight > 0;
      });
  }

  async function clickAllBuyAllButtons() {
    if (isProcessing) return;
    isProcessing = true;

    let availableButtons = getBuyAllButtons();

    while (availableButtons.length > 0) {
      console.log(`[Script] Pressing all ${availableButtons.length} "Buy all" buttons...`);

      // Press every single "Buy all" button immediately
      availableButtons.forEach((btn, index) => {
        console.log(`[Script] Pressing button #${index + 1}`);
        btn.click();
      });

      // Wait 900ms after pressing all of them
      console.log(`[Script] Waiting ${WAIT_AFTER_CLICKING_ALL_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, WAIT_AFTER_CLICKING_ALL_MS));

      // Re-scan to see if any new/remaining "Buy all" buttons are still on screen
      availableButtons = getBuyAllButtons();
    }

    console.log('[Script] All "Buy all" buttons pressed.');
    isProcessing = false;
  }

  // Watch DOM for when the popup appears
  const observer = new MutationObserver(() => {
    const buttons = getBuyAllButtons();

    if (buttons.length > 0 && !isProcessing) {
      clickAllBuyAllButtons();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Expose function globally for manual testing in Eruda Console via `window.buyAll()`
  window.buyAll = clickAllBuyAllButtons;
})();