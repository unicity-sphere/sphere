import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCallStore } from './callStore';
import { useCall } from './useCall';
import { VideoFeed } from './VideoFeed';
import { CallControls } from './CallControls';
import { CallTimer } from './CallTimer';
import { QualityIndicator } from './QualityIndicator';
import type { CallInfo } from './types';
import { getDisplayName, getAvatar } from '../data/chatTypes';
import { getColorFromPubkey } from '../utils/avatarColors';

interface ActiveCallScreenProps {
  call: CallInfo;
}

export function ActiveCallScreen({ call }: ActiveCallScreenProps) {
  const { hangUp, toggleMuteAudio, toggleMuteVideo } = useCall();
  const localStream = useCallStore(s => s.localStream);
  const remoteStream = useCallStore(s => s.remoteStream);
  const audioMuted = useCallStore(s => s.audioMuted);
  const videoMuted = useCallStore(s => s.videoMuted);
  const quality = useCallStore(s => s.connectionQuality);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const isVideo = call.mediaType === 'video';
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  // Reactive remote-video detection.
  useEffect(() => {
    if (!remoteStream) { setHasRemoteVideo(false); return; }
    const update = () => {
      setHasRemoteVideo(remoteStream.getVideoTracks().some(t => t.enabled));
    };
    update();
    remoteStream.addEventListener('addtrack', update);
    remoteStream.addEventListener('removetrack', update);
    return () => {
      remoteStream.removeEventListener('addtrack', update);
      remoteStream.removeEventListener('removetrack', update);
    };
  }, [remoteStream]);

  // Try to start remote audio playback. If blocked, show a "Tap to enable
  // audio" overlay so the user's tap counts as a fresh user gesture and
  // unlocks playback.
  const tryPlayAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = false;
    audio.volume = 1.0;
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        console.log('[telco] Remote audio playing', {
          paused: audio.paused,
          muted: audio.muted,
          volume: audio.volume,
          tracks: remoteStream?.getAudioTracks().length ?? 0,
        });
        setAudioBlocked(false);
      }).catch((err: Error) => {
        console.warn('[telco] Remote audio play failed:', err.name, err.message);
        setAudioBlocked(true);
      });
    }
  }, [remoteStream]);

  // Bind srcObject when remoteStream becomes available. MediaStream is live —
  // late-arriving tracks are picked up automatically without re-binding.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !remoteStream) return;
    audio.srcObject = remoteStream;
    console.log('[telco] Bound remote stream', {
      audioTracks: remoteStream.getAudioTracks().length,
      videoTracks: remoteStream.getVideoTracks().length,
    });
    tryPlayAudio();

    const onTrackChange = () => {
      console.log('[telco] Remote stream track change', {
        audioTracks: remoteStream.getAudioTracks().length,
        videoTracks: remoteStream.getVideoTracks().length,
      });
      tryPlayAudio();
    };
    remoteStream.addEventListener('addtrack', onTrackChange);
    remoteStream.addEventListener('removetrack', onTrackChange);
    return () => {
      remoteStream.removeEventListener('addtrack', onTrackChange);
      remoteStream.removeEventListener('removetrack', onTrackChange);
    };
  }, [remoteStream, tryPlayAudio]);

  // Watchdog: if audio element is paused/muted unexpectedly, show the unlock UI.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !remoteStream) return;
    const interval = setInterval(() => {
      if (audio.paused || audio.muted) {
        if (!audioBlocked) {
          console.warn('[telco] Audio element unexpectedly paused/muted', {
            paused: audio.paused,
            muted: audio.muted,
            currentTime: audio.currentTime,
          });
          setAudioBlocked(true);
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [remoteStream, audioBlocked]);

  return (
    <div className="relative w-full h-full bg-neutral-900 flex flex-col">
      {/* Audio element for remote audio. Do NOT use display:none / className="hidden":
          some Chrome configurations don't route audio output to audio elements with
          display:none. Hide via opacity/size/position instead. */}
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Remote video / avatar */}
      <div className="flex-1 flex items-center justify-center">
        {isVideo && hasRemoteVideo ? (
          <VideoFeed stream={remoteStream} muted className="w-full h-full" />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div
              className={`w-28 h-28 rounded-full bg-linear-to-br ${getColorFromPubkey(call.peerPubkey).gradient} flex items-center justify-center text-white text-3xl font-semibold`}
            >
              {getAvatar(call.peerPubkey, call.peerNametag)}
            </div>
            <p className="text-white/80 text-lg">
              {getDisplayName(call.peerPubkey, call.peerNametag)}
            </p>
          </div>
        )}
      </div>

      {/* Local video PiP (top-right corner) */}
      {isVideo && localStream && (
        <div className="absolute top-16 right-4 w-32 h-44 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
          <VideoFeed stream={localStream} muted mirror className="w-full h-full" />
        </div>
      )}

      {/* Tap-to-enable-audio overlay (autoplay block fallback) */}
      {audioBlocked && (
        <motion.button
          onClick={tryPlayAudio}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-fit flex items-center gap-2 px-5 py-3 rounded-full bg-orange-500 text-white shadow-lg z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Volume2 className="w-5 h-5" />
          <span className="text-sm font-medium">Tap to enable audio</span>
        </motion.button>
      )}

      {/* Top bar: timer + quality */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-2">
          {call.connectedAt && <CallTimer connectedAt={call.connectedAt} />}
          {call.state === 'reconnecting' && (
            <span className="text-yellow-400 text-xs animate-pulse">Reconnecting...</span>
          )}
        </div>
        <QualityIndicator quality={quality} />
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-8 pt-4 bg-gradient-to-t from-black/60 to-transparent">
        <CallControls
          audioMuted={audioMuted}
          videoMuted={videoMuted}
          showVideo={isVideo}
          onToggleAudio={toggleMuteAudio}
          onToggleVideo={toggleMuteVideo}
          onHangUp={hangUp}
        />
      </div>
    </div>
  );
}
