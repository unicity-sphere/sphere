import { useEffect, useState } from 'react';
import { useCallStore } from './callStore';
import { useCall } from './useCall';
import { VideoFeed } from './VideoFeed';
import { CallControls } from './CallControls';
import { CallTimer } from './CallTimer';
import { QualityIndicator } from './QualityIndicator';
import { AudioLevelMeter } from './AudioLevelMeter';
import { DeviceSelector } from './DeviceSelector';
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

  return (
    <div className="relative w-full h-full bg-neutral-900 flex flex-col">
      {/* Remote video / avatar. Audio is unlocked synchronously inside
          startCall/acceptCall (within the user-gesture window of the
          Phone/Accept tap), so playback works without further interaction.
          The video is absolute-positioned (inset-0) so it definitively
          fills the parent — combined with object-contain, that letterboxes
          the whole remote frame inside the call window with no cropping. */}
      <div className="flex-1 relative min-h-0">
        {isVideo && hasRemoteVideo ? (
          <VideoFeed
            stream={remoteStream}
            muted
            fit="contain"
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
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

      {/* Real-time audio level meters + device selectors. Levels show
          mic/peer-audio amplitude in real time. Selectors let the user
          switch mic/speaker/camera during the call. */}
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 items-center max-w-sm w-[calc(100%-2rem)] pointer-events-none">
        <AudioLevelMeter />
        <div className="pointer-events-auto w-full">
          <DeviceSelector isVideoCall={isVideo} />
        </div>
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
