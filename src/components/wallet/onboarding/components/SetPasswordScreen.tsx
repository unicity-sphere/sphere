/**
 * SetPasswordScreen - optional at-rest password step for onboarding + import
 * (#449, #449 follow-up)
 *
 * Shown AFTER the seed-backup screen in the create flow, and after the
 * mnemonic is entered/known in the import/restore flow. Purely a form —
 * validation only (match + min length). The caller (useOnboardingFlow's
 * `handleSetPassword`) decides how the chosen password is applied:
 *  - Restore/import flow: into the wallet's initial `importWallet(mnemonic,
 *    { password })` call — a fresh wallet, nothing persisted yet.
 *  - Create flow: the wallet is ALREADY persisted (plaintext) by this point,
 *    so the password is applied via the reviewed-SAFE in-place mnemonic
 *    re-encrypt (`setWalletPassword` from `useSphereContext()`) — never a
 *    second `importWallet`/`Sphere.import()` call, which would wipe the
 *    token DB. See `handleSetPassword`'s doc-comment for the full history.
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

const MIN_PASSWORD_LENGTH = 8;

interface SetPasswordScreenProps {
  onSet: (password: string) => void;
  onSkip: () => void;
  /** Disables Set/Skip while a persist is in flight (#449 re-entrancy guard —
   *  this screen has no other affordance stopping a double-click / a fast
   *  Set-then-Skip from firing two overlapping persist calls). */
  isBusy?: boolean;
  /**
   * External failure surfaced by the caller (e.g. `setWalletPassword`
   * rejecting) — distinct from this screen's own local validation errors
   * (mismatch / too-short). Without this the caller had no way to report a
   * failed persist, so the UI would silently advance the user into what
   * they'd believe was a password-protected wallet while it stayed
   * plaintext (#449 review fix — see `handleSetPassword`).
   */
  error?: string | null;
}

export function SetPasswordScreen({ onSet, onSkip, isBusy = false, error: externalError = null }: SetPasswordScreenProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSet = useCallback(() => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords don't match");
      return;
    }
    setValidationError(null);
    onSet(password);
  }, [password, confirmPassword, onSet]);

  // Local validation takes priority (it's about what's currently typed);
  // otherwise surface the caller's error (a failed persist against what was
  // already submitted).
  const error = validationError ?? externalError;

  return (
    <motion.div
      key="setPassword"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.1 }}
      className="relative z-10 w-full max-w-90 mx-auto"
    >
      {/* Icon */}
      <div className="relative w-16 h-16 mx-auto mb-5">
        <div className="absolute inset-0 bg-brand-orange/30 rounded-2xl blur-xl" />
        <div className="relative w-full h-full rounded-2xl bg-linear-to-br from-brand-orange to-brand-orange-dark flex items-center justify-center shadow-xl shadow-brand-orange/25">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">
        Protect Your Wallet
      </h2>

      <p className="text-neutral-500 dark:text-[#ffe2cc] text-sm mb-5 leading-relaxed">
        Add a password to encrypt your wallet on this device.{" "}
        <span className="text-brand-orange font-semibold">
          This can only be recovered with your recovery phrase
        </span>{" "}
        — there is no other way to reset it.
      </p>

      <div className="flex flex-col gap-3 mb-2">
        <input
          type="password"
          aria-label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-2.5 text-sm rounded-xl bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-brand-orange/60"
        />
        <input
          type="password"
          aria-label="Confirm password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSet()}
          placeholder="Confirm password"
          className="w-full px-4 py-2.5 text-sm rounded-xl bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-brand-orange/60"
        />
      </div>

      {error && (
        <p className="text-red-500 dark:text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2 rounded-lg mb-3 text-left">
          {error}
        </p>
      )}

      <button
        onClick={handleSet}
        disabled={isBusy}
        className="relative w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-brand-orange to-brand-orange-dark text-white text-sm font-bold shadow-xl shadow-brand-orange/25 flex items-center justify-center gap-2 overflow-hidden group mb-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="absolute inset-0 bg-linear-to-r from-brand-orange to-brand-orange-dark opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10">Set Password</span>
      </button>
      <button
        onClick={onSkip}
        disabled={isBusy}
        className="w-full py-2.5 px-5 text-sm text-neutral-500 dark:text-[#ffe2cc] hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors rounded-xl hover:bg-neutral-100 dark:hover:bg-white/6 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Skip
      </button>
    </motion.div>
  );
}
