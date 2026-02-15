// --- SAVEPOINT 4 ---
const videoElement = document.getElementById('input_video');
const videoContainer = document.getElementById('video-container');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const cursor = document.getElementById('hand-cursor');
const splitToggle = document.getElementById('split-toggle');
const boundsToggle = document.getElementById('bounds-toggle');
const controlBounds = document.getElementById('control-bounds');
const radiusToggle = document.getElementById('radius-toggle');
const presentationToggle = document.getElementById('presentation-toggle');
const presentationControls = document.getElementById('presentation-controls');
const exitPresentationBtn = document.getElementById('exit-presentation');
const toggleCameraPresentationBtn = document.getElementById('toggle-camera-presentation');
const nightModeToggle = document.getElementById('night-mode-toggle');
const speedSlider = document.getElementById('speed-slider');
const colorMatchToggle = document.getElementById('color-match-toggle');
const disclaimerPopup = document.getElementById('disclaimer-popup');
const disclaimerBtn = document.getElementById('disclaimer-cta');

// Panning and rotation state
let targetRotX = 0; // Pitch
let targetRotY = 0; // Yaw
// Zooming state
let posZ = 0;
let zoomVelocity = 0;

// Mouse Parallax
let mouseX = 0, mouseY = 0;
let targetMouseX = 0, targetMouseY = 0;

let cursorX = 0.5;
let cursorY = 0.5;
let lastPinchDist = -1;
let cursorEnabled = true;
let baseRotY = -.02;
let baseRotX = 0;
let wasHandDetected = false;
let splitScreenEnabled = false;
let boundsVisible = false;
let radiusModeEnabled = false;
let presentationModeEnabled = false;
let nightModeEnabled = false;
let colorMatchEnabled = true;

// Disclaimer Logic
if (disclaimerBtn && disclaimerPopup) {
  // Force display on load to ensure it appears every session
  disclaimerPopup.style.display = 'flex';
  disclaimerPopup.style.opacity = '1';

  disclaimerBtn.addEventListener('click', () => {
    disclaimerPopup.style.opacity = '0';
    setTimeout(() => {
      disclaimerPopup.style.display = 'none';
    }, 500);
  });
}

// Toggle Logic
document.getElementById('cursor-toggle').addEventListener('click', () => {
  cursorEnabled = !cursorEnabled;
  if (!cursorEnabled) cursor.style.display = 'none';
});

splitToggle.addEventListener('click', () => {
  splitScreenEnabled = !splitScreenEnabled;
  splitToggle.innerText = splitScreenEnabled ? 'Split: ON' : 'Split: OFF';
  splitToggle.style.background = splitScreenEnabled ? 'white' : '#ddd';
});

boundsToggle.addEventListener('click', () => {
  boundsVisible = !boundsVisible;
  boundsToggle.innerText = boundsVisible ? 'Bounds: ON' : 'Bounds: OFF';
  boundsToggle.style.background = boundsVisible ? '#4CAF50' : '#ddd';
  boundsToggle.style.color = boundsVisible ? 'white' : 'black';
  controlBounds.style.display = boundsVisible ? 'block' : 'none';
  // Sync initial size
  controlBounds.style.width = (window.galleryParams.areaWidth * 100) + '%';
  controlBounds.style.height = (window.galleryParams.areaHeight * 100) + '%';
});

radiusToggle.addEventListener('click', () => {
  radiusModeEnabled = !radiusModeEnabled;
  radiusToggle.innerText = radiusModeEnabled ? 'Radius: ON' : 'Radius: OFF';
  radiusToggle.style.background = radiusModeEnabled ? '#4CAF50' : '#ddd';
  radiusToggle.style.color = radiusModeEnabled ? 'white' : 'black';
});

presentationToggle.addEventListener('click', () => {
  togglePresentationMode(true);
});

exitPresentationBtn.addEventListener('click', () => {
  togglePresentationMode(false);
});

toggleCameraPresentationBtn.addEventListener('click', () => {
  if (videoContainer.style.display === 'none') {
    videoContainer.style.display = 'block';
    toggleCameraPresentationBtn.style.background = 'rgba(76, 175, 80, 0.6)';
  } else {
    videoContainer.style.display = 'none';
    toggleCameraPresentationBtn.style.background = 'rgba(255, 255, 255, 0.2)';
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && presentationModeEnabled) {
    togglePresentationMode(false);
  }
});

