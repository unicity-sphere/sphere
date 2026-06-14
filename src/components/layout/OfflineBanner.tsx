import { WifiOff } from 'lucide-react';
import { useSphereContext } from '../../sdk/hooks';

/**
 * A thin full-width banner shown when the Nostr peer transport is OFF (full-offline
 * mode — toggled in Settings → Vault). It makes the degraded state explicit: the
 * wallet works local-only, but peer send/receive and messaging are unavailable until
 * Nostr is re-enabled. Renders nothing in the normal (online) case.
 */
export function OfflineBanner() {
  const { nostrEnabled } = useSphereContext();
  if (nostrEnabled) return null;

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span className="text-center">
        Offline mode — peer messaging &amp; delivery are off. Your tokens stay on this device.
        Re-enable Nostr in Settings → Vault.
      </span>
    </div>
  );
}
