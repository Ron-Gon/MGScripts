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
// ==UserScript==

(function() {
    'use strict';

    // 1. Define button configurations with labels, colors, and key numbers
    const buttonsConfig = [
        { label: 'Amber', color: '#FFBF00', textColor: '#000', key: '1' },
        { label: 'Dawn', color: '#8A2BE2', textColor: '#FFF', key: '5' },
        { label: 'Snow', color: '#E0F7FA', textColor: '#000', key: '2' },
        { label: 'Thunder', color: '#00F5FF', textColor: '#000', key: '3' },
        { label: 'Clear', color: '#00BFFF', textColor: '#FFF', key: '4' },
        { label: 'Rain', color: '#104E8B', textColor: '#FFF', key: '6' }
    ];

    // 2. Function to dispatch simulated keyboard event (Ctrl + key)
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

        const keyDown = new KeyboardEvent('keydown', eventInit);
        const keyUp = new KeyboardEvent('keyup', eventInit);

        document.dispatchEvent(keyDown);
        document.dispatchEvent(keyUp);
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
            padding: '10px 14px',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'transform 0.1s, opacity 0.2s',
            outline: 'none'
        });

        btn.addEventListener('mouseenter', () => btn.style.opacity = '0.9');
        btn.addEventListener('mouseleave', () => btn.style.opacity = '1.0');
        btn.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Prevents drag logic when clicking button
            btn.style.transform = 'scale(0.95)';
        });
        btn.addEventListener('mouseup', () => btn.style.transform = 'scale(1)');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerHotKey(btnInfo.key);
        });

        container.appendChild(btn);
    });

    document.body.appendChild(container);

    // 5. Add Drag-and-Drop functionality
    let isDragging = false;
    let offsetX = 0, offsetY = 0;

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - container.offsetLeft;
        offsetY = e.clientY - container.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        container.style.left = `${e.clientX - offsetX}px`;
        container.style.top = `${e.clientY - offsetY}px`;
        container.style.right = 'auto'; // Reset right anchor once dragged
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
})();
