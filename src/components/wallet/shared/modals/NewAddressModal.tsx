/**
 * NewAddressModal — the single Unicity ID prompt shown after deriving a new
 * address (#413). Shared by AddressSelector ("New") and AddressManagerModal
 * ("Derive New Address").
 *
 * Rendered through a portal: both hosts sit inside transformed/stacked
 * containers where a plain `fixed` overlay would clip or mis-position.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { isValidNametag } from '@unicitylabs/sphere-sdk';
import { truncateId } from '../../../../utils/identifiers';
import {
  useNewAddressFlow,
  canonicalNametag,
  NAMETAG_FORMAT_HINT,
  type NametagAvailability,
} from '../hooks/useNewAddressFlow';

interface NewAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewAddressModal({ isOpen, onClose }: NewAddressModalProps) {
  const { state, start, register, skip, checkAvailability, clearRegisterError, reset } =
    useNewAddressFlow();
  const [input, setInput] = useState('');
  const [availability, setAvailability] = useState<NametagAvailability>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);

  // The canonical (SDK-registered) form: lowercased, @-stripped, phone → E.164.
  const cleanTag = canonicalNametag(input);
  const isValid = isValidNametag(cleanTag);

  // Derive on open; full reset on close.
  useEffect(() => {
    if (isOpen && !startedRef.current) {
      startedRef.current = true;
      start();
    }
    if (!isOpen) {
      startedRef.current = false;
      setInput('');
      setAvailability('idle');
      reset();
    }
  }, [isOpen, start, reset]);

  // Focus the input when the prompt appears.
  useEffect(() => {
    if (state.step === 'nametag_input') {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [state.step]);

  // Debounced availability check — only for IDs the SDK would actually accept,
  // so a green check can never precede a VALIDATION_ERROR.
  useEffect(() => {
    if (state.step !== 'nametag_input') return;
    if (!cleanTag || !isValidNametag(cleanTag)) {
      setAvailability('idle');
      return;
    }
    setAvailability('checking');
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkAvailability(cleanTag);
      if (!cancelled) setAvailability(result);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cleanTag, state.step, checkAvailability]);

  // Auto-close on completion; skipped closes instantly, success flashes briefly.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (state.step !== 'complete') return;
    if (state.outcome === 'skipped') {
      onCloseRef.current();
      return;
    }
    const timer = setTimeout(() => onCloseRef.current(), 1400);
    return () => clearTimeout(timer);
  }, [state.step, state.outcome]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    // Permissive typing charset (+ and . are for phone numbers); the SDK
    // format gate below decides whether Register is enabled.
    if (/^[a-z0-9_\-+.]*$/.test(value)) {
      setInput(value);
      clearRegisterError();
    }
  };

  const canRegister =
    state.step === 'nametag_input' &&
    isValid &&
    availability !== 'taken' &&
    availability !== 'checking';

  const handleRegister = useCallback(() => {
    if (!canRegister) return;
    register(input);
  }, [canRegister, register, input]);

  const handleSkip = useCallback(() => {
    skip();
  }, [skip]);

  // Closing is a "skip" while the prompt is up; blocked while deriving/registering.
  const canClose = state.step === 'nametag_input' || state.step === 'error';
  const handleRequestClose = useCallback(() => {
    if (!canClose) return;
    onClose();
  }, [canClose, onClose]);

  // Escape mirrors the backdrop/X close (and is equally blocked mid-work).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleRequestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleRequestClose]);

  const showFormatHint = cleanTag.length > 0 && !isValid && !state.registerError;

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-black/40"
            onClick={handleRequestClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-100 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-sm p-5 pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  New Address
                </h3>
                <button
                  onClick={handleRequestClose}
                  disabled={!canClose}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-30"
                >
                  <X className="w-4 h-4 text-neutral-500" />
                </button>
              </div>

              {state.step === 'deriving' && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Generating new address...
                  </p>
                  {state.slow && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                      Network is slow — still working...
                    </p>
                  )}
                </div>
              )}

              {(state.step === 'nametag_input' || state.step === 'registering') && (
                <>
                  {state.newAddress && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 shrink-0">
                        Address #{state.newAddress.index}
                      </span>
                      <span className="text-xs font-mono text-neutral-400 truncate">
                        {truncateId(state.newAddress.chainPubkey)}
                      </span>
                    </div>
                  )}

                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Choose a Unicity ID for this address, or skip for now.
                  </p>

                  {state.step === 'registering' ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        Registering @{cleanTag}...
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Don't close this window
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Nametag input */}
                      <div className="relative mb-3">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                          @
                        </span>
                        <input
                          ref={inputRef}
                          type="text"
                          value={input}
                          onChange={handleChange}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRegister();
                          }}
                          placeholder="nametag"
                          maxLength={32}
                          className="w-full pl-7 pr-8 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors"
                        />
                        {/* Availability indicator */}
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          {availability === 'checking' && (
                            <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
                          )}
                          {availability === 'available' && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          )}
                          {availability === 'taken' && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          {availability === 'unknown' && (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                        </span>
                      </div>

                      {/* Availability / validation / error — fixed height, no layout shift */}
                      <div className="min-h-8 mb-2">
                        {state.registerError && (
                          <p className="text-xs text-red-500">{state.registerError}</p>
                        )}
                        {!state.registerError && showFormatHint && (
                          <p className="text-xs text-neutral-400">{NAMETAG_FORMAT_HINT}</p>
                        )}
                        {!state.registerError && availability === 'taken' && (
                          <p className="text-xs text-red-500">@{cleanTag} is already taken</p>
                        )}
                        {!state.registerError && availability === 'available' && (
                          <p className="text-xs text-emerald-500">@{cleanTag} is available</p>
                        )}
                        {!state.registerError && availability === 'unknown' && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Can't verify availability right now — registration will fail if the
                            ID is taken.
                          </p>
                        )}
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSkip}
                          className="flex-1 px-3 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors"
                        >
                          Skip
                        </button>
                        <button
                          onClick={handleRegister}
                          disabled={!canRegister}
                          className="flex-1 px-3 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors disabled:opacity-50"
                        >
                          Register
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {state.step === 'complete' && state.outcome !== 'skipped' && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <p className="text-sm text-neutral-700 dark:text-neutral-200 text-center">
                    {state.outcome === 'recovered' ? (
                      <>
                        <span className="font-medium">@{state.completedNametag}</span> was
                        recovered for this address
                      </>
                    ) : (
                      <>
                        <span className="font-medium">@{state.completedNametag}</span> is ready
                      </>
                    )}
                  </p>
                </div>
              )}

              {state.step === 'error' && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                  <p className="text-sm text-red-500 text-center">{state.error}</p>
                  <div className="flex gap-2 w-full mt-2">
                    <button
                      onClick={onClose}
                      className="flex-1 px-3 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => start()}
                      className="flex-1 px-3 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
