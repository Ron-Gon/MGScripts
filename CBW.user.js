// ==UserScript==
// @name         Auto Click Notification Bell
// @namespace    Violentmonkey
// @version      1.0.2
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

    function findBellButton() {
        // 1. Primary check: Custom widget attribute or aria-label
        let button = document.querySelector('button[data-notification-bell-widget="1"], button[aria-label="Notifications"]');
        if (button) return button;

        // 2. Fallback check: Search all elements containing the 🔔 emoji directly
        const allElements = document.querySelectorAll('button, span, div');
        for (const el of allElements) {
            if (el.textContent.includes('🔔')) {
                // Return the element itself or its closest clickable parent button
                return el.closest('button') || el;
            }
        }
        return null;
    }

    function clickBell() {
        const target = findBellButton();
        if (target) {
            // Dispatch both click methods to trigger handlers attached via React/Vue
            target.click();
            target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            console.log(`[Auto Clicker] Bell clicked successfully at ${new Date().toLocaleTimeString()}`);
        } else {
            console.warn('[Auto Clicker] Bell element not found on page.');
        }
    }

    // Delay initial start slightly to let dynamic frames render, then run every 2 mins
    setTimeout(() => {
        clickBell();
        setInterval(clickBell, INTERVAL_MS);
    }, 3000);
})();
