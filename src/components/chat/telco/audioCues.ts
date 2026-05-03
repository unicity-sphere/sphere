// Centralized audio cues for the call lifecycle:
//   - 'ring'         (incoming call ringing)
//   - 'ringback'     (outgoing call dial tone — heard by caller)
//   - 'reconnecting' (low pulse during connection recovery)
//   - 'ended'        (descending tone when call closes/fails)
//
// All cues share a single AudioContext. The context is created lazily and
// reused across calls. resume() is best-effort: if the cue fires outside a
// user gesture (e.g., incoming ring) Chrome may keep it suspended and the
// cue is silent — that's a browser policy limitation, not a bug.

export type CueId = 'ring' | 'ringback' | 'reconnecting' | 'ended';

let audioCtx: AudioContext | null = null;
let activeCue: CueId | null = null;
let nodes: AudioNode[] = [];
let cueInterval: ReturnType<typeof setInterval> | null = null;
let stopTimers: Array<ReturnType<typeof setTimeout>> = [];

function ensureCtx(): AudioContext | null {
  if (audioCtx && audioCtx.state === 'closed') {
    audioCtx = null;
  }
  if (!audioCtx) {
    try {
      const Ctor = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function clearScheduled() {
  if (cueInterval !== null) {
    clearInterval(cueInterval);
    cueInterval = null;
  }
  for (const t of stopTimers) clearTimeout(t);
  stopTimers = [];
  for (const n of nodes) {
    try {
      if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
        (n as OscillatorNode).stop();
      }
      n.disconnect();
    } catch { /* noop */ }
  }
  nodes = [];
}

/**
 * Synchronously create + resume the cues AudioContext within a user gesture.
 * Call from startCall/acceptCall (before the first await) so subsequent cues
 * (ringback, drop, etc) are not blocked by autoplay policy.
 */
export function unlockCues(): void {
  ensureCtx();
}

export function stopCue(): void {
  clearScheduled();
  activeCue = null;
}

export function playCue(id: CueId): void {
  if (activeCue === id) return; // already playing this cue
  clearScheduled();
  activeCue = id;
  const ctx = ensureCtx();
  if (!ctx) return;

  switch (id) {
    case 'ring':
      // Vintage telephone bell — higher carriers + tremolo for the metallic
      // "trill" of an old electromechanical ringer. Sounds clearly different
      // from the caller's ringback so each side gets a distinct cue.
      startBellPattern(ctx);
      break;
    case 'ringback':
      // Standard dial-tone style: 440Hz + 480Hz, 2s on / 4s off — what the
      // CALLER hears while waiting for the callee to pick up.
      startRingbackPattern(ctx);
      break;
    case 'reconnecting':
      // Low single 300Hz pulse, 180ms on / 820ms off — subtle, conveys "trying"
      startReconnectPattern(ctx);
      break;
    case 'ended':
      // Descending 800Hz → 200Hz over 400ms, fade out
      playEndedSweep(ctx);
      break;
  }
}

/**
 * Vintage telephone bell. Two triangle oscillators (1000+1320Hz, perfect-fifth)
 * plus a 22Hz tremolo LFO modulating the master gain — produces the metallic
 * "trill" of an electromechanical ringer.
 *
 * Pattern: a CYCLE consists of 3 short rings ("brrr-brrr-brrr") then a long
 * silence — like an old desk phone:
 *   ring 350ms → pause 100ms → ring 350ms → pause 100ms → ring 350ms
 *   → silence 2700ms → repeat
 * Total cycle ≈ 4 seconds.
 */
function startBellPattern(ctx: AudioContext) {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(ctx.destination);

  // Tremolo modulator: LFO at 22Hz adds ±0.03 to masterGain.gain — when
  // masterGain.gain is at its baseline of 0.07 during a ring, the actual
  // output oscillates between ~0.04 and 0.10, creating the trill effect.
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 22;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.03;
  lfo.connect(lfoGain);
  lfoGain.connect(masterGain.gain);
  lfo.start();

  // Two carrier oscillators (triangle waves for the bell's harmonic content)
  const osc1 = ctx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.value = 1000;
  osc1.connect(masterGain);
  osc1.start();

  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.value = 1320;
  osc2.connect(masterGain);
  osc2.start();

  nodes.push(lfo, lfoGain, osc1, osc2, masterGain);

  // Schedule a "ring-ring-ring" burst pattern on the masterGain envelope.
  const RING_MS = 350;   // duration of each individual ring
  const GAP_MS = 100;    // gap between rings within a burst
  const RINGS_PER_BURST = 3;
  const PEAK = 0.07;
  const RAMP = 0.02;     // attack/release

  const scheduleBurst = () => {
    if (audioCtx === null) return;
    const t0 = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(t0);
    masterGain.gain.setValueAtTime(0, t0);
    for (let i = 0; i < RINGS_PER_BURST; i++) {
      const tStart = t0 + i * (RING_MS + GAP_MS) / 1000;
      const tHold = tStart + RAMP;
      const tEnd = tStart + RING_MS / 1000;
      masterGain.gain.setValueAtTime(0, tStart);
      masterGain.gain.linearRampToValueAtTime(PEAK, tHold);
      masterGain.gain.setValueAtTime(PEAK, tEnd - RAMP);
      masterGain.gain.linearRampToValueAtTime(0, tEnd);
    }
  };
  scheduleBurst();
  cueInterval = setInterval(scheduleBurst, 4000);
}

/**
 * Caller-side ringback (the "you-are-being-rung" tone the caller hears
 * through the line). Standard NA-style 440+480Hz, 2s on / 4s off.
 */
function startRingbackPattern(ctx: AudioContext) {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = 440;
  osc1.connect(gain);
  osc1.start();

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 480;
  osc2.connect(gain);
  osc2.start();

  nodes.push(osc1, osc2, gain);

  const burst = () => {
    if (audioCtx === null) return;
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.05);
    gain.gain.setValueAtTime(0.15, t + 1.95);
    gain.gain.linearRampToValueAtTime(0, t + 2.0);
  };
  burst();
  cueInterval = setInterval(burst, 6000);
}

function startReconnectPattern(ctx: AudioContext) {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 300;
  osc.connect(gain);
  osc.start();

  nodes.push(osc, gain);

  const beep = () => {
    if (audioCtx === null) return;
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.10, t + 0.02);
    gain.gain.setValueAtTime(0.10, t + 0.18);
    gain.gain.linearRampToValueAtTime(0, t + 0.2);
  };
  beep();
  cueInterval = setInterval(beep, 1000);
}

function playEndedSweep(ctx: AudioContext) {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.connect(gain);

  const t = ctx.currentTime;
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.4);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
  gain.gain.linearRampToValueAtTime(0, t + 0.5);

  osc.start(t);
  osc.stop(t + 0.5);

  nodes.push(osc, gain);
  // Auto-clear once the sweep finishes
  stopTimers.push(setTimeout(() => stopCue(), 600));
}
