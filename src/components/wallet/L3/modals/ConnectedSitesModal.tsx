import { useState, useEffect, useCallback } from 'react';
import { Globe, Trash2, Link } from 'lucide-react';
import { NETWORKS } from '@unicitylabs/sphere-sdk';
import { SPHERE_NETWORK } from '../../../../config/network';
import { ModalHeader, EmptyState, AlertMessage } from '../../ui';
import { WalletScreen } from '../../ui/WalletScreen';
import {
  getApprovedOrigins,
  revokeApprovedOrigin,
  type ApprovedOriginEntry,
} from '../../../../utils/connected-sites';
import {
  clearSwitchPromptSuppression,
  getSuppressedOrigins,
} from '../../../../utils/network-switch-prompts';

interface ConnectedSitesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SiteEntry {
  origin: string;
  data: ApprovedOriginEntry;
}

function formatLastSeen(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getFaviconUrl(origin: string): string {
  return `${origin}/favicon.ico`;
}

export function ConnectedSitesModal({ isOpen, onClose }: ConnectedSitesModalProps) {
  const [sites, setSites] = useState<SiteEntry[]>([]);

  const loadSites = useCallback(() => {
    const origins = getApprovedOrigins();
    const entries = Object.entries(origins)
      .map(([origin, data]) => ({ origin, data }))
      .sort((a, b) => b.data.lastSeenAt - a.data.lastSeenAt);
    setSites(entries);
  }, []);

  // Origins whose "switch networks?" prompt the user muted, on the ACTIVE network. Just the
  // origins: a row says the site is muted, and Unmute forgets every target of it.
  const [muted, setMuted] = useState<string[]>([]);
  // The origins whose Unmute the store refused, so each row that is still there can say why. A
  // list, not one slot: a message belongs to the origin it is about, so unmuting a DIFFERENT site
  // must not clear it and a second failure must not replace it.
  const [unmuteFailed, setUnmuteFailed] = useState<string[]>([]);

  const loadMuted = useCallback(() => {
    setMuted(Object.keys(getSuppressedOrigins()).sort());
    setUnmuteFailed([]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSites();
      loadMuted();
    }
  }, [isOpen, loadSites, loadMuted]);

  const handleRevoke = useCallback((origin: string) => {
    revokeApprovedOrigin(origin);
    setSites((prev) => prev.filter((s) => s.origin !== origin));
  }, []);

  const handleUnmute = useCallback((origin: string) => {
    const cleared = clearSwitchPromptSuppression(origin);
    // Whatever the store holds NOW, never an optimistic filter of the old list.
    const held = Object.keys(getSuppressedOrigins());
    if (cleared) {
      setMuted(held.sort());
      // This origin's own message is settled, and so is any whose row is no longer listed.
      // Every other origin's message stays while that origin is still muted.
      setUnmuteFailed((prev) => prev.filter((o) => o !== origin && held.includes(o)));
      return;
    }
    // A failed clear is the serious direction: the mute the user asked to remove is still
    // standing. The row stays, and says so. The re-read is NOT trusted to drop it, because
    // when storage cannot be read it lists nothing, the very picture a successful removal
    // leaves. Rows already listed are kept, and anything the store does report is added.
    setMuted((prev) => [...new Set([...prev, ...held])].sort());
    setUnmuteFailed((prev) => (prev.includes(origin) ? prev : [...prev, origin]));
  }, []);

  return (
    <WalletScreen isOpen={isOpen} onClose={onClose}>
      <ModalHeader variant="screen" title="Connected Sites" icon={Link} iconVariant="neutral" onClose={onClose} />

      <div className="overflow-y-auto flex-1 p-4">
        {sites.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No connected sites"
            description="Sites you connect to will appear here"
          />
        ) : (
          <div className="space-y-2">
            {sites.map(({ origin, data }) => (
              <div
                key={origin}
                className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-white/4 rounded-2xl"
              >
                {/* Favicon */}
                <div className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-white/8 flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src={data.dapp.icon || getFaviconUrl(origin)}
                    alt=""
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                      (e.currentTarget.parentElement as HTMLElement).innerHTML =
                        `<span class="text-xs font-bold text-neutral-400">${origin.replace(/^https?:\/\//, '').charAt(0).toUpperCase()}</span>`;
                    }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                    {data.dapp.name || origin.replace(/^https?:\/\//, '')}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-white/45 truncate">
                    {origin.replace(/^https?:\/\//, '')}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-white/30 mt-0.5">
                    Last seen {formatLastSeen(data.lastSeenAt)}
                  </p>
                </div>

                {/* Disconnect button */}
                <button
                  onClick={() => handleRevoke(origin)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors shrink-0"
                  title="Disconnect"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Sites the user told "do not ask again" on the network-switch prompt. A separate
            store from the approvals above, so nothing here connects or disconnects a site. */}
        {muted.length > 0 && (
          <section className="mt-6">
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-white/45">
              Muted network prompts
            </h3>
            {/* The store is scoped per network, and the accept path writes a mute on the network the
                user just LEFT. Without this the list reads as every mute the wallet holds. The name
                comes from the wallet's own table, for the network this session runs on. */}
            <p
              data-testid="muted-prompts-network"
              className="px-1 mt-0.5 mb-2 text-xs text-neutral-500 dark:text-white/45"
            >
              Muted on {NETWORKS[SPHERE_NETWORK].name}. A mute made on another network is listed when the
              wallet is on that network.
            </p>

            <div className="space-y-2">
              {muted.map((origin) => (
                <div key={origin}>
                  <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-white/4 rounded-2xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate" title={origin}>
                        {origin}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-white/45">
                        Will not ask to switch networks
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnmute(origin)}
                      aria-label={`Unmute ${origin}`}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 transition-colors shrink-0"
                    >
                      Unmute
                    </button>
                  </div>

                  {/* Under the row it is about, and kept while THAT origin is still muted. */}
                  {unmuteFailed.includes(origin) && (
                    <div role="alert" className="mt-1">
                      <AlertMessage variant="error">
                        Could not unmute {origin}. The change was not saved, so it is still muted.
                      </AlertMessage>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </WalletScreen>
  );
}
