import { motion } from 'framer-motion';
import { PhoneOff } from 'lucide-react';
import type { CallInfo } from './types';

interface CallEndedScreenProps {
  call: CallInfo;
}

export function CallEndedScreen({ call }: CallEndedScreenProps) {
  const duration = call.connectedAt && call.endedAt
    ? Math.floor((call.endedAt - call.connectedAt) / 1000)
    : 0;

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const durationText = duration > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : '';

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full gap-4"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 2, duration: 1 }}
    >
      <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center">
        <PhoneOff className="w-7 h-7 text-white/40" />
      </div>
      <div className="text-center">
        <p className="text-white/60 text-sm">
          {call.state === 'failed' ? 'Call failed' : 'Call ended'}
        </p>
        {call.endReason && (
          <p className="text-white/40 text-xs mt-1">{call.endReason}</p>
        )}
        {durationText && (
          <p className="text-white/40 text-xs mt-1">{durationText}</p>
        )}
      </div>
    </motion.div>
  );
}
