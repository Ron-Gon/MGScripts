// ==UserScript==
// @name         Auto Buyer
// @namespace    Violentmonkey
// @version      1.1.0
// @description  Auto Buy Alarmed Items
// @author       Awon & Gemini
// @match        https://magiccircle.gg/r/*
// @match        https://magicgarden.gg/r/*
// @match        https://starweaver.org/r/*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/Buy.user.js
// @uploadURL    https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/Buy.user.js
// ==/UserScript==

(function () {
  'use strict';

  const CLICK_INTERVAL_MS = 8000; // Delay in ms between each individual click
  let isProcessing = false;

  // Helper to fetch all currently visible "Buy all" buttons
  function getBuyAllButtons() {
    return Array.from(document.querySelectorAll('button, div[role="button"], a'))
      .filter(el => {
        const text = el.innerText ? el.innerText.trim().toLowerCase() : '';
        return text === 'buy all' && el.offsetWidth > 0 && el.offsetHeight > 0;
      });
  }

  async function processBuyAllButtons() {
    if (isProcessing) return;
    isProcessing = true;

    while (true) {
      const availableButtons = getBuyAllButtons();

      // If no "Buy all" buttons are visible, stop the loop
      if (availableButtons.length === 0) break;

      // Select and click the first available button
      const btn = availableButtons[0];
      console.log(`[Script] Clicking a "Buy all" button (${availableButtons.length} remaining)...`);
      btn.click();

      // Wait 900ms before checking for the next button
      console.log(`[Script] Waiting ${CLICK_INTERVAL_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, CLICK_INTERVAL_MS));
    }

    console.log('[Script] All "Buy all" buttons have been processed.');
    isProcessing = false;
  }

  // Watch DOM for when the popup or new buttons appear
  const observer = new MutationObserver(() => {
    const buttons = getBuyAllButtons();

    if (buttons.length > 0 && !isProcessing) {
      processBuyAllButtons();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Expose function globally for manual testing in Eruda Console via `window.buyAll()`
  window.buyAll = processBuyAllButtons;
})();
