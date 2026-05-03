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

      // Audio playback handled by an unmuted <video> element in
      // ActiveCallScreen — that's the most reliable path on Chrome. No
      // detached audio element here.

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
