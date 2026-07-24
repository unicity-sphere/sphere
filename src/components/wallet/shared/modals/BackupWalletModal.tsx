import { useEffect, useState } from 'react';
import { Download, Key, Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { AlertMessage, MenuButton, ModalHeader } from '../../ui';
import { WalletScreen } from '../../ui/WalletScreen';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';

interface BackupWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportWalletFile: () => void;
  onShowRecoveryPhrase: () => void;
  hasMnemonic?: boolean;
}

const inputClass =
  'w-full px-4 py-2.5 text-sm rounded-xl bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 ' +
  'text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-orange-500/60';

/**
 * Backup Wallet screen (#449): "Export Wallet File" and "Show Recovery
 * Phrase" both expose the seed, so when the wallet has an at-rest password
 * set, the user must re-enter it here before either option is revealed.
 * Verification is read-only (SphereContext.verifyWalletPassword) — it never
 * mutates the stored mnemonic and the entered password is never persisted,
 * only held in local component state until the gate is passed or the modal
 * closes. Wallets with NO password (hasWalletPassword === false) skip the
 * gate entirely, exactly as before this change.
 */
export function BackupWalletModal({
  isOpen,
  onClose,
  onExportWalletFile,
  onShowRecoveryPhrase,
  hasMnemonic = true,
}: BackupWalletModalProps) {
  const { hasWalletPassword, verifyWalletPassword } = useSphereContext();

  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Re-ask every time the modal is (re)opened — the gate must not stay
  // "remembered" across separate visits to this screen.
  useEffect(() => {
    if (isOpen) {
      setAuthenticated(false);
      setPassword('');
      setError(null);
      setBusy(false);
    }
  }, [isOpen]);

  const locked = hasWalletPassword && !authenticated;

  const handleUnlock = async () => {
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await verifyWalletPassword(password);
      if (ok) {
        setAuthenticated(true);
      } else {
        setError('Incorrect password');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <WalletScreen isOpen={isOpen} onClose={onClose}>
      <ModalHeader variant="screen" title="Backup Wallet" onClose={onClose} />
      <div className="flex-1 flex flex-col justify-center px-6 pb-8">
        <div className="flex flex-col items-center text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4"
          >
            {locked ? (
              <Lock className="w-8 h-8 text-orange-500" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-orange-500" />
            )}
          </motion.div>
          <p className="text-sm text-neutral-500 dark:text-white/45">
            {locked
              ? 'Enter your wallet password to continue'
              : 'Choose how you want to backup your wallet'}
          </p>
        </div>

        {locked ? (
          <div className="space-y-3">
            <input
              type="password"
              aria-label="Password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Enter your password"
              className={inputClass}
            />

            {error && <AlertMessage variant="error">{error}</AlertMessage>}

            <button
              onClick={handleUnlock}
              disabled={busy}
              className="w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-orange-500 to-orange-600 dark:from-brand-orange dark:to-brand-orange-dark text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Verifying…' : 'Continue'}
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <MenuButton
              icon={Download}
              color="blue"
              label="Export Wallet File"
              subtitle="Download encrypted JSON file"
              showChevron={false}
              onClick={() => {
                onClose();
                onExportWalletFile();
              }}
            />

            <MenuButton
              icon={Key}
              color="orange"
              label="Show Recovery Phrase"
              subtitle={hasMnemonic ? 'View 12-word seed phrase' : 'Not available for legacy wallets'}
              showChevron={false}
              disabled={!hasMnemonic}
              onClick={() => {
                onClose();
                onShowRecoveryPhrase();
              }}
            />

            <button
              onClick={onClose}
              className="w-full py-3 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </WalletScreen>
  );
}
