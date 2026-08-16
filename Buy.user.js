// ==UserScript==
// @name         Auto Buyer
// @namespace    Violentmonkey
// @version      1.0.0
// @description  Auto Buy Alarmed Items
// @author       Awon & Gemini
// @match        https://magiccircle.gg/r/*
// @match        https://magicgarden.gg/r/*
// @match        https://starweaver.org/r/*
// @run-at       document-idle
// @grant        none
//downloadURL    https://raw.githubusercontent.com/Ron-Gon/MGScript/main.Buy.user.js
//uploadURL      https://raw.githubusercontent.com/Ron-Gon/MGScript/main.Buy.user.js
// ==/UserScript==

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
