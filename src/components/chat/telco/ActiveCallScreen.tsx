import { useEffect, useState } from 'react';
import { Maximize, Minimize, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCallStore } from './callStore';
import { useCall } from './useCall';
import { VideoFeed } from './VideoFeed';
import { CallControls } from './CallControls';
import { CallTimer } from './CallTimer';
import { QualityIndicator } from './QualityIndicator';
import { AudioLevelMeter } from './AudioLevelMeter';
import { DeviceSelector } from './DeviceSelector';
import { isFullscreenActive, isSeparateWindowSupported } from './callWindowMode';
import type { CallInfo } from './types';
import { getDisplayName, getAvatar } from '../data/chatTypes';
import { getColorFromPubkey } from '../utils/avatarColors';

interface ActiveCallScreenProps {
  call: CallInfo;
}

export function ActiveCallScreen({ call }: ActiveCallScreenProps) {
  const { hangUp, toggleMuteAudio, toggleMuteVideo, toggleFullscreen, toggleSeparateWindow } = useCall();
  const localStream = useCallStore(s => s.localStream);
  const remoteStream = useCallStore(s => s.remoteStream);
  const audioMuted = useCallStore(s => s.audioMuted);
  const videoMuted = useCallStore(s => s.videoMuted);
  const quality = useCallStore(s => s.connectionQuality);
  const pipWindow = useCallStore(s => s.pipWindow);

  const isVideo = call.mediaType === 'video';
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [fullscreen, setFullscreen] = useState(isFullscreenActive());
  const supportsSeparateWindow = isSeparateWindowSupported();

  useEffect(() => {
    const onChange = () => setFullscreen(isFullscreenActive());
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

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
    <div className="w-full h-full bg-neutral-900 flex flex-col">
      {/* Video region — takes remaining vertical space. All overlays
          (top bar, local-video PiP, bottom call controls) live INSIDE
          this region so they sit on top of the remote feed only. The
          meters + device selectors below are real flex siblings, not
          overlays, so they no longer cover the correspondent's image. */}
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

        {/* Local video PiP (top-right corner of the video region) */}
        {isVideo && localStream && (
          <div className="absolute top-16 right-4 w-32 h-44 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg pointer-events-none">
            <VideoFeed stream={localStream} muted mirror className="w-full h-full" />
          </div>
        )}

        {/* Top bar: timer + window-mode buttons + quality (overlay) */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center gap-2 pointer-events-none">
            {call.connectedAt && <CallTimer connectedAt={call.connectedAt} />}
            {call.state === 'reconnecting' && (
              <span className="text-yellow-400 text-xs animate-pulse">Reconnecting...</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {supportsSeparateWindow && (
              <motion.button
                onClick={() => toggleSeparateWindow()}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  pipWindow ? 'bg-orange-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                whileTap={{ scale: 0.9 }}
                title={pipWindow ? 'Re-attach to page' : 'Open in separate window'}
              >
                <ExternalLink className="w-4 h-4" />
              </motion.button>
            )}
            <motion.button
              onClick={() => toggleFullscreen()}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors"
              whileTap={{ scale: 0.9 }}
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </motion.button>
            <QualityIndicator quality={quality} />
          </div>
        </div>

        {/* Bottom call controls: hangup / mute mic / toggle video (overlay) */}
        <div className="absolute bottom-0 left-0 right-0 pb-6 pt-4 bg-gradient-to-t from-black/60 to-transparent">
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

      {/* Meters + device selectors — flex sibling BELOW the video, not
          an overlay. Sound bars show mic / remote-audio amplitude in
          real time; the dropdown switches mic/speaker/camera mid-call. */}
      <div className="shrink-0 bg-neutral-950/80 border-t border-white/10 px-4 py-3 flex flex-col gap-2 items-center">
        <div className="w-full max-w-sm">
          <AudioLevelMeter />
        </div>
        <div className="w-full max-w-sm">
          <DeviceSelector isVideoCall={isVideo} />
        </div>
      </div>
    </div>
  );
}
