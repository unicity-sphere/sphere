import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useSphereContext } from '../../../sdk/hooks/core/useSphere';
import { WebRTCSession } from './webrtc';
import { QualityMonitor } from './qualityMonitor';
import { encodeTelcoMessage, decodeTelcoMessage } from './signaling';
import { playRingtone, stopRingtone } from './ringtone';
import {
  setCurrentCall, updateCallState,
  setLocalStream, setRemoteStream,
  setAudioMuted, setVideoMuted,
  setConnectionQuality, resetCallState,
  setPeerCapability, setAudioLevels,
} from './callStore';
import { CALL_TIMEOUT, RECONNECT_TIMEOUT, CALL_ENDED_DISMISS_DELAY, CALL_FAILED_DISMISS_DELAY } from './constants';
import { CallContext, type CallContextValue } from './CallContext';
import type {
  CallInfo, MediaType,
  TelcoSignalDetail, OfferPayload, AnswerPayload, CapabilityPayload,
} from './types';

// ── Provider ────────────────────────────────────────────────────────────────

function generateCallId(): string {
  // Use crypto.randomUUID for high entropy
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/**
 * Synchronously update both the store and the ref in one call,
 * preventing stale-closure bugs where the ref lags the store by one render.
 */
function syncSetCall(ref: React.MutableRefObject<CallInfo | null>, call: CallInfo | null) {
  ref.current = call;
  setCurrentCall(call);
}

function syncUpdateCall(ref: React.MutableRefObject<CallInfo | null>, update: Partial<CallInfo>) {
  if (!ref.current) return;
  ref.current = { ...ref.current, ...update };
  updateCallState(update);
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { sphere } = useSphereContext();
  const sessionRef = useRef<WebRTCSession | null>(null);
  const monitorRef = useRef<QualityMonitor | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false); // Atomic lock for startCall
  const currentCallRef = useRef<CallInfo | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────

  const sendSignal = useCallback(async (peerPubkey: string, type: string, payload: Record<string, unknown>, callId: string) => {
    if (!sphere) return;
    const msg = encodeTelcoMessage(type as Parameters<typeof encodeTelcoMessage>[0], payload, callId);
    await sphere.communications.sendDM(peerPubkey, msg).catch(() => {});
  }, [sphere]);

  const clearCallTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearCallTimeout();
    stopRingtone();
    monitorRef.current?.stop();
    monitorRef.current = null;
    sessionRef.current?.dispose();
    sessionRef.current = null;
  }, [clearCallTimeout]);

  const endCall = useCallback((reason: string) => {
    const call = currentCallRef.current;
    if (!call || call.state === 'ended' || call.state === 'failed') return;
    cleanup();
    clearDismissTimer();
    syncUpdateCall(currentCallRef, { state: 'ended', endedAt: Date.now(), endReason: reason });
    dismissTimerRef.current = setTimeout(() => {
      resetCallState();
      startingRef.current = false;
    }, CALL_ENDED_DISMISS_DELAY);
  }, [cleanup, clearDismissTimer]);

  const failCall = useCallback((reason: string) => {
    const call = currentCallRef.current;
    if (!call || call.state === 'ended' || call.state === 'failed') return;
    cleanup();
    clearDismissTimer();
    syncUpdateCall(currentCallRef, { state: 'failed', endedAt: Date.now(), endReason: reason });
    dismissTimerRef.current = setTimeout(() => {
      resetCallState();
      startingRef.current = false;
    }, CALL_FAILED_DISMISS_DELAY);
  }, [cleanup, clearDismissTimer]);

  // ── WebRTC connection state handler ─────────────────────────────────

  const setupConnectionHandlers = useCallback((session: WebRTCSession) => {
    session.onAudioLevels = (local: number, remote: number) => {
      setAudioLevels(local, remote);
    };
    session.onConnectionStateChange = (state: RTCPeerConnectionState) => {
      const call = currentCallRef.current;
      if (!call) return;

      switch (state) {
        case 'connected':
          clearCallTimeout();
          monitorRef.current?.stop(); // Stop old monitor if reconnecting
          if (call.state === 'connecting' || call.state === 'reconnecting') {
            syncUpdateCall(currentCallRef, { state: 'connected', connectedAt: call.connectedAt ?? Date.now() });
            const monitor = new QualityMonitor(session.getPeerConnection());
            monitorRef.current = monitor;
            monitor.onQualityUpdate = (q) => setConnectionQuality(q);
            monitor.onTierChange = (tier) => session.applyQualityTier(tier);
            monitor.start();
            // Diagnostic: log audio packet flow every 3s after connect
            const pc = session.getPeerConnection();
            const audioStatsInterval = setInterval(async () => {
              try {
                const stats = await pc.getStats();
                let outPackets = 0, outBytes = 0, inPackets = 0, inBytes = 0;
                let micLevel = 0; // local microphone amplitude
                let speakerLevel = 0; // amplitude of audio we're hearing
                stats.forEach((report) => {
                  if (report.type === 'outbound-rtp' && (report as { kind?: string }).kind === 'audio') {
                    const r = report as { packetsSent?: number; bytesSent?: number };
                    outPackets = r.packetsSent ?? 0;
                    outBytes = r.bytesSent ?? 0;
                  }
                  if (report.type === 'inbound-rtp' && (report as { kind?: string }).kind === 'audio') {
                    const r = report as { packetsReceived?: number; bytesReceived?: number; audioLevel?: number };
                    inPackets = r.packetsReceived ?? 0;
                    inBytes = r.bytesReceived ?? 0;
                    speakerLevel = r.audioLevel ?? 0;
                  }
                  if (report.type === 'media-source' && (report as { kind?: string }).kind === 'audio') {
                    const r = report as { audioLevel?: number };
                    micLevel = r.audioLevel ?? 0;
                  }
                });
                // Inspect remote audio track properties from the peer connection
                let trackInfo = '';
                pc.getReceivers().forEach((receiver) => {
                  if (receiver.track?.kind === 'audio') {
                    trackInfo = `track: enabled=${receiver.track.enabled} muted=${receiver.track.muted} readyState=${receiver.track.readyState}`;
                  }
                });
                console.log(
                  `[telco] audio — sent: ${outPackets}p/${outBytes}b (rtcMicLvl: ${micLevel.toFixed(3)}) — recv: ${inPackets}p/${inBytes}b (rtcInLvl: ${speakerLevel.toFixed(3)}) — ${trackInfo}`
                );
              } catch {
                // ignore
              }
            }, 3000);
            // Store on session for cleanup in dispose()
            (session as unknown as { _audioStatsInterval?: ReturnType<typeof setInterval> })._audioStatsInterval = audioStatsInterval;
          }
          break;

        case 'disconnected':
          clearCallTimeout();
          if (call.state === 'connected') {
            syncUpdateCall(currentCallRef, { state: 'reconnecting' });
            monitorRef.current?.stop();
            timeoutRef.current = setTimeout(async () => {
              const current = currentCallRef.current;
              if (!current || current.state !== 'reconnecting') return;
              try {
                const newSdp = await session.restartIce();
                await sendSignal(current.peerPubkey, 'ice-restart', { sdp: newSdp, mediaType: current.mediaType }, current.callId);
                // Set a timeout for the reconnect to complete
                timeoutRef.current = setTimeout(() => failCall('Reconnection timeout'), RECONNECT_TIMEOUT);
              } catch {
                failCall('ICE restart failed');
              }
            }, 3000);
          }
          break;

        case 'failed':
          clearCallTimeout();
          if (call.state === 'reconnecting') {
            failCall('Connection lost');
          } else {
            syncUpdateCall(currentCallRef, { state: 'reconnecting' });
            timeoutRef.current = setTimeout(() => failCall('Connection failed'), RECONNECT_TIMEOUT);
            session.restartIce().then(async (sdp) => {
              await sendSignal(call.peerPubkey, 'ice-restart', { sdp, mediaType: call.mediaType }, call.callId);
            }).catch(() => failCall('ICE restart failed'));
          }
          break;

        case 'closed':
          if (call.state !== 'ended' && call.state !== 'failed') {
            endCall('Connection closed');
          }
          break;
      }
    };

    session.onTrack = (stream: MediaStream) => {
      setRemoteStream(stream);
    };
  }, [clearCallTimeout, sendSignal, endCall, failCall]);

  // ── Start outgoing call ─────────────────────────────────────────────

  const startCall = useCallback((peerPubkey: string, peerNametag: string | undefined, mediaType: MediaType) => {
    // Atomic lock + state guard
    if (startingRef.current) return;
    const existing = currentCallRef.current;
    if (existing && existing.state !== 'ended' && existing.state !== 'failed') return;
    startingRef.current = true;
    clearDismissTimer(); // Cancel any pending reset from previous call

    const callId = generateCallId();
    const call: CallInfo = {
      callId,
      peerPubkey,
      peerNametag,
      direction: 'outgoing',
      mediaType,
      state: 'requesting-media',
      startedAt: Date.now(),
    };
    syncSetCall(currentCallRef, call);

    (async () => {
      try {
        const session = new WebRTCSession();
        sessionRef.current = session;
        setupConnectionHandlers(session);

        const stream = await session.requestMedia(mediaType);
        setLocalStream(stream);

        syncUpdateCall(currentCallRef, { state: 'gathering-ice' });
        const sdp = await session.createOffer();

        syncUpdateCall(currentCallRef, { state: 'calling' });
        await sendSignal(peerPubkey, 'offer', { sdp, mediaType } satisfies OfferPayload, callId);

        timeoutRef.current = setTimeout(() => {
          sendSignal(peerPubkey, 'timeout', {}, callId);
          endCall('No answer');
        }, CALL_TIMEOUT);

      } catch (err) {
        failCall(err instanceof Error ? err.message : 'Failed to start call');
      }
    })();
  }, [setupConnectionHandlers, sendSignal, endCall, failCall, clearDismissTimer]);

  // ── Accept incoming call ────────────────────────────────────────────

  const acceptCall = useCallback(() => {
    const call = currentCallRef.current;
    if (!call || call.state !== 'ringing' || !call.remoteSdp) return;
    stopRingtone();
    clearCallTimeout(); // Cancel ringing timeout
    clearDismissTimer(); // Cancel any pending reset from previous call

    const remoteSdp = call.remoteSdp;
    syncUpdateCall(currentCallRef, { state: 'requesting-media', remoteSdp: undefined });

    (async () => {
      try {
        const session = new WebRTCSession();
        sessionRef.current = session;
        setupConnectionHandlers(session);

        const stream = await session.requestMedia(call.mediaType);
        setLocalStream(stream);

        syncUpdateCall(currentCallRef, { state: 'connecting' });

        const answerSdp = await session.createAnswer(remoteSdp);
        await sendSignal(call.peerPubkey, 'answer', { sdp: answerSdp } satisfies AnswerPayload, call.callId);

        timeoutRef.current = setTimeout(() => failCall('Connection timeout'), RECONNECT_TIMEOUT);

      } catch (err) {
        failCall(err instanceof Error ? err.message : 'Failed to accept call');
      }
    })();
  }, [setupConnectionHandlers, sendSignal, failCall, clearCallTimeout, clearDismissTimer]);

  // ── Decline incoming call ───────────────────────────────────────────

  const declineCall = useCallback(() => {
    const call = currentCallRef.current;
    if (!call || call.state !== 'ringing') return;
    stopRingtone();
    sendSignal(call.peerPubkey, 'decline', {}, call.callId);
    endCall('Declined');
  }, [sendSignal, endCall]);

  // ── Hang up ─────────────────────────────────────────────────────────

  const hangUp = useCallback(() => {
    const call = currentCallRef.current;
    if (!call) return;
    sendSignal(call.peerPubkey, 'hangup', { reason: 'user' }, call.callId);
    endCall('You ended the call');
  }, [sendSignal, endCall]);

  // ── Mute toggles ───────────────────────────────────────────────────

  const toggleMuteAudio = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    setAudioMuted(session.toggleMuteAudio());
  }, []);

  const toggleMuteVideo = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    setVideoMuted(session.toggleMuteVideo());
  }, []);

  const retryRemoteAudioPlay = useCallback(() => {
    sessionRef.current?.retryRemoteAudioPlay();
  }, []);

  const playTestTone = useCallback(() => {
    sessionRef.current?.playTestTone();
  }, []);

  const switchAudioInput = useCallback(async (deviceId: string) => {
    await sessionRef.current?.switchAudioInput(deviceId);
  }, []);

  const switchVideoInput = useCallback(async (deviceId: string) => {
    await sessionRef.current?.switchVideoInput(deviceId);
  }, []);

  const switchAudioOutput = useCallback(async (deviceId: string) => {
    await sessionRef.current?.switchAudioOutput(deviceId);
  }, []);

  // ── Incoming signaling handler ──────────────────────────────────────

  useEffect(() => {
    const handler = (e: Event) => {
      const { peerPubkey, content, isFromMe } = (e as CustomEvent<TelcoSignalDetail>).detail;
      if (isFromMe) return;

      const signal = decodeTelcoMessage(content);
      if (!signal) return;

      // Reject stale signals (older than call timeout)
      if (signal.ts && Date.now() - signal.ts > CALL_TIMEOUT * 2) return;

      const call = currentCallRef.current;

      switch (signal.type) {
        case 'capability': {
          const payload = signal.payload as unknown as CapabilityPayload;
          setPeerCapability(peerPubkey, {
            audio: payload.audio ?? false,
            video: payload.video ?? false,
            version: payload.version ?? 1,
            discoveredAt: Date.now(),
          });
          break;
        }

        case 'offer': {
          if (call && call.state !== 'ended' && call.state !== 'failed') {
            // Glare: we're in an outgoing call to the same peer
            if (call.direction === 'outgoing' && call.peerPubkey === peerPubkey) {
              const myPubkey = sphere?.identity?.chainPubkey ?? '';
              if (!myPubkey || myPubkey > peerPubkey) {
                // They win (lower pubkey or we have no identity) — tear down ours and accept theirs
                // Null the ref BEFORE cleanup to prevent pc.close() from firing endCall via 'closed' event
                currentCallRef.current = null;
                cleanup();
                // Fall through to accept the incoming offer below
              } else {
                // We win — ignore their offer
                return;
              }
            } else {
              // Different peer or not outgoing — we're busy
              sendSignal(peerPubkey, 'busy', {}, signal.callId);
              return;
            }
          }

          // Validate mediaType
          const rawMediaType = (signal.payload as unknown as OfferPayload).mediaType;
          const mediaType: MediaType = (rawMediaType === 'audio' || rawMediaType === 'video') ? rawMediaType : 'audio';

          const payload = signal.payload as unknown as OfferPayload;
          clearDismissTimer(); // Cancel any pending reset
          const newCall: CallInfo = {
            callId: signal.callId,
            peerPubkey,
            direction: 'incoming',
            mediaType,
            state: 'ringing',
            startedAt: Date.now(),
            remoteSdp: payload.sdp,
          };
          syncSetCall(currentCallRef, newCall);
          startingRef.current = true;
          playRingtone();

          timeoutRef.current = setTimeout(() => {
            stopRingtone();
            sendSignal(peerPubkey, 'timeout', {}, signal.callId);
            endCall('Missed call');
          }, CALL_TIMEOUT);
          break;
        }

        case 'answer': {
          if (!call || call.callId !== signal.callId || call.state !== 'calling') return;
          clearCallTimeout();
          syncUpdateCall(currentCallRef, { state: 'connecting' });

          const payload = signal.payload as unknown as AnswerPayload;
          const session = sessionRef.current;
          if (session) {
            session.setRemoteAnswer(payload.sdp).catch(() => failCall('Failed to set remote answer'));
            timeoutRef.current = setTimeout(() => failCall('Connection timeout'), RECONNECT_TIMEOUT);
          }
          break;
        }

        case 'decline': {
          if (!call || call.callId !== signal.callId) return;
          endCall('Call declined');
          break;
        }

        case 'hangup': {
          if (!call || call.callId !== signal.callId) return;
          endCall('Call ended');
          break;
        }

        case 'busy': {
          if (!call || call.callId !== signal.callId) return;
          endCall('Busy');
          break;
        }

        case 'timeout': {
          if (!call || call.callId !== signal.callId) return;
          stopRingtone();
          endCall('Missed call');
          break;
        }

        case 'ice-restart': {
          if (!call || call.callId !== signal.callId) return;
          // Only accept ICE restart when connected or reconnecting
          if (call.state !== 'connected' && call.state !== 'reconnecting') return;
          const session = sessionRef.current;
          if (!session) return;
          const payload = signal.payload as unknown as OfferPayload;
          session.createAnswer(payload.sdp).then(async (answerSdp) => {
            await sendSignal(peerPubkey, 'answer', { sdp: answerSdp }, signal.callId);
          }).catch(() => failCall('ICE restart answer failed'));
          break;
        }
      }
    };

    window.addEventListener('dm-telco-signal', handler);
    return () => window.removeEventListener('dm-telco-signal', handler);
  }, [sphere, sendSignal, cleanup, clearCallTimeout, clearDismissTimer, endCall, failCall, setupConnectionHandlers]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
      clearDismissTimer();
      // Force reset without guard
      setCurrentCall(null);
    };
  }, [cleanup, clearDismissTimer]);

  const value: CallContextValue = {
    startCall,
    acceptCall,
    declineCall,
    hangUp,
    toggleMuteAudio,
    toggleMuteVideo,
    retryRemoteAudioPlay,
    playTestTone,
    switchAudioInput,
    switchVideoInput,
    switchAudioOutput,
  };

  return <CallContext value={value}>{children}</CallContext>;
}
