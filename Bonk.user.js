// ==UserScript==
// @name         Bonk Bonk
// @namespace    Violentmonkey
// @version      1.0.5
// @description  Floating overlay with buttons, buttons simulates key presses
// @author       AWON
// @match        https://magicgarden.gg/r/*
// @downloadURL  https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/Bonk.user.js
// @uploadURL    https://raw.githubusercontent.com/Ron-Gon/MGScripts/main/Bonk.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==


(function() {
    'use strict';

    const buttonsConfig = [
        { label: 'Amber', color: '#FFBF00', textColor: '#000', key: '1' },
        { label: 'Dawn', color: '#8A2BE2', textColor: '#FFF', key: '5' },
        { label: 'Snow', color: '#E0F7FA', textColor: '#000', key: '2' },
        { label: 'Thunder', color: '#00F5FF', textColor: '#000', key: '3' },
        { label: 'Clear', color: '#00BFFF', textColor: '#FFF', key: '4' },
        { label: 'Rain', color: '#104E8B', textColor: '#FFF', key: '6' }
    ];

    function triggerHotKey(keyChar) {
        const eventInit = {
            key: keyChar,
            code: `Digit${keyChar}`,
            keyCode: 48 + parseInt(keyChar, 10),
            which: 48 + parseInt(keyChar, 10),
            ctrlKey: true,
            bubbles: true,
            cancelable: true
        };

        document.dispatchEvent(new KeyboardEvent('keydown', eventInit));
        document.dispatchEvent(new KeyboardEvent('keyup', eventInit));
    }

    // Create Container
    const container = document.createElement('div');
    container.id = 'vm-floating-overlay';
    Object.assign(container.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '999999',
        backgroundColor: 'rgba(20, 20, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '12px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
        fontFamily: 'system-ui, sans-serif',
        userSelect: 'none',
        webkitUserSelect: 'none',
        touchAction: 'none'
    });

    // Create Buttons
    buttonsConfig.forEach(btnInfo => {
        const btn = document.createElement('button');
        btn.innerText = btnInfo.label;
        Object.assign(btn.style, {
            backgroundColor: btnInfo.color,
            color: btnInfo.textColor,
            border: 'none',
            padding: '12px 16px',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'transform 0.1s',
            outline: 'none',
            touchAction: 'manipulation'
        });

        // Fire hotkey on tap/click
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerHotKey(btnInfo.key);
        });

        // Prevent dragging when tapping buttons
        btn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
        btn.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false });

        container.appendChild(btn);
    });

    document.body.appendChild(container);

    // Dynamic Touch & Mouse Drag Engine
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    function onPointerDown(e) {
        // Only accept primary touch or left-click
        if (e.type === 'mousedown' && e.button !== 0) return;

        isDragging = true;
        const pointer = e.touches ? e.touches[0] : e;

        const rect = container.getBoundingClientRect();
        
        // Convert right-aligned container to absolute left positioning on first drag
        container.style.left = `${rect.left}px`;
        container.style.top = `${rect.top}px`;
        container.style.right = 'auto';

        startX = pointer.clientX;
        startY = pointer.clientY;
        initialLeft = rect.left;
        initialTop = rect.top;

        if (e.type === 'touchstart') {
            e.preventDefault(); // Stop mobile scroll locking
        }
    }

    function onPointerMove(e) {
        if (!isDragging) return;

        const pointer = e.touches ? e.touches[0] : e;
        const deltaX = pointer.clientX - startX;
        const deltaY = pointer.clientY - startY;

        container.style.left = `${initialLeft + deltaX}px`;
        container.style.top = `${initialTop + deltaY}px`;

        if (e.cancelable) {
            e.preventDefault();
        }
    }

    function onPointerEnd() {
        isDragging = false;
    }

    // Attach listener directly to container for start
    container.addEventListener('mousedown', onPointerDown);
    container.addEventListener('touchstart', onPointerDown, { passive: false });

    // Attach global listeners for movement tracking
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });

    window.addEventListener('mouseup', onPointerEnd);
    window.addEventListener('touchend', onPointerEnd);
    window.addEventListener('touchcancel', onPointerEnd);
})();
