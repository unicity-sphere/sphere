import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export function ConnectingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="w-10 h-10 text-white/60" />
      </motion.div>
      <p className="text-white/60 text-sm">Connecting...</p>
    </div>
  );
}
