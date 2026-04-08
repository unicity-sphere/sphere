import { motion } from 'framer-motion';
import { Mic, MicOff, Camera, CameraOff, PhoneOff } from 'lucide-react';

interface CallControlsProps {
  audioMuted: boolean;
  videoMuted: boolean;
  showVideo: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onHangUp: () => void;
}

export function CallControls({
  audioMuted,
  videoMuted,
  showVideo,
  onToggleAudio,
  onToggleVideo,
  onHangUp,
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {/* Mute microphone */}
      <motion.button
        onClick={onToggleAudio}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          audioMuted
            ? 'bg-white/20 text-red-400'
            : 'bg-white/10 text-white hover:bg-white/20'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={audioMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        {audioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </motion.button>

      {/* Mute camera */}
      {showVideo && (
        <motion.button
          onClick={onToggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            videoMuted
              ? 'bg-white/20 text-red-400'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={videoMuted ? 'Turn on camera' : 'Turn off camera'}
        >
          {videoMuted ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
        </motion.button>
      )}

      {/* Hang up */}
      <motion.button
        onClick={onHangUp}
        className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="End call"
      >
        <PhoneOff className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
