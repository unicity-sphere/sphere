import { ICE_SERVERS, ICE_GATHER_TIMEOUT, QUALITY_TIERS } from './constants';
import type { MediaType, QualityTier } from './types';

export type ConnectionStateHandler = (state: RTCPeerConnectionState) => void;
export type TrackHandler = (stream: MediaStream) => void;

/**
 * Manages a single WebRTC peer connection for a 1:1 audio/video call.
 */
export class WebRTCSession {
  private pc: RTCPeerConnection;
  private _localStream: MediaStream | null = null;
  private _remoteStream: MediaStream | null = null;
  private _remoteAudioEl: HTMLAudioElement | null = null;
  // Web Audio pipeline — used as a parallel reliable path. AudioContext
  // bypasses <audio> element autoplay quirks. Once running, audio plays
  // for as long as the source node is connected to destination.
  private _audioCtx: AudioContext | null = null;
  private _audioSourceNode: MediaStreamAudioSourceNode | null = null;
  private _audioGainNode: GainNode | null = null;
  // Real-time audio level meters via AnalyserNode (RMS measurement)
  private _localAnalyser: AnalyserNode | null = null;
  private _remoteAnalyser: AnalyserNode | null = null;
  private _localAnalyserSource: MediaStreamAudioSourceNode | null = null;
  private _levelRafId: number | null = null;
  // Callback set by CallProvider to push levels into the store
  onAudioLevels: (local: number, remote: number) => void = () => {};
  private disposed = false;
  private mediaRequested = false;
  private gatherTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastReportedState: string = '';
  private connectionStateSupported = false;

  onConnectionStateChange: ConnectionStateHandler = () => {};
  onTrack: TrackHandler = () => {};

  constructor() {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Deduplicated state change handler — prevents double callbacks in browsers
    // that fire both onconnectionstatechange and oniceconnectionstatechange
    const reportState = (state: RTCPeerConnectionState) => {
      if (this.disposed || state === this.lastReportedState) return;
      this.lastReportedState = state;
      this.onConnectionStateChange(state);
    };

    this.pc.onconnectionstatechange = () => {
      this.connectionStateSupported = true;
      reportState(this.pc.connectionState);
    };

    // Fallback for browsers that don't fire onconnectionstatechange (Safari <15.4)
    this.pc.oniceconnectionstatechange = () => {
      if (this.connectionStateSupported) return; // Primary handler is working, skip fallback
      const iceState = this.pc.iceConnectionState;
      if (iceState === 'failed') reportState('failed');
      else if (iceState === 'disconnected') reportState('disconnected');
      else if (iceState === 'closed') reportState('closed');
      else if (iceState === 'connected' || iceState === 'completed') reportState('connected');
    };

    this.pc.ontrack = (event) => {
      if (this.disposed) return;

      // Audio playback: dual approach for maximum reliability.
      //
      // 1) Detached <audio> element (existing) — plays via the standard
      //    media element pipeline. Reliable when the page has high media
      //    engagement and AudioContext is unlocked.
      //
      // 2) Web Audio routing — connect the MediaStreamTrack to an
      //    AudioContext's destination. Bypasses the <audio> element's
      //    autoplay quirks entirely. Requires AudioContext.resume() with
      //    a user gesture, which is triggered by retryRemoteAudioPlay().
      //
      // Both paths are wired up; the unmute flow ensures at least one
      // produces audible output.
      if (event.track.kind === 'audio') {
        // Path 1: <audio> element
        if (!this._remoteAudioEl) {
          const audio = document.createElement('audio');
          audio.autoplay = true;
          audio.setAttribute('playsinline', '');
          audio.style.position = 'absolute';
          audio.style.width = '1px';
          audio.style.height = '1px';
          audio.style.opacity = '0';
          audio.style.pointerEvents = 'none';
          // Mute the <audio> element to avoid double playback when Web
          // Audio path produces sound. We unmute it via retryRemoteAudioPlay
          // if Web Audio fails (e.g., older browsers).
          audio.muted = true;
          document.body.appendChild(audio);
          this._remoteAudioEl = audio;
        }
        const audioOnlyStream = new MediaStream([event.track]);
        this._remoteAudioEl.srcObject = audioOnlyStream;
        this._remoteAudioEl.play().catch(() => {
          // Silent — we're relying on Web Audio path
        });

        // Path 2: Web Audio
        this.setupWebAudioRoute(audioOnlyStream);
      }

      // Notify onTrack so React UI can render video, etc.
      const [stream] = event.streams;
      if (stream) {
        this._remoteStream = stream;
        this.onTrack(stream);
      }
    };
  }

