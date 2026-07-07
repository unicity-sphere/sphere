/**
 * MnemonicBackupScreen - Shows recovery phrase after wallet creation
 * Allows user to copy, download backup, and confirm before entering wallet
 * Layout matches sphere-extension's MnemonicBackupScreen for consistency
 */
import { motion } from "framer-motion";
import { ShieldAlert, Copy, Check, Download } from "lucide-react";
import { useState, useCallback } from "react";

interface MnemonicBackupScreenProps {
  mnemonic: string;
  onDownloadBackup: () => void;
  onConfirm: () => void;
}

export function MnemonicBackupScreen({
  mnemonic,
  onDownloadBackup,
  onConfirm,
}: MnemonicBackupScreenProps) {
  const [copied, setCopied] = useState(false);
  const words = mnemonic.split(" ");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = mnemonic;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [mnemonic]);

  return (
    <motion.div
      key="mnemonicBackup"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.1 }}
      className="relative z-10 w-full max-w-95"
    >
      {/* Warning Icon */}
      <div className="relative w-18 h-18 mx-auto mb-5">
        <div className="absolute inset-0 bg-amber-500/30 rounded-2xl blur-xl" />
        <div className="relative w-full h-full rounded-2xl bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/25">
          <ShieldAlert className="w-9 h-9 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">
        Back Up Recovery Phrase
      </h2>

      <p className="text-neutral-500 dark:text-[#ffe2cc] text-sm mb-5 mx-auto leading-relaxed">
        Write down these 12 words in order and keep them safe.{" "}
        <span className="text-brand-orange font-semibold">
          This is the only way to recover your wallet.
        </span>
      </p>

      {/* Mnemonic word grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {words.map((word, index) => (
          <motion.div
            key={`mnemonic-word-${index}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center gap-1.5 bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 rounded-lg py-2.5 px-3"
          >
            <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium min-w-5">
              {index + 1}.
            </span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {word}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="flex items-center justify-center gap-2 mx-auto mb-5 px-4 py-2 text-xs text-neutral-500 dark:text-[#ffe2cc] hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-white/6"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-500">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Copy to clipboard</span>
          </>
        )}
      </button>

      {/* Download backup button */}
      <button
        onClick={onDownloadBackup}
        className="flex items-center justify-center gap-2 w-full mb-5 px-4 py-2.5 text-sm text-neutral-600 dark:text-[#ffe2cc] border border-neutral-200 dark:border-white/15 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors rounded-xl"
      >
        <Download className="w-4 h-4" />
        <span>Download Backup File</span>
      </button>

      {/* Warning notice */}
      <div className="mb-5 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          Never share your recovery phrase with anyone. Anyone with these words
          can access your wallet and funds.
        </p>
      </div>

      {/* Confirm button */}
      <button
        onClick={onConfirm}
        className="relative w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-brand-orange to-brand-orange-dark text-white text-sm font-bold shadow-xl shadow-brand-orange/25 flex items-center justify-center gap-2 overflow-hidden group"
      >
        <div className="absolute inset-0 bg-linear-to-r from-brand-orange to-brand-orange-dark opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10">
          I've Saved My Recovery Phrase
        </span>
      </button>
    </motion.div>
  );
}
