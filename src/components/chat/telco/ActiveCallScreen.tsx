import { useEffect, useRef } from 'react';
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

  const isVideo = call.mediaType === 'video';
  const hasRemoteVideo = remoteStream?.getVideoTracks().some(t => t.enabled) ?? false;

  // Bind the remote stream to a dedicated audio element. The element is in
  // the DOM from the moment ActiveCallScreen mounts (right after accept/start),
  // so play() happens within the user-gesture window — critical for mobile
  // browsers that reject autoplay on elements created lazily later.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.srcObject === remoteStream) return;
    audio.srcObject = remoteStream;
    if (remoteStream) {
      audio.play().catch((err) => {
        console.warn('[telco] Remote audio play failed:', err);
      });
    }
  }, [remoteStream]);

  return (
    <div className="relative w-full h-full bg-neutral-900 flex flex-col">
      {/* Hidden audio element — plays remote audio reliably on mobile */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

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
