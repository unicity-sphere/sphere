import { useState } from 'react';
import { Settings, Layers, Download, LogOut, Key, AtSign, Link, Cloud } from 'lucide-react';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader, MenuButton } from '../../ui';
import { LookupModal } from './LookupModal';
import { AddressManagerModal } from './AddressManagerModal';
import { ConnectedSitesModal } from './ConnectedSitesModal';
import { VaultSettingsModal } from './VaultSettingsModal';
import { getVaultStore, DEFAULT_VAULT_STORE } from '../../../../config/vaultStore';

function vaultSubtitle(): string {
  const setting = getVaultStore() ?? DEFAULT_VAULT_STORE;
  if (setting.mode === 'off') return 'Off';
  if (setting.mode === 'custom') return 'Custom server';
  return 'Default (Unicity)';
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenL1Wallet: () => void;
  onBackupWallet: () => void;
  onLogout: () => void;
  l1Balance?: string;
  hasMnemonic?: boolean;
}

export function SettingsModal({
  isOpen,
  onClose,
  onOpenL1Wallet,
  onBackupWallet,
  onLogout,
  l1Balance,
}: SettingsModalProps) {
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [isAddressManagerOpen, setIsAddressManagerOpen] = useState(false);
  const [isConnectedSitesOpen, setIsConnectedSitesOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  return (
    <>
      <WalletScreen isOpen={isOpen} onClose={onClose}>
        <ModalHeader variant="screen" title="Settings" icon={Settings} iconVariant="neutral" onClose={onClose} />

        <div className="px-4 py-6 space-y-2 flex-1 overflow-y-auto">
          <MenuButton
            icon={Layers}
            color="blue"
            label="L1 Wallet"
            subtitle={l1Balance ? `${l1Balance} ALPHA` : undefined}
            onClick={() => {
              onClose();
              onOpenL1Wallet();
            }}
          />

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
            icon={Cloud}
            color="blue"
            label="Vault"
            subtitle={vaultSubtitle()}
            onClick={() => setIsVaultOpen(true)}
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

      <VaultSettingsModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
      />
    </>
  );
}
