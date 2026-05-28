import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Modal max-width: sm (384px), md (448px), lg (512px) */
  size?: ModalSize;
  /** Additional className for the modal container */
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
};

export function BaseModal({
  isOpen,
  onClose,
  children,
  size = 'md',
  className = '',
}: BaseModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/60 dark:bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container — full-screen on mobile, centered dialog on desktop */}
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-6 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full h-full sm:h-auto ${sizeClasses[size]} sm:max-h-150 bg-white dark:bg-modal-bg/90 border-t sm:border border-neutral-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl dark:shadow-[0_0_60px_rgba(0,0,0,0.5)] pointer-events-auto flex flex-col overflow-hidden ${className}`}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
