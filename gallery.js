// --- SAVEPOINT 4 ---
window.galleryParams = {
  rotationSensitivity: 346.5,
  sphereRadius: 1320,
  sphereCenterX: 0,
  sphereCenterY: 32,
  sphereCenterZ: -2500,
  smoothingFactor: 0.165,
  autoRotateX: true,
  autoRotateY: true,
  autoRotateSpeed: 0.209,
  imageScale: 1.0,
  cameraZ: 1000,
  cameraZoomSpeed: 1.5,
  areaWidth: 1.0,
  areaHeight: 1.0,
  cameraFov: 50,
  resetCamera: () => {
    gsap.to(window.galleryParams, { cameraZ: 1000, cameraFov: 50, duration: 1.5, ease: "power2.out" });
    gsap.to(window.camera.position, { z: 1000, duration: 1.5, ease: "power2.out", overwrite: true });
    gsap.to(window.camera, { fov: 50, duration: 1.5, ease: "power2.out", onUpdate: () => window.camera.updateProjectionMatrix() });
  },
  dollyZoom: () => {
    const tl = gsap.timeline();
    tl.to(window.camera.position, { z: 200, duration: 2, ease: "power2.inOut", overwrite: true }, 0)
      .to(window.camera, { fov: 120, duration: 2, ease: "power2.inOut", onUpdate: () => window.camera.updateProjectionMatrix() }, 0)
      .to(window.galleryParams, { cameraZ: 200, cameraFov: 120, duration: 2, ease: "power2.inOut" }, 0)
      .to(window.camera.position, { z: 1000, duration: 2, ease: "power2.inOut", overwrite: true }, 2.5)
      .to(window.camera, { fov: 50, duration: 2, ease: "power2.inOut", onUpdate: () => window.camera.updateProjectionMatrix() }, 2.5)
      .to(window.galleryParams, { cameraZ: 1000, cameraFov: 50, duration: 2, ease: "power2.inOut" }, 2.5);
  },
  exportConfig: () => {
    const params = { ...window.galleryParams };
    Object.keys(params).forEach(key => {
      if (typeof params[key] === 'function') delete params[key];
    });
    console.log('%c[Gallery Config] Copy this JSON to gallery.js:', 'color: #4CAF50; font-weight: bold;');
    console.log(JSON.stringify(params, null, 2));
    alert('Configuration logged to Console (F12).\nCopy the JSON to gallery.js to save these settings.');
  }
};


// --- THREE.JS SETUP ---
window.scene = new THREE.Scene();
// Camera stationary at 0,0,1000 looking at -2500
window.camera = new THREE.PerspectiveCamera(window.galleryParams.cameraFov, window.innerWidth / window.innerHeight, 1, 5000);
camera.position.set(0, 0, window.galleryParams.cameraZ);

window.renderer = new THREE.CSS3DRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

window.mainGroup = new THREE.Group();
mainGroup.position.set(window.galleryParams.sphereCenterX, window.galleryParams.sphereCenterY, window.galleryParams.sphereCenterZ);
scene.add(mainGroup);

window.sphereGroup = new THREE.Group();
mainGroup.add(sphereGroup);

window.gridGroup = new THREE.Group();
gridGroup.scale.set(0.99, 0.99, 0.99); // Fix Z-fighting by placing grid slightly inside
mainGroup.add(gridGroup);
gridGroup.visible = false; // Hide grid efficiently

// Handle window resize
window.addEventListener('resize', () => {
  window.camera.aspect = window.innerWidth / window.innerHeight;
  window.camera.updateProjectionMatrix();
  window.renderer.setSize(window.innerWidth, window.innerHeight);
});

window.updateGalleryRadius = () => {
  const r = window.galleryParams.sphereRadius;
  sphereGroup.children.forEach(obj => {
    if (obj.userData.normalizedPos) {
      const scale = obj.userData.radiusScale || 1;
      obj.position.copy(obj.userData.normalizedPos).multiplyScalar(r * scale);
    }
  });
};

// --- GSAP SETUP ---
// QuickTo for high performance continuous updates
window.updateSphereRotation = (x, y) => gsap.to(sphereGroup.rotation, { x: x, y: y, duration: 1.2, ease: "power2.out", overwrite: 'auto' });
window.zoomTo = gsap.quickTo(mainGroup.position, "z", { duration: 0.8, ease: "power2.out" });

