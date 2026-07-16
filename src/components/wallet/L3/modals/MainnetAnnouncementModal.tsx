import { Globe } from 'lucide-react';
import { NETWORKS } from '@unicitylabs/sphere-sdk';
import { BaseModal } from '../../ui/BaseModal';
import { Button, SecondaryButton } from '../../ui';
import { SPHERE_NETWORK, markMainnetAnnounced, setActiveNetwork } from '../../../../config/network';

interface MainnetAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Tells a wallet still on a test network that mainnet is live, once.
 *
 * An invitation, not a migration: moving between networks changes which assets
 * exist, so it stays the user's call (see shouldAnnounceMainnet). Declining is
 * a first-class answer and is remembered exactly like accepting — an invitation
 * that reappears is a nag.
 */
export function MainnetAnnouncementModal({ isOpen, onClose }: MainnetAnnouncementModalProps) {
  const currentLabel = NETWORKS[SPHERE_NETWORK].name;

  const dismiss = () => {
    markMainnetAnnounced();
    onClose();
  };

  const switchToMainnet = () => {
    // Mark first: setActiveNetwork reloads the page, so anything after it is
    // never reached — and an unmarked switch would re-invite on the way back.
    markMainnetAnnounced();
    setActiveNetwork('mainnet');
  };

  return (
    <BaseModal isOpen={isOpen} onClose={dismiss} size="md">
      <div className="flex flex-col items-center text-center px-6 py-8 sm:py-10 gap-5">
        {/* The one bold moment: a network that is finally live. */}
        <div className="relative flex items-center justify-center">
          <span className="absolute w-16 h-16 rounded-full bg-emerald-500/20 animate-ping motion-reduce:animate-none" />
          <span className="relative w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Globe className="w-8 h-8 text-emerald-500" />
          </span>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold font-mono text-neutral-900 dark:text-white">
            Mainnet is live
          </h3>
          <p className="text-sm leading-relaxed text-neutral-500 dark:text-white/50 max-w-xs">
            Real assets on the Unicity network. Your {currentLabel} wallet stays exactly as it is —
            each network keeps its own balances, history and keys, and you can switch back whenever
            you want.
          </p>
        </div>

        <div className="flex flex-col w-full gap-2 pt-1">
          <Button size="md" fullWidth onClick={switchToMainnet}>
            Switch to Mainnet
          </Button>
          <SecondaryButton size="md" fullWidth onClick={dismiss}>
            Stay on {currentLabel}
          </SecondaryButton>
        </div>
      </div>
    </BaseModal>
  );
}
