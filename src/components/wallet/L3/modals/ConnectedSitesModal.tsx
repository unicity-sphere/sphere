import { useState, useEffect, useCallback } from 'react';
import { Globe, Trash2, Link } from 'lucide-react';
import { ModalHeader, EmptyState } from '../../ui';
import { WalletScreen } from '../../ui/WalletScreen';
import {
  getApprovedOrigins,
  revokeApprovedOrigin,
  type ApprovedOriginEntry,
} from '../../../../utils/connected-sites';

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

  const isExtension = import.meta.env.VITE_PLATFORM === 'extension';

  const loadSites = useCallback(async () => {
    let origins: Record<string, ApprovedOriginEntry>;
    if (isExtension) {
      const resp = await chrome.runtime.sendMessage({ type: 'POPUP_GET_CONNECTED_SITES' });
      origins = (resp?.success && resp.sites) ? resp.sites : {};
    } else {
      origins = getApprovedOrigins();
    }
    const entries = Object.entries(origins)
      .map(([origin, data]) => ({ origin, data }))
      .sort((a, b) => b.data.lastSeenAt - a.data.lastSeenAt);
    setSites(entries);
  }, [isExtension]);

  useEffect(() => {
    if (isOpen) loadSites();
  }, [isOpen, loadSites]);

  const handleRevoke = useCallback((origin: string) => {
    if (isExtension) {
      chrome.runtime.sendMessage({ type: 'POPUP_REVOKE_CONNECTED_SITE', origin }).catch(() => {});
    } else {
      revokeApprovedOrigin(origin);
    }
    setSites((prev) => prev.filter((s) => s.origin !== origin));
  }, [isExtension]);

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
      </div>
    </WalletScreen>
  );
}
