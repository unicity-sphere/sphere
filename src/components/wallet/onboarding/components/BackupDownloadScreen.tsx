/**
 * BackupDownloadScreen - optional backup-file download, AFTER the password
 * step (#449 create-flow reorder: show -> confirm -> password -> download).
 *
 * Running after setPassword means the SAME password chosen there (if any)
 * encrypts this download, exactly like the in-wallet "Save Wallet" — see
 * `handleDownloadBackup` / `createBackupPasswordRef` in useOnboardingFlow.
 * `encrypted` only drives this screen's own label/copy.
 */
import { motion } from "framer-motion";
import { Download, ShieldAlert } from "lucide-react";

interface BackupDownloadScreenProps {
  /** True when a wallet password was set on the preceding setPassword step —
   *  the SAME password encrypts this download; false means it will be
   *  plaintext (password step skipped). */
  encrypted: boolean;
  onDownloadBackup: () => void;
  onContinue: () => void;
}

export function BackupDownloadScreen({
  encrypted,
  onDownloadBackup,
  onContinue,
}: BackupDownloadScreenProps) {
  return (
    <motion.div
      key="backupDownload"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.1 }}
      className="relative z-10 w-full max-w-95"
    >
      {/* Icon */}
      <div className="relative w-18 h-18 mx-auto mb-5">
        <div className="absolute inset-0 bg-amber-500/30 rounded-2xl blur-xl" />
        <div className="relative w-full h-full rounded-2xl bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/25">
          <ShieldAlert className="w-9 h-9 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">
        Download Wallet Backup
      </h2>

      <p className="text-neutral-500 dark:text-[#ffe2cc] text-sm mb-5 mx-auto leading-relaxed">
        Optionally save a backup file of your wallet{" "}
        {encrypted
          ? "encrypted with the password you just set."
          : "in plain text — you can add a password from Settings later."}
      </p>

      {/* Download backup button — reuses the wallet password from the
          preceding setPassword step; no separate password entry here. */}
      <button
        onClick={onDownloadBackup}
        className="flex items-center justify-center gap-2 w-full mb-5 px-4 py-2.5 text-sm text-neutral-600 dark:text-[#ffe2cc] border border-neutral-200 dark:border-white/15 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors rounded-xl"
      >
        <Download className="w-4 h-4" />
        <span>{encrypted ? "Download Encrypted Backup" : "Download Backup File"}</span>
      </button>

      {/* Warning notice */}
      <div className="mb-5 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          {encrypted
            ? "This backup file is encrypted with your wallet password — you'll need it to restore. Anyone with your recovery phrase can still access your funds, so keep it safe too."
            : "Without a password the backup file contains your recovery phrase in plain text. Anyone with it can access your wallet and funds — set a password or store it securely."}
        </p>
      </div>

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="relative w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-brand-orange to-brand-orange-dark text-white text-sm font-bold shadow-xl shadow-brand-orange/25 flex items-center justify-center gap-2 overflow-hidden group"
      >
        <div className="absolute inset-0 bg-linear-to-r from-brand-orange to-brand-orange-dark opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10">Continue</span>
      </button>
    </motion.div>
  );
}
