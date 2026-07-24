/**
 * UnlockScreen — cold-start unlock gate for an encrypted wallet.
 * Rendered by WalletPanel whenever useSphereContext().isLocked is true (#449).
 * Wrong-password attempts add an in-memory progressive delay (capped at 5s)
 * before retrying, purely client-side rate limiting — nothing is persisted.
 */
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Lock, KeyRound } from 'lucide-react';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { isDecryptionError } from '../../../../sdk/walletLock/isDecryptionError';

export function UnlockScreen({ onRestore }: { onRestore: () => void }) {
  const { unlock } = useSphereContext();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const attemptsRef = useRef(0);

  const handleUnlock = async () => {
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    // Progressive delay (in-memory only, resets on success/reload): 0, 0.5s, 1s, ... capped at 5s.
    const delay = Math.min(attemptsRef.current * 500, 5000);
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      await unlock(password);
      attemptsRef.current = 0;
    } catch (e) {
      attemptsRef.current += 1;
      setError(isDecryptionError(e) ? 'Incorrect password' : 'Could not unlock. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      key="unlock"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.1 }}
      className="min-h-full flex flex-col items-center justify-center gap-4 p-6 text-center w-full max-w-90 mx-auto"
    >
      <div className="w-16 h-16 mx-auto rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 dark:from-brand-orange dark:to-brand-orange-dark flex items-center justify-center">
        <Lock className="w-8 h-8 text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-[#fefefe] mb-2 tracking-tight" style={{ fontFamily: "'Geist', sans-serif" }}>
          Wallet Locked
        </h2>
        <p className="text-neutral-500 dark:text-[rgba(255,255,255,0.45)] text-sm">
          Enter your password to unlock your wallet.
        </p>
      </div>
      <input
        type="password"
        aria-label="Password"
        autoFocus
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
        placeholder="Enter your password"
        className="w-full px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] border border-neutral-200 dark:border-[rgba(255,255,255,0.1)] text-neutral-900 dark:text-white text-sm outline-none focus:border-orange-500 dark:focus:border-brand-orange"
      />
      {error && (
        <p className="text-red-500 dark:text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-2 rounded-lg w-full">
          {error}
        </p>
      )}
      <motion.button
        onClick={handleUnlock}
        disabled={busy}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        className="w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-orange-500 to-orange-600 dark:from-brand-orange dark:to-brand-orange-dark text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? 'Unlocking…' : 'Unlock'}
      </motion.button>
      <button
        onClick={onRestore}
        className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 dark:text-[rgba(255,255,255,0.45)] hover:text-orange-500 dark:hover:text-brand-orange transition-colors"
      >
        <KeyRound className="w-3.5 h-3.5" />
        Forgot password? Restore from recovery phrase
      </button>
    </motion.div>
  );
}
