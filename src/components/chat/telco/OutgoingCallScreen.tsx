import { motion } from 'framer-motion';
import { PhoneOff } from 'lucide-react';
import type { CallInfo } from './types';
import { getDisplayName, getAvatar } from '../data/chatTypes';
import { getColorFromPubkey } from '../utils/avatarColors';

interface OutgoingCallScreenProps {
  call: CallInfo;
  onCancel: () => void;
}

export function OutgoingCallScreen({ call, onCancel }: OutgoingCallScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8">
      {/* Animated pulse rings */}
      <div className="relative">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-white/20"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 2 + i * 0.5, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
            style={{ width: 96, height: 96, top: 0, left: 0 }}
          />
        ))}
        <div
          className={`relative w-24 h-24 rounded-full bg-linear-to-br ${getColorFromPubkey(call.peerPubkey).gradient} flex items-center justify-center text-white text-2xl font-semibold`}
        >
          {getAvatar(call.peerPubkey, call.peerNametag)}
        </div>
      </div>

      {/* Call info */}
      <div className="text-center">
        <h2 className="text-xl text-white font-medium">
          {getDisplayName(call.peerPubkey, call.peerNametag)}
        </h2>
        <motion.p
          className="text-white/60 text-sm mt-1"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {call.state === 'requesting-media' ? 'Requesting media access...'
            : call.state === 'gathering-ice' ? 'Preparing connection...'
            : `Calling...`}
        </motion.p>
      </div>

      {/* Cancel button */}
      <motion.button
        onClick={onCancel}
        className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <PhoneOff className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