let galleryOriginalUrls = [];
let gallerySortedUrls = null;
const colorCache = new Map();

const getDominantColor = (url) => {
  if (colorCache.has(url)) return Promise.resolve(colorCache.get(url));
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      const rgb = { r, g, b };
      colorCache.set(url, rgb);
      resolve(rgb);
    };
    img.onerror = () => resolve({ r: 0, g: 0, b: 0 });
  });
};

const rgbToHsl = (r, g, b) => {
  r /= 255, g /= 255, b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
};

async function sortImagesByColor(urls) {
  // Process in batches to prevent network/CPU congestion
  const batchSize = 10;
  const results = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(async (url) => {
      const rgb = await getDominantColor(url);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      return { url, h: hsl[0] };
    }));
    results.push(...batchResults);
  }

  results.sort((a, b) => a.h - b.h);
  return results.map(item => item.url);
}

async function toggleColorSort(enable) {
  if (enable) {
    if (!gallerySortedUrls) {
      gallerySortedUrls = await sortImagesByColor(galleryOriginalUrls);
    }
    renderGallery(gallerySortedUrls, true);
  } else {
    renderGallery(galleryOriginalUrls, true);
  }
}

// 1. GENERATE IMAGES
function renderGallery(imageUrls, isInternalReorder = false) {
  // Clear existing group
  while (sphereGroup.children.length > 0) {
    const obj = sphereGroup.children[0];
    // Break circular reference for GC
    if (obj.element && obj.element.threeObject) {
      obj.element.threeObject = null;
    }
    sphereGroup.remove(obj);
  }

  // Clear grid
  while (gridGroup.children.length > 0) {
    gridGroup.remove(gridGroup.children[0]);
  }

  if (!isInternalReorder) {
    galleryOriginalUrls = [...imageUrls];
    gallerySortedUrls = null;
  }

  const numImages = imageUrls.length;

  // Update Image Count in Bento Grid
  const countEl = document.getElementById('image-count');
  if (countEl) countEl.innerText = `Images: ${numImages}`;


  // Dynamic Grid Configuration
  // (Used for wireframes)
  const totalPoints = Math.max(50, numImages * 2);
  const ratio = 1.0;
  const estCols = Math.sqrt(totalPoints / ratio);
  const numLon = Math.max(3, Math.ceil(estCols / 2));
  const numLat = Math.ceil(totalPoints / (numLon * 2)) + 1;

  // Distribute Images using Fibonacci Sphere (Equal Spacing)
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden Angle

  for (let i = 0; i < numImages; i++) {
    const y = 1 - (i / Math.max(1, numImages - 1)) * 2; // y goes from 1 to -1
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    const img = document.createElement('img');
    img.src = imageUrls[i];
    img.className = 'image-item';
    img.style.width = '212.91px';
    img.style.height = 'auto';
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease-in';

    // Optimize loading
    img.loading = 'eager'; // Load immediately, don't lazy load
    img.decoding = 'async'; // Decode off main thread

    // Preload and fade in when ready
    img.decode().then(() => {
      img.style.opacity = '1';
    }).catch(() => {
      img.style.opacity = '1'; // Show anyway if decode fails
    });

    img.onload = function () {
      if (this.naturalWidth > this.naturalHeight) {
        // Landscape: Increase size by 10%
        this.style.width = (212.91 * 1.1) + 'px';
      }
    };

    // Create CSS3D Object
    const object = new THREE.CSS3DObject(img);
    object.position.set(x * window.galleryParams.sphereRadius, y * window.galleryParams.sphereRadius, z * window.galleryParams.sphereRadius);
    // Face the center of the sphere (Inwards)
    object.lookAt(0, 0, 0);
    img.threeObject = object; // Link DOM element to 3D object for interaction
    object.userData = { isImage: true, normalizedPos: new THREE.Vector3(x, y, z), radiusScale: 1 };

    sphereGroup.add(object);
  }

  // Add Wireframe Rings

  // Latitudes
  for (let i = 1; i < numLat; i++) {
    const phi = Math.PI * i / numLat;
    const r = window.galleryParams.sphereRadius * Math.sin(phi);
    const y = window.galleryParams.sphereRadius * Math.cos(phi);

    const el = document.createElement('div');
    el.className = 'wireframe-ring';
    el.style.width = (r * 2) + 'px';
    el.style.height = (r * 2) + 'px';

    const obj = new THREE.CSS3DObject(el);
    obj.position.set(0, y, 0);
    obj.rotation.x = Math.PI / 2;
    gridGroup.add(obj);
  }

  // Longitudes
  for (let i = 0; i < numLon; i++) {
    const theta = Math.PI * i / numLon;

    const el = document.createElement('div');
    el.className = 'wireframe-ring';
    el.style.width = (window.galleryParams.sphereRadius * 2) + 'px';
    el.style.height = (window.galleryParams.sphereRadius * 2) + 'px';

    const obj = new THREE.CSS3DObject(el);
    obj.position.set(0, 0, 0);
    obj.rotation.y = theta;
    gridGroup.add(obj);
  }


}

