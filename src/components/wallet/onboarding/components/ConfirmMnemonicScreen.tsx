/**
 * ConfirmMnemonicScreen - re-entry verification step for the recovery phrase
 * (#449 create-flow reorder: show -> confirm -> password -> download).
 *
 * MnemonicShowScreen only asks the user to LOOK at the 12 words; this screen
 * makes them prove they actually saved them by retyping the phrase into a
 * 12-word grid (same cell layout as the import/restore screen). The caller
 * (useOnboardingFlow's `handleConfirmMnemonic`) normalizes both sides (trim /
 * collapse whitespace / lowercase) and compares against `generatedMnemonic` —
 * only an exact match advances to the optional password step. A mismatch
 * surfaces `error` here and does NOT advance. "Back" returns to
 * MnemonicShowScreen to re-view the words.
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

interface ConfirmMnemonicScreenProps {
  /** Called with the 12 words joined by single spaces. */
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
  const [words, setWords] = useState<string[]>(() => Array(12).fill(""));

  const handleWordChange = (index: number, value: string) => {
    setWords((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").trim();
    const parts = pasted.split(/\s+/).filter((w) => w.length > 0);
    // Pasting the whole phrase fills every cell at once.
    if (parts.length > 1) {
      e.preventDefault();
      const next = Array(12).fill("");
      parts.slice(0, 12).forEach((w, i) => {
        next[i] = w.toLowerCase();
      });
      setWords(next);
    }
  };

  const isComplete = words.every((w) => w.trim());

  const handleSubmit = useCallback(() => {
    if (!words.every((w) => w.trim())) return;
    onSubmit(words.map((w) => w.trim()).join(" "));
  }, [words, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "Enter") return;
    if (index < 11) {
      const nextInput = (e.currentTarget as HTMLElement).parentElement
        ?.nextElementSibling?.querySelector("input");
      (nextInput as HTMLInputElement | null)?.focus();
    } else {
      handleSubmit();
    }
  };

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
        Re-enter your 12-word recovery phrase to confirm you saved it correctly.
      </p>

      {/* 12-word grid (same layout as import) */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={`confirm-word-${index}`} className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 dark:text-neutral-600 font-medium z-10">
              {index + 1}.
            </span>
            <input
              type="text"
              value={words[index]}
              onChange={(e) => handleWordChange(index, e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => handleKeyDown(e, index)}
              placeholder="word"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 rounded-lg py-2.5 pl-8 pr-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-brand-orange/60 transition-all"
              autoFocus={index === 0}
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="text-red-500 dark:text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2 rounded-lg mb-3 text-left">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!isComplete}
        className="relative w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-brand-orange to-brand-orange-dark text-white text-sm font-bold shadow-xl shadow-brand-orange/25 flex items-center justify-center gap-2 overflow-hidden group mb-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
