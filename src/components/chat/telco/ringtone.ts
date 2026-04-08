import { RING_FREQUENCY_1, RING_FREQUENCY_2, RING_ON_MS, RING_OFF_MS } from './constants';

let audioCtx: AudioContext | null = null;
let gainNode: GainNode | null = null;
let osc1: OscillatorNode | null = null;
let osc2: OscillatorNode | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let isRinging = false;

function createRingBurst(): void {
  if (!audioCtx || !gainNode) return;

  // Ramp gain up for the ring burst
  gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
  // Ramp down at the end of the burst
  gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime + RING_ON_MS / 1000 - 0.05);
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + RING_ON_MS / 1000);
}

/**
 * Start playing a two-tone ringtone (440Hz + 480Hz, North American standard).
 * Rings for 2 seconds, pauses for 4 seconds, repeats.
 */
export function playRingtone(): void {
  if (isRinging) return;
  isRinging = true;

  try {
    audioCtx = new AudioContext();
  } catch {
    isRinging = false;
    return; // No audio device available
  }
  // Resume if suspended (browser requires user gesture)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.connect(audioCtx.destination);

  osc1 = audioCtx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(RING_FREQUENCY_1, audioCtx.currentTime);
  osc1.connect(gainNode);
  osc1.start();

  osc2 = audioCtx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(RING_FREQUENCY_2, audioCtx.currentTime);
  osc2.connect(gainNode);
  osc2.start();

  // First burst immediately
  createRingBurst();

  // Subsequent bursts on interval
  ringInterval = setInterval(createRingBurst, RING_ON_MS + RING_OFF_MS);
}

/**
 * Stop the ringtone and release audio resources.
 */
export function stopRingtone(): void {
  if (!isRinging) return;
  isRinging = false;

  if (ringInterval !== null) {
    clearInterval(ringInterval);
    ringInterval = null;
  }

  osc1?.stop();
  osc2?.stop();
  osc1 = null;
  osc2 = null;
  gainNode = null;

  audioCtx?.close().catch(() => {});
  audioCtx = null;
}
