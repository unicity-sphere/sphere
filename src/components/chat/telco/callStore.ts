import { useSyncExternalStore } from 'react';
import type { CallInfo, CallStoreState, ConnectionQuality, PeerCapability } from './types';
import { CAPABILITY_STALE_MS } from './constants';

// ── Initial state ───────────────────────────────────────────────────────────

const initialState: CallStoreState = {
  currentCall: null,
  localStream: null,
  remoteStream: null,
  audioMuted: false,
  videoMuted: false,
  connectionQuality: null,
  peerCapabilities: new Map(),
};

// ── Store internals ─────────────────────────────────────────────────────────

let state: CallStoreState = { ...initialState, peerCapabilities: new Map() };
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CallStoreState {
  return state;
}

// ── Public actions ──────────────────────────────────────────────────────────

export function setCurrentCall(call: CallInfo | null) {
  state = { ...state, currentCall: call };
  emitChange();
}

export function updateCallState(update: Partial<CallInfo>) {
  if (!state.currentCall) return;
  state = { ...state, currentCall: { ...state.currentCall, ...update } };
  emitChange();
}

export function setLocalStream(stream: MediaStream | null) {
  state = { ...state, localStream: stream };
  emitChange();
}

export function setRemoteStream(stream: MediaStream | null) {
  state = { ...state, remoteStream: stream };
  emitChange();
}

export function setAudioMuted(muted: boolean) {
  state = { ...state, audioMuted: muted };
  emitChange();
}

export function setVideoMuted(muted: boolean) {
  state = { ...state, videoMuted: muted };
  emitChange();
}

export function setConnectionQuality(quality: ConnectionQuality | null) {
  state = { ...state, connectionQuality: quality };
  emitChange();
}

export function setPeerCapability(peerPubkey: string, capability: PeerCapability) {
  const caps = new Map(state.peerCapabilities);
  caps.set(peerPubkey, capability);
  state = { ...state, peerCapabilities: caps };
  emitChange();
}

export function getPeerCapability(peerPubkey: string): PeerCapability | undefined {
  const cap = state.peerCapabilities.get(peerPubkey);
  if (!cap) return undefined;
  if (Date.now() - cap.discoveredAt > CAPABILITY_STALE_MS) {
    // Stale — treat as absent. Don't mutate store here (can be called during render).
    // The entry will be overwritten on next capability announcement.
    return undefined;
  }
  return cap;
}

export function resetCallState() {
  // Guard: only reset if the call is actually finished (prevent clobbering a new call)
  const current = state.currentCall;
  if (current && current.state !== 'ended' && current.state !== 'failed' && current.state !== 'idle') {
    return; // A new call is in progress — don't clobber it
  }
  // Stop all tracks on local stream
  state.localStream?.getTracks().forEach(t => t.stop());
  state = {
    ...state,
    currentCall: null,
    localStream: null,
    remoteStream: null,
    audioMuted: false,
    videoMuted: false,
    connectionQuality: null,
  };
  emitChange();
}

// ── React hook ──────────────────────────────────────────────────────────────

export function useCallStore(): CallStoreState;
export function useCallStore<T>(selector: (s: CallStoreState) => T): T;
export function useCallStore<T>(selector?: (s: CallStoreState) => T): T | CallStoreState {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return selector ? selector(snapshot) : snapshot;
}
