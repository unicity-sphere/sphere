/**
 * ConfirmMnemonicScreen - re-entry verification step for the recovery phrase
 * (#449 create-flow reorder: show -> confirm -> password -> download).
 *
 * MnemonicShowScreen only asks the user to LOOK at the 12 words; this screen
 * makes them prove they actually saved them by retyping the phrase. The
 * caller (useOnboardingFlow's `handleConfirmMnemonic`) normalizes both sides
 * (trim / collapse whitespace / lowercase) and compares against
 * `generatedMnemonic` — only an exact match advances the flow to the
 * optional password step. A mismatch surfaces `error` here and does NOT
 * advance, so a user who mistyped (or didn't actually write it down) can't
 * proceed believing they have a working backup. "Back" returns to
 * MnemonicShowScreen to re-view the words.
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

interface ConfirmMnemonicScreenProps {
  onSubmit: (entered: string) => void;
  onBack: () => void;
  /** Surfaced by the caller on a mismatch — cleared once the user retries. */
  error?: string | null;
}

export function ConfirmMnemonicScreen({
  onSubmit,
  onBack,
  error = null,
}: ConfirmMnemonicScreenProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(() => {
    onSubmit(value);
  }, [value, onSubmit]);

  return (
    <motion.div
      key="mnemonicConfirm"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.1 }}
      className="relative z-10 w-full max-w-95"
    >
      {/* Icon */}
      <div className="relative w-18 h-18 mx-auto mb-5">
        <div className="absolute inset-0 bg-brand-orange/30 rounded-2xl blur-xl" />
        <div className="relative w-full h-full rounded-2xl bg-linear-to-br from-brand-orange to-brand-orange-dark flex items-center justify-center shadow-xl shadow-brand-orange/25">
          <ShieldCheck className="w-9 h-9 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">
        Confirm Recovery Phrase
      </h2>

      <p className="text-neutral-500 dark:text-[#ffe2cc] text-sm mb-5 mx-auto leading-relaxed">
        Re-enter your 12-word recovery phrase, separated by spaces, to
        confirm you saved it correctly.
      </p>

      <textarea
        aria-label="Recovery phrase"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter your 12 words separated by spaces"
        rows={3}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="w-full px-4 py-3 text-sm rounded-xl bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-brand-orange/60 mb-3 resize-none"
      />

      {error && (
        <p className="text-red-500 dark:text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2 rounded-lg mb-3 text-left">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        className="relative w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-brand-orange to-brand-orange-dark text-white text-sm font-bold shadow-xl shadow-brand-orange/25 flex items-center justify-center gap-2 overflow-hidden group mb-2.5"
      >
        <div className="absolute inset-0 bg-linear-to-r from-brand-orange to-brand-orange-dark opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10">Confirm</span>
      </button>
      <button
        onClick={onBack}
        className="w-full py-2.5 px-5 text-sm text-neutral-500 dark:text-[#ffe2cc] hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors rounded-xl hover:bg-neutral-100 dark:hover:bg-white/6"
      >
        Back
      </button>
    </motion.div>
  );
}
