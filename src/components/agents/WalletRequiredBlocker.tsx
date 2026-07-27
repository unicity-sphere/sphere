import { type ReactNode } from 'react';
import { Wallet, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWalletStatus } from '../../sdk';
import { useSphereContext } from '../../sdk/hooks/core/useSphere';
import { agentRequiresWallet } from '../../config/activities';

interface WalletRequiredBlockerProps {
  children: ReactNode;
  agentId: string;
  onOpenWallet?: () => void;
}

export function WalletRequiredBlocker({ children, agentId, onOpenWallet }: WalletRequiredBlockerProps) {
  const { walletExists, isLoading } = useWalletStatus();
  const { isLocked } = useSphereContext();

  if (isLoading || !agentRequiresWallet(agentId)) {
    return <>{children}</>;
  }

  // LOCKED is checked before walletExists, and it is a distinct state — not a missing wallet.
  //
  // Without this branch a locked wallet renders these apps against `sphere === null`, and they
  // impersonate a brand-new account: DM and Group Chat show their empty states ("No
  // conversations yet"), a cold-start lock leaves group chat spinning "Connecting..." forever
  // while a warm lock leaves the stale connected flag saying "Select a group to start" over an
  // empty list, looking someone up answers "User not found", and creating a group raises a
  // "Group chat not available" toast. Every one of those is a lie about the user's data.
  //
  // It matters most on mobile, where the wallet panel is off-canvas by default and switching
  // apps force-closes it: the UnlockScreen is the app's only lock signal, so without this
  // there are literally no pixels anywhere saying the wallet is locked.
  //
  // A render-time check, not an effect, so decrypted messages cannot flash for one frame
  // before it takes hold.
  if (isLocked) {
    return (
      <LockedNotice
        onOpenWallet={onOpenWallet}
        title="Wallet Locked"
        body="Messaging needs your wallet keys, which left memory when it locked. Unlock it to see your conversations again — nothing has been lost."
        action="Unlock Wallet"
      />
    );
  }

  if (walletExists) {
    return <>{children}</>;
  }

  return (
    <LockedNotice
      onOpenWallet={onOpenWallet}
      icon="wallet"
      title="Wallet Required"
      body="This agent requires a wallet to function. Create or import a wallet to get started."
      action="Set Up Wallet"
    />
  );
}

/** The two blocked states share one shell so they cannot drift apart visually. */
function LockedNotice({
  onOpenWallet,
  icon = 'lock',
  title,
  body,
  action,
}: {
  onOpenWallet?: () => void;
  icon?: 'lock' | 'wallet';
  title: string;
  body: string;
  action: string;
}) {
  const Icon = icon === 'lock' ? Lock : Wallet;
  return (
    <div
      data-testid={icon === 'lock' ? 'chat-locked-notice' : 'chat-wallet-required'}
      className="h-full flex items-center justify-center bg-white/60 dark:bg-[#060606]/40 backdrop-blur-xl rounded-none md:rounded-3xl lg:rounded-none border-0 md:border md:border-neutral-200 dark:md:border-neutral-800/50 lg:border-0"
    >
      <div className="flex flex-col items-center gap-6 p-8 text-center max-w-sm">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl blur-xl opacity-30 bg-orange-500" />
          <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-xl">
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{body}</p>
        </div>

        {onOpenWallet && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenWallet}
            className="px-6 py-2.5 bg-linear-to-r from-orange-500 to-orange-600 text-white font-medium rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-shadow"
          >
            {action}
          </motion.button>
        )}
      </div>
    </div>
  );
}
