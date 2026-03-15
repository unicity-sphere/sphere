/**
 * ExtensionGate — shows unlock screen when wallet is locked in extension mode.
 *
 * When the service worker restarts (e.g. after extension rebuild/reload),
 * the in-memory Sphere instance is lost. The encrypted mnemonic remains in
 * chrome.storage.local. This gate intercepts rendering of the main App and
 * shows a password prompt so the user can unlock before accessing the wallet.
 */

import { useState, type ReactNode } from 'react';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';

export function ExtensionGate({ children }: { children: ReactNode }) {
  const { isLoading, walletExists, isUnlocked, unlockWallet, error } = useSphereContext();
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Still loading initial state from background
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#060606]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Wallet exists but is locked — show password screen
  if (walletExists && !isUnlocked) {
    const handleUnlock = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password.trim() || !unlockWallet) return;
      setUnlocking(true);
      setUnlockError(null);
      try {
        await unlockWallet(password);
      } catch (err) {
        setUnlockError(err instanceof Error ? err.message : 'Unlock failed');
      } finally {
        setUnlocking(false);
      }
    };

    return (
      <div className="flex items-center justify-center h-screen bg-[#060606]">
        <div className="w-full max-w-xs px-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white">Wallet Locked</h1>
            <p className="text-neutral-400 text-sm mt-1">Enter password to unlock</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            {(unlockError || error) && (
              <p className="text-red-400 text-sm text-center">{unlockError || error?.message}</p>
            )}
            <button
              type="submit"
              disabled={unlocking || !password.trim()}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
            >
              {unlocking ? 'Unlocking...' : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // No wallet or wallet is unlocked — render app normally
  return <>{children}</>;
}
