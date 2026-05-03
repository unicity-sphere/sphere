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
    case 'ringback':
      // North-American style: 440Hz + 480Hz, 2s on / 4s off, repeat.
      // Same pattern for both — caller hears "ringback", callee hears "ring".
      startRingPattern(ctx);
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

function startRingPattern(ctx: AudioContext) {
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
