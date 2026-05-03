import { useEffect, useState } from 'react';
import { useCallStore } from './callStore';
import { useCall } from './useCall';
import { VideoFeed } from './VideoFeed';
import { CallControls } from './CallControls';
import { CallTimer } from './CallTimer';
import { QualityIndicator } from './QualityIndicator';
import { AudioLevelMeter } from './AudioLevelMeter';
import type { CallInfo } from './types';
import { getDisplayName, getAvatar } from '../data/chatTypes';
import { getColorFromPubkey } from '../utils/avatarColors';

interface ActiveCallScreenProps {
  call: CallInfo;
}

export function ActiveCallScreen({ call }: ActiveCallScreenProps) {
  const { hangUp, toggleMuteAudio, toggleMuteVideo, retryRemoteAudioPlay, playTestTone } = useCall();
  const localStream = useCallStore(s => s.localStream);
  const remoteStream = useCallStore(s => s.remoteStream);
  const audioMuted = useCallStore(s => s.audioMuted);
  const videoMuted = useCallStore(s => s.videoMuted);
  const quality = useCallStore(s => s.connectionQuality);

  const isVideo = call.mediaType === 'video';
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

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

  // Whenever ANY click/touch happens on the call screen, retry audio play().
  // Browsers can silently block autoplay — a fresh user gesture unlocks it.
  // We do this on every interaction (cheap to call when already playing) until
  // the user explicitly dismisses the unlock prompt by interacting once.
  const handleAnyInteraction = () => {
    retryRemoteAudioPlay();
    setAudioUnlocked(true);
  };

  return (
    <div
      className="relative w-full h-full bg-neutral-900 flex flex-col"
      onClickCapture={handleAnyInteraction}
      onTouchStartCapture={handleAnyInteraction}
    >
      {/* Remote video / avatar (audio plays via detached element from webrtc.ts) */}
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
        <div className="absolute top-16 right-4 w-32 h-44 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg pointer-events-none">
          <VideoFeed stream={localStream} muted mirror className="w-full h-full" />
        </div>
      )}

      {/* Audio-unlock prompt + test tone button */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
        {!audioUnlocked && (
          <div className="px-4 py-2 rounded-full bg-orange-500 text-white text-sm font-medium shadow-lg pointer-events-none">
            Tap anywhere to enable audio
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); playTestTone(); }}
          className="px-3 py-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium shadow"
        >
          🔊 Test 440Hz tone
        </button>
      </div>

      {/* Real-time audio level meters — diagnostic. Shows local mic input
          amplitude and incoming remote audio amplitude. Lets the user see
          immediately if their mic is silent or peer's audio isn't arriving. */}
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <AudioLevelMeter />
      </div>

      {/* Top bar: timer + quality */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="flex items-center gap-2">
          {call.connectedAt && <CallTimer connectedAt={call.connectedAt} />}
          {call.state === 'reconnecting' && (
            <span className="text-yellow-400 text-xs animate-pulse">Reconnecting...</span>
          )}
        </div>
        <QualityIndicator quality={quality} />
      </div>

      {/* Bottom controls — pointer-events allowed */}
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
