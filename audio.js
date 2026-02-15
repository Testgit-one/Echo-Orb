// --- SAVEPOINT 4 ---
const volumeSlider = document.getElementById('volume-slider');
const muteToggle = document.getElementById('mute-toggle');
const scaleSelect = document.getElementById('scale-select');
const instrumentSelect = document.getElementById('instrument-select');

// Audio Context for Wind Sound
let audioCtx, gainNode;
let audioInitialized = false;
let lastNoteTime = 0;
let masterVolume = parseFloat(volumeSlider.value);
let isMuted = false;

function initAudio() {
  if (audioInitialized) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();
  
  gainNode = audioCtx.createGain();
  gainNode.gain.value = isMuted ? 0 : masterVolume;
  gainNode.connect(audioCtx.destination);
  
  audioInitialized = true;
}

function playNote() {
  if (!audioInitialized || isMuted) return;
  
  const scales = {
    'major': [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 783.99],
    'minor': [261.63, 293.66, 311.13, 349.23, 392.00, 415.30, 466.16, 523.25, 587.33, 622.25, 783.99],
    'pentatonic-major': [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99],
    'pentatonic-minor': [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25, 698.46, 783.99]
  };

  const selectedScale = scaleSelect.value;
  const notes = scales[selectedScale] || scales['major'];
  const freq = notes[Math.floor(Math.random() * notes.length)];
  const instrument = instrumentSelect.value;
  const now = audioCtx.currentTime;
  
  const noteGain = audioCtx.createGain();
  noteGain.connect(gainNode);
  
  if (instrument === 'piano') {
    // Grand Piano Synthesis: Unison oscillators + Filter Envelope
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const osc3 = audioCtx.createOscillator();
    
    osc1.type = 'triangle';
    osc2.type = 'triangle';
    osc3.type = 'sine'; 

    osc1.frequency.value = freq;
    osc2.frequency.value = freq;
    osc3.frequency.value = freq;

    // Detune for realism (unison effect)
    osc1.detune.value = -7;
    osc2.detune.value = 7;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.7;

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(noteGain);

    // Main Amplitude Envelope
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.3, now + 0.02); // Fast attack
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5); // Long decay

    // Filter Frequency Envelope (Brightness decay)
    filter.frequency.setValueAtTime(freq * 5, now);
    filter.frequency.exponentialRampToValueAtTime(freq, now + 0.5);
    
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    
    osc1.stop(now + 2.5);
    osc2.stop(now + 2.5);
    osc3.stop(now + 2.5);

  } else if (instrument === 'guitar') {
    // Guitar: Sawtooth with Lowpass Filter Envelope (Pluck)
    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1;
    
    osc.connect(filter);
    filter.connect(noteGain);
    
    // Filter Envelope
    filter.frequency.setValueAtTime(freq * 4, now);
    filter.frequency.exponentialRampToValueAtTime(freq, now + 0.2);
    
    // Gain Envelope
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
    
    osc.start(now);
    osc.stop(now + 2.0);
  } else {
    // Sine (Default)
    const osc = audioCtx.createOscillator();
    osc.type = 'sine'; 
    osc.frequency.value = freq;
    osc.connect(noteGain);
    
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.1, now + 0.05); // Attack
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5); // Decay
    
    osc.start(now);
    osc.stop(now + 1.5);
  }
}

volumeSlider.addEventListener('input', (e) => {
  masterVolume = parseFloat(e.target.value);
  if (audioInitialized && gainNode) {
    gainNode.gain.setTargetAtTime(isMuted ? 0 : masterVolume, audioCtx.currentTime, 0.1);
  }
});

muteToggle.addEventListener('click', () => {
  isMuted = !isMuted;
  muteToggle.innerText = isMuted ? 'Unmute' : 'Mute';
  muteToggle.style.background = isMuted ? '#ff4444' : 'white';
  muteToggle.style.color = isMuted ? 'white' : 'black';
  if (audioInitialized && gainNode) {
    gainNode.gain.setTargetAtTime(isMuted ? 0 : masterVolume, audioCtx.currentTime, 0.1);
  }
});

document.body.addEventListener('click', initAudio, { once: true });
document.body.addEventListener('touchstart', initAudio, { once: true });