// Initial Random Images
// Initial Images from Data Module
const initialImages = (window.galleryData && window.galleryData.images && window.galleryData.images.length > 0)
  ? window.galleryData.images
  : Array.from({ length: 56 }, (_, i) => `https://picsum.photos/seed/${i + 10}/300/400`);

renderGallery(initialImages);

// Dismiss Loading Screen
window.addEventListener('load', () => {
  const loader = document.getElementById('loading-overlay');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.visibility = 'hidden';
      loader.style.display = 'none'; // Ensure it's gone
    }, 500);
  }
});

// --- GUI SETUP ---
import('https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm').then(({ default: GUI }) => {
  const gui = new GUI();
  gui.add(window.galleryParams, 'rotationSensitivity', 50, 1000).name('Rot Sensitivity');
  gui.add(window.galleryParams, 'smoothingFactor', 0.01, 1.0).name('Smoothing');

  const sphereFolder = gui.addFolder('Sphere');
  sphereFolder.add(window.galleryParams, 'sphereRadius', 500, 3000).name('Radius').listen().onChange(() => {
    // Use efficient update instead of full re-render when dragging slider
    window.updateGalleryRadius();
  });
  sphereFolder.add(window.galleryParams, 'sphereCenterX', -2000, 2000).name('Center X').onChange((v) => {
    mainGroup.position.x = v;
  });
  sphereFolder.add(window.galleryParams, 'sphereCenterY', -2000, 2000).name('Center Y').onChange((v) => {
    mainGroup.position.y = v;
  });
  sphereFolder.add(window.galleryParams, 'sphereCenterZ', -5000, 0).name('Center Z').onChange((v) => {
    mainGroup.position.z = v;
  });
  sphereFolder.add(window.galleryParams, 'imageScale', 0.1, 3.0).name('Image Scale');
  sphereFolder.add(window.galleryParams, 'cameraZ', 0, 2500).name('Camera Zoom').listen().onChange((v) => {
    gsap.to(camera.position, { z: v, duration: window.galleryParams.cameraZoomSpeed, ease: "power2.out", overwrite: true });
  });
  sphereFolder.add(window.galleryParams, 'cameraZoomSpeed', 0.1, 5.0).name('Cam Zoom Speed');
  sphereFolder.add(window.galleryParams, 'cameraFov', 10, 120).name('Field of View').listen().onChange((v) => {
    camera.fov = v;
    camera.updateProjectionMatrix();
  });
  sphereFolder.add(window.galleryParams, 'resetCamera').name('Reset Camera');
  sphereFolder.add(window.galleryParams, 'dollyZoom').name('Dolly Zoom FX');
  sphereFolder.add(window.galleryParams, 'exportConfig').name('Save Config to Code');

  const controlFolder = gui.addFolder('Control Area');
  const updateBounds = () => {
    const el = document.getElementById('control-bounds');
    if (el) {
      el.style.width = (window.galleryParams.areaWidth * 100) + '%';
      el.style.height = (window.galleryParams.areaHeight * 100) + '%';
    }
  };
  controlFolder.add(window.galleryParams, 'areaWidth', 0.1, 1.0).name('Width').onChange(updateBounds);
  controlFolder.add(window.galleryParams, 'areaHeight', 0.1, 1.0).name('Height').onChange(updateBounds);

  const autoRotFolder = gui.addFolder('Auto Rotation');
  autoRotFolder.add(window.galleryParams, 'autoRotateX').name('Rotate X');
  autoRotFolder.add(window.galleryParams, 'autoRotateY').name('Rotate Y');
  autoRotFolder.add(window.galleryParams, 'autoRotateSpeed', 0, 2.0).name('Speed').listen();
});