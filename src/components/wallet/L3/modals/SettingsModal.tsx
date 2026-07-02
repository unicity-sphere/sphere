import { useState } from 'react';
import { Settings, Download, LogOut, Key, AtSign, Link, CreditCard } from 'lucide-react';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader, MenuButton } from '../../ui';
import { LookupModal } from './LookupModal';
import { AddressManagerModal } from './AddressManagerModal';
import { ConnectedSitesModal } from './ConnectedSitesModal';
import { SubscriptionModal } from './SubscriptionModal';
import { showToast } from '../../../ui/toast-utils';

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

          <MenuButton
            icon={CreditCard}
            color="orange"
            label="Subscription"
            subtitle="Manage your plan"
            onClick={() => setIsSubscriptionOpen(true)}
          />

          <MenuButton
            icon={Download}
            color="green"
            label="Backup Wallet"
            subtitle={undefined}
            showChevron={false}
            onClick={() => {
              onClose();
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
        onUpgrade={() => showToast('Upgrade coming soon', 'info')}
      />
    </>
  );
}
