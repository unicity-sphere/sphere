/**
 * Settings → Security (#449 Task 8b): set / change / remove the wallet's
 * at-rest password (works for ANY existing wallet, including plaintext
 * create-flow wallets), and pick the auto-lock timeout.
 *
 * Password changes go through `useSphereContext()`'s
 * setWalletPassword/changeWalletPassword/removeWalletPassword, which use the
 * VERIFIED-SAFE in-place mnemonic re-encryption (reencryptStoredMnemonic) —
 * never Sphere.import()/Sphere.clear(), which would wipe the token DB.
 */
import { useCallback, useState } from 'react';
import { Clock, Lock, ShieldCheck, ShieldOff } from 'lucide-react';
import { WalletScreen } from '../../ui/WalletScreen';
import { AlertMessage, MenuButton, ModalHeader } from '../../ui';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { AUTO_LOCK_OPTIONS, type AutoLockValue } from '../../../../sdk/walletLock/lockSettings';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'menu' | 'set' | 'change' | 'remove';

const MIN_PASSWORD_LENGTH = 8;

const MODE_TITLES: Record<Mode, string> = {
  menu: 'Security',
  set: 'Set Password',
  change: 'Change Password',
  remove: 'Remove Password',
};

function formatAutoLockLabel(value: AutoLockValue): string {
  return value === 'never' ? 'Never' : `${value}m`;
}

const inputClass =
  'w-full px-4 py-2.5 text-sm rounded-xl bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 ' +
  'text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-orange-500/60';

export function SecurityModal({ isOpen, onClose }: SecurityModalProps) {
  const {
    hasWalletPassword,
    setWalletPassword,
    changeWalletPassword,
    removeWalletPassword,
    autoLockMinutes,
    setAutoLockTimeout,
  } = useSphereContext();

  const [mode, setMode] = useState<Mode>('menu');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetForm = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setBusy(false);
  }, []);

  const goToMenu = useCallback(() => {
    resetForm();
    setMode('menu');
  }, [resetForm]);

  const handleClose = useCallback(() => {
    resetForm();
    setMode('menu');
    onClose();
  }, [resetForm, onClose]);

  const validateNewPassword = useCallback((): string | null => {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    if (newPassword !== confirmPassword) {
      return "Passwords don't match";
    }
    return null;
  }, [newPassword, confirmPassword]);

  const handleSet = useCallback(async () => {
    const validationError = validateNewPassword();
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setWalletPassword(newPassword);
      goToMenu();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set password');
    } finally {
      setBusy(false);
    }
  }, [newPassword, validateNewPassword, setWalletPassword, goToMenu]);

  const handleChange = useCallback(async () => {
    const validationError = validateNewPassword();
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await changeWalletPassword(currentPassword, newPassword);
      goToMenu();
    } catch (e) {
      // Surfaces "Incorrect current password" from reencryptStoredMnemonic verbatim.
      setError(e instanceof Error ? e.message : 'Failed to change password');
    } finally {
      setBusy(false);
    }
  }, [currentPassword, newPassword, validateNewPassword, changeWalletPassword, goToMenu]);

  const handleRemove = useCallback(async () => {
    if (!currentPassword) {
      setError('Enter your current password');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await removeWalletPassword(currentPassword);
      goToMenu();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove password');
    } finally {
      setBusy(false);
    }
  }, [currentPassword, removeWalletPassword, goToMenu]);

  return (
    <WalletScreen isOpen={isOpen} onClose={handleClose}>
      <ModalHeader
        variant="screen"
        title={MODE_TITLES[mode]}
        icon={ShieldCheck}
        iconVariant="neutral"
        onClose={mode === 'menu' ? handleClose : goToMenu}
        closeDisabled={busy}
      />

      <div className="px-4 py-6 space-y-4 flex-1 overflow-y-auto">
        {mode === 'menu' && (
          <>
            {!hasWalletPassword ? (
              <MenuButton
                icon={Lock}
                color="orange"
                label="Set Password"
                subtitle="Encrypt your wallet on this device"
                onClick={() => setMode('set')}
              />
            ) : (
              <div className="space-y-2">
                <MenuButton
                  icon={Lock}
                  color="orange"
                  label="Change Password"
                  onClick={() => setMode('change')}
                />
                <MenuButton
                  icon={ShieldOff}
                  color="red"
                  label="Remove Password"
                  danger
                  onClick={() => setMode('remove')}
                />
              </div>
            )}

            {hasWalletPassword && (
              <div className="pt-2">
                <div className="flex items-center gap-1.5 px-1 pb-2 text-xs font-medium text-neutral-500 dark:text-white/45">
                  <Clock className="w-3.5 h-3.5" />
                  Auto-lock after inactivity
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {AUTO_LOCK_OPTIONS.map((option) => (
                    <button
                      key={String(option)}
                      onClick={() => setAutoLockTimeout(option)}
                      aria-pressed={autoLockMinutes === option}
                      className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                        autoLockMinutes === option
                          ? 'bg-orange-500 dark:bg-brand-orange text-white'
                          : 'bg-neutral-100 dark:bg-white/6 text-neutral-600 dark:text-white/55 hover:bg-neutral-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {formatAutoLockLabel(option)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {(mode === 'set' || mode === 'change') && (
          <>
            <p className="text-sm text-neutral-500 dark:text-white/45">
              {mode === 'set'
                ? 'Add a password to encrypt your wallet on this device.'
                : 'Enter your current password and choose a new one.'}{' '}
              <span className="text-orange-600 dark:text-brand-orange font-semibold">
                This can only be recovered with your recovery phrase
              </span>{' '}
              — there is no other way to reset it.
            </p>

            {mode === 'change' && (
              <input
                type="password"
                aria-label="Current password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className={inputClass}
              />
            )}
            <input
              type="password"
              aria-label="New password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className={inputClass}
            />
            <input
              type="password"
              aria-label="Confirm new password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (mode === 'set' ? handleSet() : handleChange())}
              placeholder="Confirm new password"
              className={inputClass}
            />

            {error && <AlertMessage variant="error">{error}</AlertMessage>}

            <button
              onClick={mode === 'set' ? handleSet : handleChange}
              disabled={busy}
              className="w-full py-3.5 px-5 rounded-xl bg-linear-to-r from-orange-500 to-orange-600 dark:from-brand-orange dark:to-brand-orange-dark text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Saving…' : mode === 'set' ? 'Set Password' : 'Change Password'}
            </button>
          </>
        )}

        {mode === 'remove' && (
          <>
            <p className="text-sm text-neutral-500 dark:text-white/45">
              Removing your password stores your wallet unencrypted on this device.
              Enter your current password to confirm.
            </p>
            <input
              type="password"
              aria-label="Current password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRemove()}
              placeholder="Current password"
              className={inputClass}
            />

            {error && <AlertMessage variant="error">{error}</AlertMessage>}

            <button
              onClick={handleRemove}
              disabled={busy}
              className="w-full py-3.5 px-5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Removing…' : 'Remove Password'}
            </button>
          </>
        )}
      </div>
    </WalletScreen>
  );
}
