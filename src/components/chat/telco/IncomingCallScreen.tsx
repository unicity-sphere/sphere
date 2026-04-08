import { motion } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import type { CallInfo } from './types';
import { getDisplayName, getAvatar } from '../data/chatTypes';
import { getColorFromPubkey } from '../utils/avatarColors';

interface IncomingCallScreenProps {
  call: CallInfo;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallScreen({ call, onAccept, onDecline }: IncomingCallScreenProps) {
  const isVideo = call.mediaType === 'video';

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8">
      {/* Avatar with subtle pulse */}
      <motion.div
        className={`w-24 h-24 rounded-full bg-linear-to-br ${getColorFromPubkey(call.peerPubkey).gradient} flex items-center justify-center text-white text-2xl font-semibold`}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {getAvatar(call.peerPubkey, call.peerNametag)}
      </motion.div>

      {/* Call info */}
      <div className="text-center">
        <h2 className="text-xl text-white font-medium">
          {getDisplayName(call.peerPubkey, call.peerNametag)}
        </h2>
        <p className="text-white/60 text-sm mt-1">
          Incoming {isVideo ? 'video' : 'voice'} call...
        </p>
      </div>

      {/* Accept / Decline buttons */}
      <div className="flex items-center gap-8">
        <motion.button
          onClick={onDecline}
          className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Decline"
        >
          <PhoneOff className="w-7 h-7" />
        </motion.button>

        <motion.button
          onClick={onAccept}
          className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          title="Accept"
        >
          {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
        </motion.button>
      </div>
    </div>
  );
}