function togglePresentationMode(active) {
  presentationModeEnabled = active;
  const bento = document.getElementById('bento-container');
  const gui = document.querySelector('.lil-gui.root');

  if (active) {
    document.body.classList.add('presentation-mode');
    bento.style.display = 'none';
    if (gui) gui.style.display = 'none';
    cursor.style.display = 'none';
    controlBounds.style.display = 'none';
    if (videoContainer) videoContainer.style.display = 'none';
    presentationControls.style.display = 'flex';
    toggleCameraPresentationBtn.style.background = 'rgba(255, 255, 255, 0.2)';
  } else {
    document.body.classList.remove('presentation-mode');
    bento.style.display = 'grid';
    if (gui) gui.style.display = 'block';
    if (cursorEnabled) cursor.style.display = 'block';
    if (boundsVisible) controlBounds.style.display = 'block';
    if (videoContainer) videoContainer.style.display = 'block';
    presentationControls.style.display = 'none';
  }
}

nightModeToggle.addEventListener('click', () => {
  nightModeEnabled = !nightModeEnabled;
  document.body.classList.toggle('night-mode');
  nightModeToggle.innerText = nightModeEnabled ? 'Night Mode: ON' : 'Night Mode: OFF';
  nightModeToggle.style.background = nightModeEnabled ? '#333' : 'white';
  nightModeToggle.style.color = nightModeEnabled ? 'white' : 'black';
});

colorMatchToggle.addEventListener('click', async () => {
  colorMatchEnabled = !colorMatchEnabled;
  colorMatchToggle.innerText = colorMatchEnabled ? 'Processing...' : 'Color Match: OFF';
  colorMatchToggle.style.background = colorMatchEnabled ? '#4CAF50' : 'white';
  colorMatchToggle.style.color = colorMatchEnabled ? 'white' : 'black';

  if (colorMatchEnabled) {
    await toggleColorSort(true);
    colorMatchToggle.innerText = 'Color Match: ON';
  } else {
    toggleColorSort(false);
  }
});

document.addEventListener('mousemove', (e) => {
  targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// Sync Speed Slider with Global Params
speedSlider.addEventListener('input', (e) => {
  window.galleryParams.autoRotateSpeed = parseFloat(e.target.value);
});

// 2. HAND TRACKING LOGIC
let latestResults = null;

function onResults(results) {
  latestResults = results;
}

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

hands.onResults(onResults);

const mpCamera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 1280,
  height: 720
});
mpCamera.start();

