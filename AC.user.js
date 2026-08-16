// ==UserScript==
// @name         Autoclicker
// @namespace    violentmonkey
// @version      1.2.0
// @description  Floating Auto clicker
// @author       Awon Gemini
// @match        https://magiccircle.gg/r/*
// @match        https://magicgarden.gg/r/*
// @match        https://starweaver.org/r/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/Ron-Gon/MGScript/main/AC.user.js
// @uploadURL    https://raw.githubusercontent.com/Ron-Gon/MGScript/main/AC.user.js
// ==/UserScript==

(function () {
  // CONFIGURATION
  const CLICK_INTERVAL = 600000; // Delay in milliseconds (1000 = 1 sec)

  let clickTimer = null;
  let isActive = false;

  // Cleanup old overlays if re-running script
  ['canvas-clicker-toggle', 'canvas-clicker-target'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  // Helper function to create draggable behavior
  function makeDraggable(element, onSingleTap) {
    let isDragging = false;
    let hasMoved = false;
    let startX = 0, startY = 0;
    let offsetX = 0, offsetY = 0;

    function onDragStart(e) {
      isDragging = true;
      hasMoved = false;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      startX = clientX;
      startY = clientY;

      const rect = element.getBoundingClientRect();
      offsetX = clientX - rect.left;
      offsetY = clientY - rect.top;
    }

    function onDragMove(e) {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      // Check if user moved more than 5px to distinguish drag from tap
      if (Math.hypot(clientX - startX, clientY - startY) > 5) {
        hasMoved = true;
      }

      element.style.left = `${clientX - offsetX}px`;
      element.style.top = `${clientY - offsetY}px`;
      element.style.right = 'auto'; // Clear right offset so absolute left positioning takes over
    }

    function onDragEnd(e) {
      if (isDragging && !hasMoved && onSingleTap) {
        onSingleTap(e);
      }
      isDragging = false;
    }

    element.addEventListener('mousedown', onDragStart);
    element.addEventListener('touchstart', onDragStart, { passive: true });
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('touchmove', onDragMove, { passive: true });
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchend', onDragEnd);
  }

  // 1. CREATE TARGET MARKER (Draggable Crosshair)
  const target = document.createElement('div');
  target.id = 'canvas-clicker-target';
  target.innerHTML = '+';
  Object.assign(target.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: '36px',
    height: '36px',
    marginTop: '-18px',
    marginLeft: '-18px',
    zIndex: '999998',
    backgroundColor: 'rgba(255, 0, 0, 0.4)',
    border: '2px solid red',
    borderRadius: '50%',
    color: 'white',
    fontSize: '24px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 8px rgba(0,0,0,0.5)',
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'move'
  });

  makeDraggable(target);

  // 2. CREATE TOGGLE SWITCH (Floating & Draggable Button)
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'canvas-clicker-toggle';
  toggleBtn.innerText = 'Clicker: OFF';
  Object.assign(toggleBtn.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '999999',
    padding: '12px 20px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#dc3545', // Red
    border: '2px solid #ffffff',
    borderRadius: '25px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
    cursor: 'move',
    userSelect: 'none',
    touchAction: 'none'
  });

  // 3. CLICK EXECUTION LOGIC
  function performClickAtTarget() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    // Get exact center coordinates of floating target
    const targetRect = target.getBoundingClientRect();
    const centerX = targetRect.left + targetRect.width / 2;
    const centerY = targetRect.top + targetRect.height / 2;

    const eventParams = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: centerX,
      clientY: centerY,
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true
    };

    // Temporarily hide UI so elementFromPoint grabs the element underneath
    target.style.pointerEvents = 'none';
    toggleBtn.style.pointerEvents = 'none';

    const hitElement = document.elementFromPoint(centerX, centerY) || canvas;

    hitElement.dispatchEvent(new PointerEvent('pointerdown', eventParams));
    hitElement.dispatchEvent(new PointerEvent('pointerup', eventParams));
    hitElement.dispatchEvent(new MouseEvent('click', eventParams));

    // Restore UI pointer interaction
    target.style.pointerEvents = 'auto';
    toggleBtn.style.pointerEvents = 'auto';
  }

  // 4. TOGGLE BUTTON ACTION
  function handleToggle(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    isActive = !isActive;

    if (isActive) {
      toggleBtn.innerText = 'Clicker: ON';
      toggleBtn.style.backgroundColor = '#28a745'; // Green
      target.style.backgroundColor = 'rgba(0, 255, 0, 0.4)'; // Target turns green
      target.style.borderColor = '#00ff00';

      performClickAtTarget(); // Immediate click
      clickTimer = setInterval(performClickAtTarget, CLICK_INTERVAL);
    } else {
      toggleBtn.innerText = 'Clicker: OFF';
      toggleBtn.style.backgroundColor = '#dc3545'; // Red
      target.style.backgroundColor = 'rgba(255, 0, 0, 0.4)'; // Target turns red
      target.style.borderColor = 'red';

      clearInterval(clickTimer);
      clickTimer = null;
    }
  }

  // Attach drag listener to toggle button, passing handleToggle as tap handler
  makeDraggable(toggleBtn, handleToggle);

  // Append UI to DOM
  document.body.appendChild(target);
  document.body.appendChild(toggleBtn);
})();
