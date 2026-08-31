// ==UserScript==
// @name         Bonk Bonk
// @namespace    Violentmonkey
// @version      1.0.6
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
        { label: '🌅 Amber', color: '#FFBF00', textColor: '#000', key: '1' },
        { label: '🌌 Dawn', color: '#8A2BE2', textColor: '#FFF', key: '5' },
        { label: '❄️ Snow', color: '#E0F7FA', textColor: '#000', key: '2' },
        { label: '🌩️ Thunder', color: '#00F5FF', textColor: '#000', key: '3' },
        { label: '☀️ Clear', color: '#00BFFF', textColor: '#FFF', key: '4' },
        { label: '🌧️ Rain', color: '#104E8B', textColor: '#FFF', key: '6' }
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

    // Main Container
    const container = document.createElement('div');
    container.id = 'vm-floating-overlay';
    Object.assign(container.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '999999',
        backgroundColor: 'rgba(20, 20, 20, 0.9)',
        backdropFilter: 'blur(8px)',
        padding: '10px 12px 12px 12px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontFamily: 'system-ui, sans-serif',
        userSelect: 'none',
        webkitUserSelect: 'none',
        touchAction: 'none' // Prevents touch scrolling
    });

    // Dedicated Drag Handle Bar (Top)
    const dragHandle = document.createElement('div');
    dragHandle.innerText = '::: DRAG PANEL :::';
    Object.assign(dragHandle.style, {
        color: '#888',
        fontSize: '10px',
        fontWeight: 'bold',
        textAlign: 'center',
        padding: '4px 0',
        cursor: 'grab',
        letterSpacing: '1px',
        touchAction: 'none'
    });
    container.appendChild(dragHandle);

    // Button Grid Container
    const grid = document.createElement('div');
    Object.assign(grid.style, {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px'
    });

    // Create Buttons
    buttonsConfig.forEach(btnInfo => {
        const btn = document.createElement('button');
        btn.innerText = btnInfo.label;
        Object.assign(btn.style, {
            backgroundColor: btnInfo.color,
            color: btnInfo.textColor,
            border: 'none',
            padding: '14px 18px', // Larger touch target
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            outline: 'none',
            touchAction: 'manipulation'
        });

        // Trigger on pointerdown to make tap execution feel immediate on mobile
        btn.addEventListener('pointerdown', (e) => {
            e.stopPropagation(); // Stop drag event from firing
            btn.style.transform = 'scale(0.92)';
            triggerHotKey(btnInfo.key);
        });

        btn.addEventListener('pointerup', () => {
            btn.style.transform = 'scale(1)';
        });

        grid.appendChild(btn);
    });

    container.appendChild(grid);
    document.body.appendChild(container);

    // Modern Pointer-Based Touch Drag Logic
    let isDragging = false;
    let activePointerId = null;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    function onPointerDown(e) {
        // Track the pointer performing the touch
        isDragging = true;
        activePointerId = e.pointerId;

        // Lock all movement events to the container (even if finger drifts outside)
        container.setPointerCapture(e.pointerId);

        const rect = container.getBoundingClientRect();
        container.style.left = `${rect.left}px`;
        container.style.top = `${rect.top}px`;
        container.style.right = 'auto';

        startX = e.clientX;
        startY = e.clientY;
        initialLeft = rect.left;
        initialTop = rect.top;

        dragHandle.style.cursor = 'grabbing';
    }

    function onPointerMove(e) {
        if (!isDragging || e.pointerId !== activePointerId) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        container.style.left = `${initialLeft + deltaX}px`;
        container.style.top = `${initialTop + deltaY}px`;
    }

    function onPointerUp(e) {
        if (e.pointerId === activePointerId) {
            isDragging = false;
            activePointerId = null;
            try {
                container.releasePointerCapture(e.pointerId);
            } catch(err) {}
            dragHandle.style.cursor = 'grab';
        }
    }

    // Attach pointer events to both the container and drag handle
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
})();
