import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallStore } from './callStore';
import { useCall } from './useCall';
import { OutgoingCallScreen } from './OutgoingCallScreen';
import { IncomingCallScreen } from './IncomingCallScreen';
import { ActiveCallScreen } from './ActiveCallScreen';
import { ConnectingScreen } from './ConnectingScreen';
import { CallEndedScreen } from './CallEndedScreen';
import type { CallInfo } from './types';

function getScreenKey(call: CallInfo): string {
  if (call.state === 'ringing') return 'ringing';
  if (call.state === 'connected' || call.state === 'reconnecting') return 'active';
  if (call.state === 'ended' || call.state === 'failed') return 'ended';
  if (call.state === 'connecting') return 'connecting';
  if (call.direction === 'outgoing') return 'outgoing';
  return 'connecting';
}

export function CallOverlay() {
  const call = useCallStore(s => s.currentCall);
  const pipWindow = useCallStore(s => s.pipWindow);
  const { hangUp, acceptCall, declineCall } = useCall();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Track the actual fullscreen state so we can re-render and avoid drift
  // between our intent (windowMode='fullscreen') and the real document state.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const onChange = () => forceTick((n) => n + 1);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const isVisible = call !== null && call.state !== 'idle';

  const content = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={overlayRef}
          key="call-overlay"
          className="fixed inset-0 z-[9999] bg-neutral-900/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {getScreenKey(call) === 'outgoing' && (
              <motion.div key="outgoing" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <OutgoingCallScreen call={call} onCancel={hangUp} />
              </motion.div>
            )}

            {getScreenKey(call) === 'ringing' && (
              <motion.div key="ringing" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <IncomingCallScreen call={call} onAccept={acceptCall} onDecline={declineCall} />
              </motion.div>
            )}

            {getScreenKey(call) === 'connecting' && (
              <motion.div key="connecting" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ConnectingScreen />
              </motion.div>
            )}

            {getScreenKey(call) === 'active' && (
              <motion.div key="active" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ActiveCallScreen call={call} />
              </motion.div>
            )}

            {getScreenKey(call) === 'ended' && (
              <motion.div key="ended" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CallEndedScreen call={call} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // If a Document Picture-in-Picture window is open, render the overlay
  // INTO that window's body instead of our document. The main page shows
  // a small "call in separate window" indicator.
  if (pipWindow && isVisible) {
    return createPortal(content, pipWindow.document.body);
  }

  return createPortal(content, document.body);
}
