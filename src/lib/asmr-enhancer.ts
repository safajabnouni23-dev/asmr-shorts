// ASMR Sound Enhancer — 100% client-side using Web Audio API
// Generates binaural beats (theta waves) + pink noise to enhance ASMR tingles

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let oscillators: OscillatorNode[] = [];
let noiseSource: AudioBufferSourceNode | null = null;
let isEnhancing = false;

// Theta wave frequency (4-8 Hz) — proven to enhance relaxation and ASMR tingles
const BINAURAL_BASE = 110; // Hz (low, soothing tone)
const BINAURAL_BEAT = 6; // Hz (theta wave — relaxation zone)

function createPinkNoise(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.028;
    b6 = white * 0.115926;
  }
  return buffer;
}

export function startASMREnhancer(onReady?: () => void): boolean {
  if (isEnhancing) return true;

  try {
    // Create or resume AudioContext (must be called from user gesture)
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    // Master gain for overall volume control
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.15; // Subtle — shouldn't overpower the video audio
    masterGain.connect(audioCtx.destination);

    // === Binaural Beats ===
    // Left ear: base frequency
    const oscLeft = audioCtx.createOscillator();
    const gainLeft = audioCtx.createGain();
    oscLeft.type = "sine";
    oscLeft.frequency.value = BINAURAL_BASE;
    gainLeft.gain.value = 0.3;
    oscLeft.connect(gainLeft);

    // Right ear: base + beat frequency (creates the binaural effect)
    const oscRight = audioCtx.createOscillator();
    const gainRight = audioCtx.createGain();
    oscRight.type = "sine";
    oscRight.frequency.value = BINAURAL_BASE + BINAURAL_BEAT;
    gainRight.gain.value = 0.3;
    oscRight.connect(gainRight);

    // Stereo panner — left to left, right to right
    const merger = audioCtx.createChannelMerger(2);
    gainLeft.connect(merger, 0, 0);
    gainRight.connect(merger, 0, 1);
    merger.connect(masterGain);

    oscLeft.start();
    oscRight.start();
    oscillators = [oscLeft, oscRight];

    // === Pink Noise Layer (very subtle, adds texture) ===
    const noiseBuffer = createPinkNoise(audioCtx);
    noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.05; // Very subtle

    // High-pass filter to remove low rumble
    const highpass = audioCtx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 200;

    // Low-pass filter to keep it soft
    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 2000;

    noiseSource.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(masterGain);
    noiseSource.start();

    isEnhancing = true;

    if (onReady) onReady();

    console.log("[ASMR Enhancer] Started — theta waves @", BINAURAL_BEAT, "Hz + pink noise");
    return true;
  } catch (err) {
    console.error("[ASMR Enhancer] Failed to start:", err);
    return false;
  }
}

export function stopASMREnhancer(): void {
  if (!isEnhancing) return;

  try {
    // Stop oscillators
    oscillators.forEach((osc) => {
      try { osc.stop(); } catch {}
    });
    oscillators = [];

    // Stop noise
    if (noiseSource) {
      try { noiseSource.stop(); } catch {}
      noiseSource = null;
    }

    // Disconnect master gain
    if (masterGain) {
      masterGain.disconnect();
      masterGain = null;
    }

    isEnhancing = false;
    console.log("[ASMR Enhancer] Stopped");
  } catch (err) {
    console.error("[ASMR Enhancer] Failed to stop:", err);
  }
}

export function toggleASMREnhancer(onReady?: () => void): boolean {
  if (isEnhancing) {
    stopASMREnhancer();
    return false;
  } else {
    return startASMREnhancer(onReady);
  }
}

export function isASMREnhancerActive(): boolean {
  return isEnhancing;
}

export function setEnhancerVolume(volume: number): void {
  if (masterGain) {
    masterGain.gain.setTargetAtTime(Math.max(0, Math.min(0.5, volume)), audioCtx!.currentTime, 0.1);
  }
}
