// ==UserScript==
// @name         Auto Click Notification Bell
// @namespace    Violentmonkey
// @version      1.0.0
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

    // Target the notification button using its unique attribute
    const SELECTOR = 'button[data-notification-bell-widget="1"]';
    const INTERVAL_MS = 2 * 60 * 1000; // 2 minutes in milliseconds

    function clickBell() {
        const bellButton = document.querySelector(SELECTOR);
        if (bellButton) {
            bellButton.click();
            console.log(`[Auto Clicker] Bell clicked at ${new Date().toLocaleTimeString()}`);
        }
    }

    // Run periodically every 2 minutes
    setInterval(clickBell, INTERVAL_MS);
})();
