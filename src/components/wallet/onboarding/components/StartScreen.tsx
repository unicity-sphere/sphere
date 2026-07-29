/**
 * StartScreen - Initial onboarding screen
 * Shows options to create new wallet, restore, or continue setup
 */
import { motion } from "framer-motion";
import {
  Wallet,
  ArrowRight,
  Loader2,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

interface StartScreenProps {
  identity: { address: string } | null | undefined;
  nametag: string | null | undefined;
  isBusy: boolean;
  error: string | null;
  progressMessage?: string | null;
  onCreateWallet: () => void;
  onContinueSetup: () => void;
  onRestore: () => void;
}

export function StartScreen({
  identity,
  nametag,
  isBusy,
  error,
  progressMessage,
  onCreateWallet,
  onContinueSetup,
  onRestore,
}: StartScreenProps) {
  const showContinueSetup = identity && !nametag;

  return (
    <motion.div
      key="start"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.1 }}
      className="relative z-10 w-full max-w-90"
    >
      {/* Icon */}
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 dark:from-brand-orange dark:to-brand-orange-dark flex items-center justify-center">
        <Wallet className="w-8 h-8 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 dark:text-[#fefefe] mb-2 tracking-tight" style={{ fontFamily: "'Geist', sans-serif" }}>
        {showContinueSetup ? "Complete Setup" : "No Wallet Found"}
      </h2>
      <p className="text-neutral-500 dark:text-[rgba(255,255,255,0.45)] text-sm mb-7 mx-auto leading-relaxed">
        {showContinueSetup ? (
          <>
            Your wallet is ready. Create a{" "}
            <span className="text-orange-500 dark:text-brand-orange font-semibold">
              Unicity ID
            </span>{" "}
            to complete setup.
          </>
        ) : (
          <>
            Create a new secure wallet to start using{" "}
            <span className="text-orange-500 dark:text-brand-orange font-semibold whitespace-nowrap">
              the Unicity Network
            </span>
          </>
        )}
      </p>

      {/* Show "Continue Setup" if identity exists but no nametag */}
      {showContinueSetup && (
        <>
          <motion.button
            onClick={onContinueSetup}
            disabled={isBusy}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className="relative w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden mb-3"
          >
            <span className="relative z-10 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Continue Setup
            </span>
          </motion.button>
        </>
      )}

      {/* Divider when showing continue option */}
      {showContinueSetup && (
        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-neutral-200 dark:bg-[rgba(255,255,255,0.07)]" />
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
            or start fresh
          </span>
          <div className="flex-1 h-px bg-neutral-200 dark:bg-[rgba(255,255,255,0.07)]" />
        </div>
      )}

      <motion.button
        onClick={onCreateWallet}
        disabled={isBusy}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        className="relative w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-orange-500 to-orange-600 dark:from-brand-orange dark:to-brand-orange-dark text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
      >
        <span className="relative z-10 flex items-center gap-2">
          {isBusy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Create New Wallet
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </span>
      </motion.button>

      {isBusy && progressMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 text-neutral-500 dark:text-[rgba(255,255,255,0.45)] text-[11px] mt-2.5"
        >
          <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
          <span>{progressMessage}</span>
        </motion.div>
      )}

      <motion.button
        onClick={onRestore}
        disabled={isBusy}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        className="relative w-full py-3.5 px-5 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] text-neutral-700 dark:text-[rgba(255,255,255,0.65)] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-3 hover:bg-neutral-200 dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors"
      >
        <KeyRound className="w-4 h-4" />
        Restore Wallet
      </motion.button>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-red-500 dark:text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2 rounded-lg"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}
