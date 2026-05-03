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
 * Vintage telephone bell. Two close-frequency triangle oscillators in the
 * upper-mid range (1000+1320Hz) plus a tremolo LFO that modulates amplitude
 * at ~22Hz. The fast tremolo + harmonic content of triangle waves produces
 * the characteristic metallic "ringing bell" trill of an old electromech-
 * anical ringer.
 *
 * Pattern: 1.5s ring burst, 2.5s silence, repeat (4s cycle).
 */
function startBellPattern(ctx: AudioContext) {
  // Master gain: shapes the burst envelope (silent → loud → silent every 4s)
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(ctx.destination);

  // Tremolo modulator: LFO at 22Hz that scales the master gain
  // Output value oscillates between ~0.4 and 1.0 — creates the "trill"
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 22;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.3; // tremolo depth (added to baseline 0.7 below)
  lfo.connect(lfoGain);
  // Connect LFO to a constant offset, then to masterGain.gain
  // Simpler: connect lfoGain directly to masterGain.gain — the LFO adds
  // ±0.3 around whatever masterGain.gain is set to.
  lfoGain.connect(masterGain.gain);
  lfo.start();

  // Two carrier oscillators (triangle for richer harmonics than pure sine)
  const osc1 = ctx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.value = 1000;
  osc1.connect(masterGain);
  osc1.start();

  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.value = 1320; // a perfect-fifth interval — sounds like a bell
  osc2.connect(masterGain);
  osc2.start();

  nodes.push(lfo, lfoGain, osc1, osc2, masterGain);

  const burst = () => {
    if (audioCtx === null) return;
    const t = ctx.currentTime;
    // Envelope: ramp up over 30ms, hold ~1.5s, ramp down 50ms.
    // Baseline of 0.07 (tremolo adds ±0.03 around it for ~0.04 to 0.10).
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(0.07, t + 0.03);
    masterGain.gain.setValueAtTime(0.07, t + 1.45);
    masterGain.gain.linearRampToValueAtTime(0, t + 1.5);
  };
  burst();
  cueInterval = setInterval(burst, 4000);
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