  get localStream(): MediaStream | null { return this._localStream; }
  get remoteStream(): MediaStream | null { return this._remoteStream; }
  get connectionState(): RTCPeerConnectionState { return this.pc.connectionState; }

  /**
   * Request local media. Can only be called once per session.
   */
  async requestMedia(mediaType: MediaType): Promise<MediaStream> {
    if (this.mediaRequested) throw new Error('requestMedia already called');
    this.mediaRequested = true;

    const constraints: MediaStreamConstraints = {
      audio: true,
      video: mediaType === 'video'
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
        : false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this._localStream = stream;

    for (const track of stream.getTracks()) {
      this.pc.addTrack(track, stream);
    }

    // Set up the local mic analyser for real-time level metering
    this.setupLocalAnalyser(stream);

    return stream;
  }

  async createOffer(): Promise<string> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.gatherIceCandidates();
    if (this.disposed) throw new Error('Session disposed during ICE gathering');
    const desc = this.pc.localDescription;
    if (!desc) throw new Error('No local description after ICE gathering');
    return desc.sdp;
  }

  async createAnswer(remoteSdp: string): Promise<string> {
    await this.pc.setRemoteDescription({ type: 'offer', sdp: remoteSdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.gatherIceCandidates();
    if (this.disposed) throw new Error('Session disposed during ICE gathering');
    const desc = this.pc.localDescription;
    if (!desc) throw new Error('No local description after ICE gathering');
    return desc.sdp;
  }

  async setRemoteAnswer(sdp: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: 'answer', sdp });
  }

  async restartIce(): Promise<string> {
    const offer = await this.pc.createOffer({ iceRestart: true });
    await this.pc.setLocalDescription(offer);
    await this.gatherIceCandidates();
    if (this.disposed) throw new Error('Session disposed during ICE gathering');
    const desc = this.pc.localDescription;
    if (!desc) throw new Error('No local description after ICE gathering');
    return desc.sdp;
  }

  toggleMuteAudio(): boolean {
    const audioTrack = this._localStream?.getAudioTracks()[0];
    if (!audioTrack) return false;
    audioTrack.enabled = !audioTrack.enabled;
    return !audioTrack.enabled;
  }

  toggleMuteVideo(): boolean {
    const videoTrack = this._localStream?.getVideoTracks()[0];
    if (!videoTrack) return false;
    videoTrack.enabled = !videoTrack.enabled;
    return !videoTrack.enabled;
  }

  async applyQualityTier(tier: QualityTier): Promise<void> {
    const config = QUALITY_TIERS[tier];
    const videoSender = this.pc.getSenders().find(s => s.track?.kind === 'video');
    if (!videoSender) return;

    if (!config.video) {
      if (videoSender.track) videoSender.track.enabled = false;
      return;
    }

    if (videoSender.track) videoSender.track.enabled = true;

    const params = videoSender.getParameters();
    // Only modify if the browser provided encodings — never fabricate them
    if (!params.encodings || params.encodings.length === 0) return;

    params.encodings[0].maxBitrate = config.video.maxBitrate;
    params.encodings[0].maxFramerate = config.video.frameRate;
    params.encodings[0].scaleResolutionDownBy = Math.max(1.0, 720 / config.video.height);

    await videoSender.setParameters(params);
  }

  getPeerConnection(): RTCPeerConnection {
    return this.pc;
  }

