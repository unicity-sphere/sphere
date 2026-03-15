/**
 * PasswordSetupScreen - Extension-specific encryption password step.
 * Required for encrypted mnemonic storage in chrome.storage.local.
 * Only rendered when VITE_PLATFORM === 'extension'.
 */
import { Lock, ArrowLeft, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

interface PasswordSetupScreenProps {
  password: string;
  confirmPassword: string;
  isBusy: boolean;
  error: string | null;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export function PasswordSetupScreen({
  password,
  confirmPassword,
  isBusy,
  error,
  onPasswordChange,
  onConfirmPasswordChange,
  onConfirm,
  onBack,
}: PasswordSetupScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && password && confirmPassword && !isBusy) {
      onConfirm();
    }
  };

  return (
    <motion.div
      key="passwordSetup"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="relative z-10 w-full max-w-sm"
    >
      {/* Icon */}
      <div className="relative w-18 h-18 mx-auto mb-6">
        <div className="absolute inset-0 bg-brand-orange/30 rounded-2xl blur-xl" />
        <div className="relative w-full h-full rounded-2xl bg-linear-to-br from-brand-orange to-brand-orange-dark flex items-center justify-center shadow-xl shadow-brand-orange/25">
          <Lock className="w-9 h-9 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
        Set Encryption Password
      </h2>
      <p className="text-[var(--color-text-secondary)] text-sm mb-7 mx-auto leading-relaxed">
        This password encrypts your wallet locally.{" "}
        <span className="text-brand-orange font-semibold">
          You'll need it each time you open the extension.
        </span>
      </p>

      {/* Password inputs */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Create password (min 8 characters)"
            disabled={isBusy}
            className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl py-3 pl-3 pr-10 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-brand-orange transition-all disabled:opacity-50"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Confirm password"
            disabled={isBusy}
            className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl py-3 pl-3 pr-10 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-brand-orange transition-all disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isBusy}
          className="flex-1 py-3.5 px-5 rounded-xl bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-sm font-bold border border-[var(--color-border)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={onConfirm}
          disabled={isBusy || !password || !confirmPassword}
          className="flex-2 relative py-3.5 px-5 rounded-xl bg-linear-to-r from-brand-orange to-brand-orange-dark text-white text-sm font-bold shadow-xl shadow-brand-orange/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
        >
          <div className="absolute inset-0 bg-linear-to-r from-brand-orange to-brand-orange-dark opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative z-10 flex items-center gap-2">
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </span>
        </button>
      </div>

      {error && (
        <p className="mt-3 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
          {error}
        </p>
      )}
    </motion.div>
  );
}
