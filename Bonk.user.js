// ==UserScript==
// @name         Bonk Bonk
// @namespace    Violentmonkey
// @version      1.0.0
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

    // 1. Button configurations
    const buttonsConfig = [
        { label: 'Amber', color: '#FFBF00', textColor: '#000', key: '1' },
        { label: 'Dawn', color: '#8A2BE2', textColor: '#FFF', key: '5' },
        { label: 'Snow', color: '#E0F7FA', textColor: '#000', key: '2' },
        { label: 'Thunder', color: '#00F5FF', textColor: '#000', key: '3' },
        { label: 'Clear', color: '#00BFFF', textColor: '#FFF', key: '4' },
        { label: 'Rain', color: '#104E8B', textColor: '#FFF', key: '6' }
    ];

    // 2. Keyboard event simulator
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

    // 3. Create Container
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
        touchAction: 'none', // Prevents page scrolling while dragging panel
        cursor: 'move'
    });

    // 4. Create Buttons
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
            transition: 'transform 0.1s, opacity 0.2s',
            outline: 'none',
            touchAction: 'manipulation'
        });

        // Click / Tap Action
        const handleAction = (e) => {
            e.stopPropagation();
            triggerHotKey(btnInfo.key);
        };

        btn.addEventListener('click', handleAction);
        
        // Visual press feedback
        btn.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            btn.style.transform = 'scale(0.95)';
        }, { passive: true });

        btn.addEventListener('touchend', () => {
            btn.style.transform = 'scale(1)';
        }, { passive: true });

        btn.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            btn.style.transform = 'scale(0.95)';
        });
        
        btn.addEventListener('mouseup', () => {
            btn.style.transform = 'scale(1)';
        });

        container.appendChild(btn);
    });

    document.body.appendChild(container);

    // 5. Combined Mouse & Touch Drag Logic
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    const getCoords = (e) => e.touches ? e.touches[0] : e;

    const dragStart = (e) => {
        isDragging = true;
        const coords = getCoords(e);
        
        // Cache initial positions
        const rect = container.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        startX = coords.clientX;
        startY = coords.clientY;

        // Convert positioning from right-anchored to left-anchored seamlessly
        container.style.left = `${initialLeft}px`;
        container.style.top = `${initialTop}px`;
        container.style.right = 'auto';
    };

    const dragMove = (e) => {
        if (!isDragging) return;
        
        // Prevent default screen scrolling during touch drag
        if (e.touches) e.preventDefault();

        const coords = getCoords(e);
        const deltaX = coords.clientX - startX;
        const deltaY = coords.clientY - startY;

        container.style.left = `${initialLeft + deltaX}px`;
        container.style.top = `${initialTop + deltaY}px`;
    };

    const dragEnd = () => {
        isDragging = false;
    };

    // Mouse Listeners
    container.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);

    // Touch Listeners
    container.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('touchend', dragEnd);
})();