  /**
   * Play a 440Hz test tone through the Web Audio destination. Used to
   * verify whether the audio output device is functional independently of
   * WebRTC. If the user hears this tone, audio output works and the issue
   * is with the WebRTC stream itself. If they don't, the problem is system-
   * level (output device, OS volume, headphones, etc).
   */
  playTestTone(): void {
    try {
      if (!this._audioCtx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this._audioCtx = new Ctor();
      }
      const ctx = this._audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440;
      osc.type = 'sine';
      gain.gain.value = 0.2;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      }, 500);
      console.log('[telco] Test tone playing 440Hz for 500ms', { ctxState: ctx.state });
    } catch (err) {
      console.warn('[telco] Test tone failed:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Setup the Web Audio routing path. Connects the audio MediaStream to
   * an AudioContext destination. The context starts SUSPENDED — call
   * retryRemoteAudioPlay() with a user gesture to resume it.
   */
  private setupWebAudioRoute(audioStream: MediaStream): void {
    try {
      if (!this._audioCtx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this._audioCtx = new Ctor();
        this._audioGainNode = this._audioCtx.createGain();
        this._audioGainNode.gain.value = 1.0;
        this._audioGainNode.connect(this._audioCtx.destination);
      }
      // Recreate source node when track changes (stream is single-track audio)
      if (this._audioSourceNode) {
        try { this._audioSourceNode.disconnect(); } catch { /* noop */ }
        this._audioSourceNode = null;
      }
      this._audioSourceNode = this._audioCtx.createMediaStreamSource(audioStream);
      if (this._audioGainNode) this._audioSourceNode.connect(this._audioGainNode);

      // Set up remote analyser branched off the same source for level metering
      if (this._remoteAnalyser) {
        try { this._remoteAnalyser.disconnect(); } catch { /* noop */ }
      }
      this._remoteAnalyser = this._audioCtx.createAnalyser();
      this._remoteAnalyser.fftSize = 512;
      this._remoteAnalyser.smoothingTimeConstant = 0.5;
      this._audioSourceNode.connect(this._remoteAnalyser);

      // Start the level loop if not already running
      this.startLevelLoop();

      console.log('[telco] Web Audio route set up', {
        contextState: this._audioCtx.state,
        sampleRate: this._audioCtx.sampleRate,
      });
    } catch (err) {
      console.warn('[telco] Web Audio setup failed:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Set up an AnalyserNode on the local microphone stream for real-time
   * level metering. Independent of the Web Audio playback route.
   */
  private setupLocalAnalyser(localStream: MediaStream): void {
    try {
      if (!this._audioCtx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this._audioCtx = new Ctor();
      }
      // Disconnect previous analyser if any
      if (this._localAnalyserSource) {
        try { this._localAnalyserSource.disconnect(); } catch { /* noop */ }
        this._localAnalyserSource = null;
      }
      if (this._localAnalyser) {
        try { this._localAnalyser.disconnect(); } catch { /* noop */ }
        this._localAnalyser = null;
      }

      const audioOnly = new MediaStream(localStream.getAudioTracks());
      if (audioOnly.getAudioTracks().length === 0) return;

      this._localAnalyserSource = this._audioCtx.createMediaStreamSource(audioOnly);
      this._localAnalyser = this._audioCtx.createAnalyser();
      this._localAnalyser.fftSize = 512;
      this._localAnalyser.smoothingTimeConstant = 0.5;
      this._localAnalyserSource.connect(this._localAnalyser);
      // NOTE: we deliberately do NOT connect to destination — that would echo
      // the local mic to the speakers. AnalyserNodes don't need destination
      // connection to function.

      this.startLevelLoop();
    } catch (err) {
      console.warn('[telco] Local analyser setup failed:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * RMS-amplitude loop. Reads time-domain data from analysers ~30Hz and
   * pushes normalized levels (0-1) to the consumer via onAudioLevels.
   */
  private startLevelLoop(): void {
    if (this._levelRafId !== null) return; // already running

    const localBuf = new Float32Array(256);
    const remoteBuf = new Float32Array(256);

    const tick = () => {
      if (this.disposed) return;
      let local = 0;
      let remote = 0;

      if (this._localAnalyser) {
        this._localAnalyser.getFloatTimeDomainData(localBuf);
        let sum = 0;
        for (let i = 0; i < localBuf.length; i++) sum += localBuf[i] * localBuf[i];
        local = Math.sqrt(sum / localBuf.length);
      }

      if (this._remoteAnalyser) {
        this._remoteAnalyser.getFloatTimeDomainData(remoteBuf);
        let sum = 0;
        for (let i = 0; i < remoteBuf.length; i++) sum += remoteBuf[i] * remoteBuf[i];
        remote = Math.sqrt(sum / remoteBuf.length);
      }

      // Apply a gentle perceptual scale (sqrt) so the meter is more readable
      // for typical voice levels which are usually 0.01-0.1 RMS.
      this.onAudioLevels(Math.min(1, Math.sqrt(local) * 2.5), Math.min(1, Math.sqrt(remote) * 2.5));

      this._levelRafId = requestAnimationFrame(tick);
    };

    this._levelRafId = requestAnimationFrame(tick);
  }

  /**
   * Force-play the audio. Resumes the AudioContext (if suspended) and
   * retries the <audio> element. Call within a fresh user gesture to
   * unlock autoplay when the browser silently blocked it.
   */
  retryRemoteAudioPlay(): Promise<void> {
    const tasks: Promise<void>[] = [];

    // Resume Web Audio context — this is the reliable path
    if (this._audioCtx && this._audioCtx.state === 'suspended') {
      tasks.push(
        this._audioCtx.resume().then(() => {
          console.log('[telco] AudioContext resumed', {
            state: this._audioCtx?.state,
          });
        }).catch((err: Error) => {
          console.warn('[telco] AudioContext resume failed:', err.name, err.message);
        })
      );
    }

    // Also retry the <audio> element as a fallback (and unmute it)
    const a = this._remoteAudioEl;
    if (a) {
      a.muted = false;
      a.volume = 1.0;
      tasks.push(
        a.play().then(() => {
          console.log('[telco] Remote audio play retry succeeded', {
            paused: a.paused, muted: a.muted, volume: a.volume,
            ctxState: this._audioCtx?.state,
          });
        }).catch((err: Error) => {
          console.warn('[telco] Remote audio play retry failed:', err.name, err.message);
        })
      );
    }

    return Promise.all(tasks).then(() => undefined);
  }

  dispose(): void {
    if (this.disposed) return; // Guard against double dispose
    this.disposed = true;

    // Cancel any pending ICE gather timeout
    if (this.gatherTimeoutId !== null) {
      clearTimeout(this.gatherTimeoutId);
      this.gatherTimeoutId = null;
    }

    // Cancel any audio-stats poll attached by CallProvider
    const audioStatsInterval = (this as unknown as { _audioStatsInterval?: ReturnType<typeof setInterval> })._audioStatsInterval;
    if (audioStatsInterval) {
      clearInterval(audioStatsInterval);
      (this as unknown as { _audioStatsInterval?: ReturnType<typeof setInterval> })._audioStatsInterval = undefined;
    }

    this._localStream?.getTracks().forEach(t => t.stop());
    this._localStream = null;
    this._remoteStream = null;

    if (this._remoteAudioEl) {
      this._remoteAudioEl.pause();
      this._remoteAudioEl.srcObject = null;
      this._remoteAudioEl.remove();
      this._remoteAudioEl = null;
    }

    // Tear down Web Audio pipeline
    if (this._levelRafId !== null) {
      cancelAnimationFrame(this._levelRafId);
      this._levelRafId = null;
    }
    if (this._localAnalyser) {
      try { this._localAnalyser.disconnect(); } catch { /* noop */ }
      this._localAnalyser = null;
    }
    if (this._localAnalyserSource) {
      try { this._localAnalyserSource.disconnect(); } catch { /* noop */ }
      this._localAnalyserSource = null;
    }
    if (this._remoteAnalyser) {
      try { this._remoteAnalyser.disconnect(); } catch { /* noop */ }
      this._remoteAnalyser = null;
    }
    if (this._audioSourceNode) {
      try { this._audioSourceNode.disconnect(); } catch { /* noop */ }
      this._audioSourceNode = null;
    }
    if (this._audioGainNode) {
      try { this._audioGainNode.disconnect(); } catch { /* noop */ }
      this._audioGainNode = null;
    }
    if (this._audioCtx) {
      this._audioCtx.close().catch(() => { /* noop */ });
      this._audioCtx = null;
    }

    this.pc.onconnectionstatechange = null;
    this.pc.oniceconnectionstatechange = null;
    this.pc.ontrack = null;
    this.pc.onicecandidate = null;
    this.pc.close();
  }

  private gatherIceCandidates(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.pc.iceGatheringState === 'complete' || this.disposed) {
        resolve();
        return;
      }

      this.gatherTimeoutId = setTimeout(() => {
        this.gatherTimeoutId = null;
        this.pc.onicecandidate = null;
        resolve();
      }, ICE_GATHER_TIMEOUT);

      this.pc.onicecandidate = (event) => {
        if (event.candidate === null) {
          if (this.gatherTimeoutId !== null) {
            clearTimeout(this.gatherTimeoutId);
            this.gatherTimeoutId = null;
          }
          this.pc.onicecandidate = null;
          resolve();
        }
      };
    });
  }
}
