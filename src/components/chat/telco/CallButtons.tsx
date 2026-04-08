import { motion } from 'framer-motion';
import { Phone, Video } from 'lucide-react';
import type { PeerCapability } from './types';
import { useCallStore } from './callStore';

interface CallButtonsProps {
  peerPubkey: string;
  peerNametag?: string;
  capability: PeerCapability;
  onStartCall: (peerPubkey: string, peerNametag: string | undefined, mediaType: 'audio' | 'video') => void;
}

export function CallButtons({ peerPubkey, peerNametag, capability, onStartCall }: CallButtonsProps) {
  const currentCall = useCallStore(s => s.currentCall);
  const inCall = currentCall !== null && currentCall.state !== 'idle' && currentCall.state !== 'ended' && currentCall.state !== 'failed';

  const buttonClass = `p-1.5 rounded-lg transition-colors ${
    inCall
      ? 'text-neutral-300 dark:text-[rgba(255,255,255,0.15)] cursor-not-allowed'
      : 'text-neutral-400 dark:text-[rgba(255,255,255,0.35)] hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.06)]'
  }`;

  return (
    <div className="flex items-center gap-0.5">
      {capability.audio && (
        <motion.button
          onClick={() => !inCall && onStartCall(peerPubkey, peerNametag, 'audio')}
          className={buttonClass}
          whileHover={inCall ? {} : { scale: 1.05 }}
          whileTap={inCall ? {} : { scale: 0.95 }}
          title={inCall ? 'Already in a call' : 'Voice call'}
          disabled={inCall}
        >
          <Phone className="w-4 h-4" />
        </motion.button>
      )}
      {capability.video && (
        <motion.button
          onClick={() => !inCall && onStartCall(peerPubkey, peerNametag, 'video')}
          className={buttonClass}
          whileHover={inCall ? {} : { scale: 1.05 }}
          whileTap={inCall ? {} : { scale: 0.95 }}
          title={inCall ? 'Already in a call' : 'Video call'}
          disabled={inCall}
        >
          <Video className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}
