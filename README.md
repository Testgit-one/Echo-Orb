# Echo Orb

A 3D immersive image gallery controlled by hand gestures, built with Three.js and MediaPipe. Images are arranged on a dynamic Fibonacci sphere, allowing for an interactive spatial browsing experience.

## Features

- **Hand Tracking Navigation**: 
  - **Pan**: Move your hand to rotate the sphere.
  - **Zoom**: Pinch (thumb and index finger) to zoom in/out or adjust sphere radius.
- **Presentation Mode**: A clean, UI-free mode for showcasing the gallery.
- **Audio Feedback**: Procedural audio generation (wind, notes) based on interaction speed and gestures.
- **Customization**: Real-time adjustment of physics, layout, and camera via a GUI panel.
- **Visual Effects**: 
  - Magnetic image scaling.
  - Dynamic lighting and night mode.
  - Particle systems.

## Installation & Usage

1. Clone this repository.
2. Open `index.html` in a modern web browser.
   - *Note*: For best results with camera access, serve the files using a local web server (e.g., Live Server in VS Code or Python `http.server`).
3. Allow camera permissions when prompted.

## Controls

- **Cursor Toggle**: Enable/Disable the hand tracking cursor.
- **Split Mode**: Toggles control mapping for split-screen setups.
- **Radius Mode**: Switches pinch gesture to control sphere radius instead of zoom.
- **Presentation Mode**: Hides all UI elements. Press `ESC` or use the bottom-right controls to exit.

## Technologies Used

- Three.js (CSS3DRenderer)
- MediaPipe Hands
- GSAP (Animations)
- lil-gui