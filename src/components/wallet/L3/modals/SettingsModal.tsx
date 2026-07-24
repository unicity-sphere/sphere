import { useState } from 'react';
import { Settings, Download, LogOut, Key, AtSign, Link, CreditCard, ShieldCheck } from 'lucide-react';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader, MenuButton } from '../../ui';
import { LookupModal } from './LookupModal';
import { AddressManagerModal } from './AddressManagerModal';
import { ConnectedSitesModal } from './ConnectedSitesModal';
import { SubscriptionModal } from './SubscriptionModal';
import { SecurityModal } from './SecurityModal';
import { useUpgrade } from '../../../upgrade';
import { useUtilization } from '../../../../sdk/hooks/subscription';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { SUBSCRIPTION_ENABLED } from '../../../../config/subscription';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackupWallet: () => void;
  onLogout: () => void;
  hasMnemonic?: boolean;
}

export function SettingsModal({
  isOpen,
  onClose,
  onBackupWallet,
  onLogout,
}: SettingsModalProps) {
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [isAddressManagerOpen, setIsAddressManagerOpen] = useState(false);
  const [isConnectedSitesOpen, setIsConnectedSitesOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const { openUpgrade } = useUpgrade();
  const { hasWalletPassword } = useSphereContext();

  // Show the active address's current plan in the row subtitle, e.g. "Free plan".
  const util = useUtilization();
  const planName = util.data?.plan?.name;
  const subscriptionSubtitle = planName
    ? `${planName.charAt(0).toUpperCase()}${planName.slice(1)} plan`
    : 'Manage your plan';

  return (
    <>
      <WalletScreen isOpen={isOpen} onClose={onClose}>
        <ModalHeader variant="screen" title="Settings" icon={Settings} iconVariant="neutral" onClose={onClose} />

        <div className="px-4 py-6 space-y-2 flex-1 overflow-y-auto">
          <MenuButton
            icon={AtSign}
            color="purple"
            label="Address Manager"
            onClick={() => {
              onClose();
              setIsAddressManagerOpen(true);
            }}
          />

          <MenuButton
            icon={Key}
            color="orange"
            label="My Public Keys"
            onClick={() => {
              onClose();
              setIsLookupOpen(true);
            }}
          />

          <MenuButton
            icon={Link}
            color="neutral"
            label="Connected Sites"
            onClick={() => setIsConnectedSitesOpen(true)}
          />

          {SUBSCRIPTION_ENABLED && (
            <MenuButton
              icon={CreditCard}
              color="orange"
              label="Subscription"
              subtitle={subscriptionSubtitle}
              onClick={() => setIsSubscriptionOpen(true)}
            />
          )}

          <MenuButton
            icon={ShieldCheck}
            color="orange"
            label="Security"
            subtitle={hasWalletPassword ? 'Password set' : 'Set a password, auto-lock'}
            onClick={() => {
              onClose();
              setIsSecurityOpen(true);
            }}
          />

          <MenuButton
            icon={Download}
            color="green"
            label="Backup Wallet"
            subtitle={undefined}
            showChevron={false}
            onClick={() => {
              // Drill-in: open Backup ON TOP of Settings (which stays mounted
              // behind) instead of closing Settings at the same time. Closing
              // Settings here made its slide-out panel cross the Backup panel's
              // slide-in (both animate from the right) — a jarring "two panels
              // passing through each other" effect. Closing Backup returns here.
              onBackupWallet();
            }}
          />

          <MenuButton
            icon={LogOut}
            color="red"
            label="Logout"
            danger
            onClick={() => {
              onClose();
              onLogout();
            }}
          />
        </div>
      </WalletScreen>

      <LookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
      />

      <AddressManagerModal
        isOpen={isAddressManagerOpen}
        onClose={() => setIsAddressManagerOpen(false)}
      />

      <ConnectedSitesModal
        isOpen={isConnectedSitesOpen}
        onClose={() => setIsConnectedSitesOpen(false)}
      />

      <SubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        onUpgrade={() => { setIsSubscriptionOpen(false); openUpgrade('settings'); }}
      />

      <SecurityModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
      />
    </>
  );
}