// --- MAIN RENDER LOOP (Decoupled from Camera) ---
function animate() {
  requestAnimationFrame(animate);

  // Draw Camera Feed & Skeleton
  if (latestResults) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(latestResults.image, 0, 0, canvasElement.width, canvasElement.height);

    const handDetected = latestResults.multiHandLandmarks && latestResults.multiHandLandmarks.length > 0;

    if (handDetected) {
      const hand = latestResults.multiHandLandmarks[0];
      const thumb = hand[4];
      const index = hand[8];

      drawConnectors(canvasCtx, hand, HAND_CONNECTIONS, { color: '#FFFFFF', lineWidth: 2 });
      drawLandmarks(canvasCtx, hand, { color: '#000000', lineWidth: 1, radius: 3 });

      // Logic from previous onResults
      const midX = (thumb.x + index.x) / 2;
      const midY = (thumb.y + index.y) / 2;
      const distance = Math.hypot(index.x - thumb.x, index.y - thumb.y);

      if (lastPinchDist > 0) {
        const delta = distance - lastPinchDist;
        if (radiusModeEnabled) {
          window.galleryParams.sphereRadius += delta * 2000;
          window.galleryParams.sphereRadius = Math.max(500, Math.min(3000, window.galleryParams.sphereRadius));
          window.updateGalleryRadius();
        } else {
          zoomVelocity += delta * 3000;
        }
      }
      lastPinchDist = distance;

      let effectiveX;
      if (splitScreenEnabled) {
        effectiveX = midX < 0.5 ? midX * 2 : (midX - 0.5) * 2;
      } else {
        effectiveX = midX;
      }

      let dx = (effectiveX - 0.5) / window.galleryParams.areaWidth;
      let dy = (midY - 0.5) / window.galleryParams.areaHeight;

      dx = Math.max(-0.5, Math.min(0.5, dx));
      dy = Math.max(-0.5, Math.min(0.5, dy));

      const handRotY = dx * -window.galleryParams.rotationSensitivity;
      const handRotX = dy * -window.galleryParams.rotationSensitivity;

      if (!wasHandDetected) {
        baseRotY = targetRotY - handRotY;
        baseRotX = targetRotX - handRotX;
      }
      targetRotY = baseRotY + handRotY;
      targetRotX = baseRotX + handRotX;

      // UPDATE CURSOR
      if (cursorEnabled && !presentationModeEnabled) {
        cursor.style.display = 'block';
        const targetCursorX = 1 - effectiveX;
        const targetCursorY = midY;
        cursorX += (targetCursorX - cursorX) * window.galleryParams.smoothingFactor;
        cursorY += (targetCursorY - cursorY) * window.galleryParams.smoothingFactor;
        cursor.style.left = (cursorX * 100) + '%';
        cursor.style.top = (cursorY * 100) + '%';
      }

      wasHandDetected = true;
    } else {
      // No hand detected in this frame
      handleNoHand();
    }
    canvasCtx.restore();
  } else {
    // No camera results yet
    handleNoHand();
  }

  // Common updates (ALWAYS RUNNING)
  window.updateSphereRotation(THREE.MathUtils.degToRad(targetRotX), THREE.MathUtils.degToRad(targetRotY));

  if (audioInitialized && (Math.abs(targetRotY) > 0.1 || Math.abs(targetRotX) > 0.1)) {
    const now = Date.now();
    if (now - lastNoteTime > 200) {
      playNote();
      lastNoteTime = now;
    }
  }

  mouseX += (targetMouseX - mouseX) * 0.05;
  mouseY += (targetMouseY - mouseY) * 0.05;

  camera.position.x = mouseX * 100;
  camera.position.y = mouseY * 100;
  camera.lookAt(0, 0, window.galleryParams.sphereCenterZ);

  if (wasHandDetected) { // Use state from current or recent frame
    zoomVelocity *= 0.94;
    posZ += zoomVelocity;
    posZ = Math.max(-1000, Math.min(2100, posZ));
  } else {
    posZ += (0 - posZ) * 0.1;
    zoomVelocity = 0;
  }

  window.zoomTo(window.galleryParams.sphereCenterZ + posZ);

  const sphereCenterZ = mainGroup.position.z;
  mainGroup.updateMatrixWorld();

  // Reuse existing updateVisibility function
  const currentRadius = window.galleryParams.sphereRadius || 1320;
  const fadeDistance = currentRadius * 0.4;

  sphereGroup.children.forEach(child => {
    const element = child.element;
    if (element.classList.contains('image-item')) {
      child.lookAt(mainGroup.position);
      child.updateMatrixWorld();
      const elements = child.matrixWorld.elements;
      const centerZ = elements[14];
      const distanceToCenterPlane = centerZ - sphereCenterZ;

      let opacity = 1.0;
      if (distanceToCenterPlane > -50) {
        opacity = 1.0 - ((distanceToCenterPlane + 50) / fadeDistance);
      }
      opacity = Math.max(0, Math.min(1, opacity));

      const lastOpacity = element._lastOpacity || -1;
      // Increased throttle threshold for performance
      if (Math.abs(opacity - lastOpacity) > 0.05 || opacity === 1 || opacity === 0) {
        element.style.opacity = opacity;
        element._lastOpacity = opacity;
        // Disable interaction if invisible to prevent UI blocking
        element.style.pointerEvents = opacity < 0.1 ? 'none' : 'auto';
      }

      element.style.clipPath = 'none';

      const baseScale = window.galleryParams.imageScale || 1.0;
      if (opacity > 0) {
        const distXY = Math.sqrt(elements[12] * elements[12] + elements[13] * elements[13]);
        let scale = baseScale;
        if (distXY < 350) scale = baseScale + (1 - distXY / 350) * 0.3;
        child.scale.set(scale, scale, scale);
      }
    }
  });

  renderer.render(scene, camera);
}

function handleNoHand() {
  lastPinchDist = -1;
  cursor.style.display = 'none';
  wasHandDetected = false;
  if (window.galleryParams.autoRotateX) targetRotX += window.galleryParams.autoRotateSpeed;
  if (window.galleryParams.autoRotateY) targetRotY += window.galleryParams.autoRotateSpeed;
}

// Start Loop
animate();

// Start in Presentation Mode
togglePresentationMode(true);

// Initialize Color Match
if (colorMatchEnabled) {
  colorMatchToggle.innerText = 'Color Match: ON';
  colorMatchToggle.style.background = '#4CAF50';
  colorMatchToggle.style.color = 'white';
  // Wait for gallery to be ready
  setTimeout(() => {
    if (typeof toggleColorSort === 'function') {
      toggleColorSort(true);
    }
  }, 100);
}