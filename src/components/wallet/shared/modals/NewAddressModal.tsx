/**
 * NewAddressModal — the single Unicity ID prompt shown after deriving a new
 * address (#413). Shared by AddressSelector ("New") and AddressManagerModal
 * ("Derive New Address").
 *
 * Visually mirrors the onboarding NametagScreen / RegisterNametagModal
 * (@unicity-suffixed input, availability-colored border, gradient Register,
 * "Skip for now"), hosted in the wallet's standard dialog chrome.
 *
 * Rendered through a portal: both hosts sit inside transformed/stacked
 * containers where the dialog's `fixed` overlay would clip or mis-position.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, CheckCircle2, AlertCircle, AlertTriangle, ArrowRight, MapPin } from 'lucide-react';
import { isValidNametag } from '@unicitylabs/sphere-sdk';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader } from '../../ui';
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

  // Focus the input when the prompt appears (after the dialog spring-in).
  useEffect(() => {
    if (state.step === 'nametag_input') {
      const timer = setTimeout(() => inputRef.current?.focus(), 400);
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

  const showFormatHint = cleanTag.length > 0 && !isValid;

  const inputBorderClass =
    availability === 'taken'
      ? 'border-red-400 dark:border-red-500/50 focus:border-red-500'
      : availability === 'available'
        ? 'border-emerald-400 dark:border-emerald-500/50 focus:border-emerald-500'
        : availability === 'unknown'
          ? 'border-amber-400 dark:border-amber-500/50 focus:border-amber-500'
          : 'border-neutral-200 dark:border-white/8 focus:border-orange-500';

  const modal = (
    <WalletScreen isOpen={isOpen} onClose={handleRequestClose} asModal>
      <ModalHeader
        title="New Address"
        icon={MapPin}
        iconVariant="neutral"
        onClose={handleRequestClose}
        closeDisabled={!canClose}
      />

      <div className="px-6 py-8 space-y-4 flex-1">
        {state.step === 'deriving' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
            <p className="text-sm text-neutral-500 dark:text-white/45">
              Generating new address...
            </p>
            {state.slow && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                Network is slow — still working...
              </p>
            )}
          </div>
        )}

        {state.step === 'nametag_input' && (
          <>
            {state.newAddress && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-neutral-100 dark:bg-white/4 border border-neutral-200 dark:border-white/8 rounded-xl">
                <span className="text-xs font-medium text-neutral-500 dark:text-white/45 shrink-0">
                  Address #{state.newAddress.index}
                </span>
                <span className="text-xs font-mono text-neutral-400 dark:text-white/35 truncate">
                  {truncateId(state.newAddress.chainPubkey)}
                </span>
              </div>
            )}

            <p className="text-sm text-neutral-500 dark:text-white/45">
              Choose a unique <span className="font-semibold">Unicity ID</span> for this
              address to receive tokens easily, or skip for now.
            </p>

            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                  {availability === 'checking' && (
                    <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin" />
                  )}
                  {availability === 'available' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  {availability === 'taken' && (
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  )}
                  {availability === 'unknown' && (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span className="text-neutral-400 dark:text-neutral-500 group-focus-within:text-orange-500 dark:group-focus-within:text-orange-400 transition-colors text-sm font-medium">
                    @unicity
                  </span>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleChange}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRegister();
                  }}
                  placeholder="id"
                  maxLength={32}
                  className={`w-full bg-neutral-100 dark:bg-white/4 border-2 rounded-xl py-3 pl-4 pr-28 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:bg-white dark:focus:bg-white/6 transition-all ${inputBorderClass}`}
                />
              </div>

              {/* Availability / validation status — fixed height to prevent layout shift */}
              <div className="h-8 -mt-2">
                {showFormatHint && (
                  <p className="text-neutral-400 dark:text-white/35 text-xs">
                    {NAMETAG_FORMAT_HINT}
                  </p>
                )}
                {!showFormatHint && availability === 'taken' && (
                  <p className="text-red-500 dark:text-red-400 text-xs">
                    @{cleanTag} is already taken
                  </p>
                )}
                {!showFormatHint && availability === 'available' && (
                  <p className="text-emerald-500 dark:text-emerald-400 text-xs">
                    @{cleanTag} is available
                  </p>
                )}
                {!showFormatHint && availability === 'unknown' && (
                  <p className="text-amber-600 dark:text-amber-400 text-xs">
                    Can't verify availability right now — registration will fail if the ID
                    is taken.
                  </p>
                )}
              </div>

              <button
                onClick={handleRegister}
                disabled={!canRegister}
                className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-orange-500 to-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:from-orange-400 hover:to-orange-500 transition-all"
              >
                Register
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleSkip}
                className="w-full py-2 text-sm font-medium text-neutral-500 dark:text-white/45 hover:text-neutral-700 dark:hover:text-white/65 transition-colors"
              >
                Skip for now
              </button>

              {state.registerError && (
                <p className="text-red-500 dark:text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                  {state.registerError}
                </p>
              )}
            </div>
          </>
        )}

        {state.step === 'registering' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
            <p className="text-sm text-neutral-700 dark:text-white/85">
              Registering @{cleanTag}...
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Don't close this window
            </p>
          </div>
        )}

        {state.step === 'complete' && state.outcome !== 'skipped' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            <p className="text-sm text-neutral-700 dark:text-white/85 text-center">
              {state.outcome === 'recovered' ? (
                <>
                  <span className="font-semibold">@{state.completedNametag}</span> was
                  recovered for this address
                </>
              ) : (
                <>
                  <span className="font-semibold">@{state.completedNametag}</span> is ready
                </>
              )}
            </p>
          </div>
        )}

        {state.step === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <AlertCircle className="w-9 h-9 text-red-500" />
            <p className="text-sm text-red-500 dark:text-red-400 text-center">{state.error}</p>
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-3 text-sm font-medium text-neutral-600 dark:text-white/65 bg-neutral-100 dark:bg-white/6 hover:bg-neutral-200 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => start()}
                className="flex-1 px-3 py-3 rounded-xl bg-linear-to-r from-orange-500 to-orange-600 text-white text-sm font-bold hover:from-orange-400 hover:to-orange-500 transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </WalletScreen>
  );

  return createPortal(modal, document.body);
}
