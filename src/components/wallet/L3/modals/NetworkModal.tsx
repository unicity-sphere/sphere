import { useState } from 'react';
import { Globe, Check, ChevronRight, Layers, RefreshCw, AlertTriangle } from 'lucide-react';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader, Button, SecondaryButton } from '../../ui';
import { NETWORKS } from '@unicitylabs/sphere-sdk';
import type { NetworkType } from '@unicitylabs/sphere-sdk';
import {
  NETWORK_DOWNGRADED_FROM,
  SPHERE_NETWORK,
  setActiveNetwork,
  type SupportedNetwork,
} from '../../../../config/network';
import { buildNetworkRows, rowState, unavailableLabel, type RowState } from './networkRows';
import { isTestMoney } from '../../../../config/networkCapabilities';

interface NetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * One-line, user-facing description of each network. Keyed by id with a plain
 * fallback so a network without copy (the 'testnet' alias, or the next network
 * the SDK adds) still reads sensibly rather than rendering an empty line.
 * Written from the holder's side: what the network is, not how it's wired.
 */
const NETWORK_BLURB: Partial<Record<NetworkType, string>> = {
  testnet2: 'Test network — tokens hold no real value',
  mainnet: 'Real assets on the live Unicity network',
};

function blurbFor(id: NetworkType): string {
  return NETWORK_BLURB[id] ?? `${id} network`;
}

/**
 * Colour says what KIND of money a network holds — never which row is selected.
 *
 * Selection had green and "selectable" had blue, so the SAME testnet showed green
 * here and amber on the balance badge, which reads as a status change (green =
 * connected, amber = something wrong) rather than as one network. Colour now means
 * one thing wallet-wide: amber = test money, emerald = real. Which row is current
 * is carried by the check and the word "Current", which is what they are for.
 *
 * Unavailable stays neutral: that is a different axis — the network cannot be used
 * at all — and grey collides with neither meaning.
 */
const UNAVAILABLE_TILE = 'bg-neutral-500/10 text-neutral-400 dark:text-white/30';

function tileFor(state: RowState, id: NetworkType): string {
  if (state === 'unavailable') return UNAVAILABLE_TILE;
  return isTestMoney(id) ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500';
}

export function NetworkModal({ isOpen, onClose }: NetworkModalProps) {
  const [pending, setPending] = useState<SupportedNetwork | null>(null);

  const rows = buildNetworkRows(SPHERE_NETWORK);

  const confirmSwitch = () => {
    // Persists the choice, notifies other tabs, and reloads the page —
    // module-scope consts re-derive from the new network on boot.
    if (pending) setActiveNetwork(pending.id);
  };

  return (
    <WalletScreen isOpen={isOpen} onClose={onClose}>
      <ModalHeader variant="screen" title="Network" icon={Globe} iconVariant="neutral" onClose={onClose} />

      <div className="overflow-y-auto flex-1 p-4 space-y-4">
        {/* The wallet fell back: say so, or an empty wallet on another network
            reads as lost funds. */}
        {NETWORK_DOWNGRADED_FROM && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200/60 dark:border-orange-500/15">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-orange-500" />
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-white/60">
              {NETWORK_DOWNGRADED_FROM} is not available here, so the wallet is on{' '}
              {NETWORKS[SPHERE_NETWORK].name}. Your assets on {NETWORK_DOWNGRADED_FROM} are
              untouched — it reopens there once it is available again.
            </p>
          </div>
        )}

        {/* Isolation note. Deliberately does NOT say "keys": the seed, the derived
            keypair and the DIRECT:// address are the SAME on every network
            (deriveDirectAddress takes no network; base path m/44'/0'/0'), and the
            mnemonic/master key are global storage keys, not network-scoped. Claiming
            otherwise implies a testnet key cannot reach mainnet funds — it is the same
            key. What IS per-network is server-side inventory and the pv2g2:{network}
            scoped KV. */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-neutral-50 dark:bg-white/4">
          <Layers className="w-4 h-4 mt-0.5 shrink-0 text-neutral-400 dark:text-white/35" />
          <p className="text-xs leading-relaxed text-neutral-500 dark:text-white/50">
            Each network keeps its own assets, balances and history. Switching reloads the
            wallet and discards all existing connections to dApps.
          </p>
        </div>

        <div className="space-y-2">
          {rows.map((row) => {
            const state = rowState(row, SPHERE_NETWORK);
            const disabled = state !== 'selectable';

            return (
              <button
                key={row.id}
                disabled={disabled}
                onClick={() => setPending(row)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-colors bg-neutral-50 dark:bg-white/4 ${
                  state === 'selectable'
                    ? 'hover:bg-neutral-100 dark:hover:bg-white/8'
                    : state === 'unavailable'
                      ? 'opacity-60 cursor-not-allowed'
                      : ''
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tileFor(state, row.id)}`}>
                  <Globe className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {row.label}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-white/45 truncate">
                    {blurbFor(row.id)}
                  </p>
                </div>

                {state === 'current' && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-white/70 shrink-0">
                    <Check className="w-4 h-4" />
                    Current
                  </span>
                )}
                {state === 'unavailable' && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-neutral-200/70 dark:bg-white/8 text-neutral-500 dark:text-white/45 shrink-0">
                    {unavailableLabel(row)}
                  </span>
                )}
                {state === 'selectable' && (
                  <ChevronRight className="w-5 h-5 text-neutral-400 dark:text-white/35 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {pending && (
          <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200/60 dark:border-orange-500/15 space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                Switch to {pending.label}?
              </p>
            </div>
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-white/60">
              Balances, history and subscription keys are separate per network. The app will reload.
            </p>
            <div className="flex gap-2">
              <SecondaryButton size="sm" fullWidth onClick={() => setPending(null)}>
                Cancel
              </SecondaryButton>
              <Button size="sm" fullWidth onClick={confirmSwitch}>
                Switch &amp; Reload
              </Button>
            </div>
          </div>
        )}
      </div>
    </WalletScreen>
  );
}
