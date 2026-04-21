import { forwardRef, useRef, useImperativeHandle, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useKeyboardScrollIntoView } from '../../../hooks/useKeyboardScrollIntoView';
import { useSphereContext } from '../../../sdk/hooks/core/useSphere';

interface DMChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isSending?: boolean;
  placeholder?: string;
  disabled?: boolean;
  participantPubkey?: string;
}

const TYPING_THROTTLE_MS = 3000;

export const DMChatInput = forwardRef<HTMLTextAreaElement, DMChatInputProps>(
  function DMChatInput(
    {
      value,
      onChange,
      onSend,
      isSending = false,
      placeholder = 'Type a message...',
      disabled = false,
      participantPubkey,
    },
    ref
  ) {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const lastTypingSentRef = useRef(0);
    const { sphere } = useSphereContext();

    // Expose the internal ref to parent components
    useImperativeHandle(ref, () => internalRef.current!, []);

    // Use Visual Viewport API to scroll input into view when keyboard opens
    useKeyboardScrollIntoView(internalRef);

    const sendComposingIndicator = useCallback(() => {
      if (!sphere || !participantPubkey) return;
      const now = Date.now();
      if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return;
      lastTypingSentRef.current = now;
      sphere.communications.sendComposingIndicator(participantPubkey).catch(() => {});
    }, [sphere, participantPubkey]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        if (e.target.value.trim()) {
          sendComposingIndicator();
        }
      },
      [onChange, sendComposingIndicator]
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (value.trim() && !isSending && !disabled) {
          onSend();
        }
      }
    };

    return (
      // Safe-area padding is intentionally NOT applied here. The outer
      // DashboardLayout wrapper uses `pb-mobile-nav` which already accounts
      // for the fixed bottom nav height + device safe-area, and the nav
      // itself carries its own safe-area padding. Duplicating it here caused
      // extra whitespace below the input on iOS.
      <div className="p-4 border-t border-neutral-100 dark:border-[rgba(255,255,255,0.06)]">
        <div className="flex gap-3">
          <textarea
            ref={internalRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className="flex-1 bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-[rgba(255,255,255,0.3)] outline-none resize-none rounded-xl p-3 min-h-11 max-h-[120px] text-base disabled:opacity-50 focus:ring-1 focus:ring-orange-500/50 dark:focus:ring-[rgba(255,111,0,0.3)] transition-all"
            rows={1}
            enterKeyHint="send"
          />
          <motion.button
            onClick={onSend}
            disabled={!value.trim() || isSending || disabled}
            className="px-5 py-2 rounded-xl bg-linear-to-r from-orange-500 to-orange-600 dark:from-brand-orange dark:to-brand-orange-dark text-white disabled:opacity-50 flex items-center justify-center min-w-[60px]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </div>
    );
  }
);
