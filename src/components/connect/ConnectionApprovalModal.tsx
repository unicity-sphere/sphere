import { useState, useEffect } from 'react';
import { Plug, Shield, Globe, AlertTriangle } from 'lucide-react';
import { PERMISSION_SCOPES } from '@unicitylabs/sphere-sdk/connect';
import type { PermissionScope } from '@unicitylabs/sphere-sdk/connect';
import { BaseModal, ModalHeader, Button } from '../wallet/ui';
import { classifyAgentOrigin } from '../../config/agentOrigins';
import { useConnectContext } from './ConnectContext';

function hostOf(value: string): string | null {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSION_SCOPES.IDENTITY_READ]: 'View identity',
  [PERMISSION_SCOPES.BALANCE_READ]: 'View balance',
  [PERMISSION_SCOPES.TOKENS_READ]: 'View tokens',
  [PERMISSION_SCOPES.HISTORY_READ]: 'View history',
  [PERMISSION_SCOPES.EVENTS_SUBSCRIBE]: 'Subscribe to events',
  [PERMISSION_SCOPES.RESOLVE_PEER]: 'Resolve addresses',
  [PERMISSION_SCOPES.TRANSFER_REQUEST]: 'Request transfers',
  [PERMISSION_SCOPES.DM_REQUEST]: 'Send direct messages',
  [PERMISSION_SCOPES.DM_READ]: 'Read direct messages',
  [PERMISSION_SCOPES.PAYMENT_REQUEST]: 'Payment requests',
  [PERMISSION_SCOPES.SIGN_REQUEST]: 'Sign messages',
  [PERMISSION_SCOPES.MINT_REQUEST]: 'Request minting',
};

export function ConnectionApprovalModal() {
  const { pendingApproval, approveConnection, denyConnection } = useConnectContext();
  const [selected, setSelected] = useState<Set<PermissionScope>>(new Set());

  // Initialize the selected permissions whenever a new approval arrives.
  // identity:read is always granted. (Effect — not setState during render.)
  useEffect(() => {
    if (!pendingApproval) {
      setSelected(new Set());
      return;
    }
    const initial = new Set(pendingApproval.permissions);
    initial.add(PERMISSION_SCOPES.IDENTITY_READ as PermissionScope);
    setSelected(initial);
  }, [pendingApproval]);

  if (!pendingApproval) return null;

  const { dapp, permissions, origin } = pendingApproval;

  // Trust is anchored to the transport-verified origin, never to dApp-supplied
  // metadata. `untrusted` (anything not on the curated allowlist) gets a plain
  // warning; a reported-url host that disagrees with the verified origin is a
  // spoofing signal and gets its own callout.
  const isTrusted = classifyAgentOrigin(origin) === 'trusted';
  const reportedHost = hostOf(dapp.url);
  const verifiedHost = hostOf(origin);
  const hostMismatch =
    reportedHost !== null && verifiedHost !== null && reportedHost !== verifiedHost;

  const togglePermission = (perm: PermissionScope) => {
    if (perm === PERMISSION_SCOPES.IDENTITY_READ) return; // always granted
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
      } else {
        next.add(perm);
      }
      return next;
    });
  };

  const handleApprove = () => {
    approveConnection([...selected]);
    setSelected(new Set());
  };

  const handleDeny = () => {
    denyConnection();
    setSelected(new Set());
  };

  return (
    <BaseModal isOpen={true} onClose={handleDeny}>
      <ModalHeader
        title="Connect dApp"
        subtitle={verifiedHost ?? origin}
        icon={Plug}
        onClose={handleDeny}
      />

      <div className="relative z-10 px-6 py-5 overflow-y-auto flex-1">
        {/* Trust anchor: the transport-verified origin (not dApp-supplied). */}
        <div
          data-testid="connect-verified-origin"
          className="flex items-center gap-3 mb-3 p-3 bg-neutral-50 dark:bg-white/4 rounded-xl"
        >
          <Globe className="w-5 h-5 text-neutral-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-neutral-400">Site (verified)</div>
            <div className="font-mono text-sm text-neutral-900 dark:text-white break-all">{origin}</div>
          </div>
        </div>

        {/* dApp-reported metadata — untrusted decoration, clearly labelled. */}
        <div className="flex items-center gap-3 mb-3 p-3 rounded-xl border border-neutral-200/70 dark:border-white/8">
          {dapp.icon && (
            <img src={dapp.icon} alt="" className="w-8 h-8 rounded-lg shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-neutral-400">Site says its name is</div>
            <div className="font-medium text-neutral-700 dark:text-white/80 truncate">{dapp.name}</div>
            {dapp.description && (
              <div className="text-xs text-neutral-500 dark:text-white/45 truncate">{dapp.description}</div>
            )}
          </div>
        </div>

        {hostMismatch && (
          <div
            data-testid="connect-origin-mismatch"
            className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-red-500/10 text-red-700 dark:text-red-300"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="text-xs">
              This site claims to be <span className="font-mono">{reportedHost}</span> but is actually
              loaded from <span className="font-mono">{verifiedHost}</span>. Do not connect unless you
              trust it.
            </div>
          </div>
        )}

        {!isTrusted && !hostMismatch && (
          <div
            data-testid="connect-origin-warning"
            className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="text-xs">
              Sphere can't verify this site. Only connect if you trust the address above.
            </div>
          </div>
        )}

        {/* Permissions */}
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-neutral-500" />
          <span className="text-sm font-medium text-neutral-700 dark:text-white/65">Permissions</span>
        </div>

        <div className="space-y-2">
          {permissions.map((perm) => {
            const isIdentity = perm === PERMISSION_SCOPES.IDENTITY_READ;
            return (
              <label
                key={perm}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-white/4 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(perm)}
                  onChange={() => togglePermission(perm)}
                  disabled={isIdentity}
                  className="w-4 h-4 rounded accent-orange-500"
                />
                <span className={`text-sm ${isIdentity ? 'text-neutral-400' : 'text-neutral-700 dark:text-white/65'}`}>
                  {PERMISSION_LABELS[perm] ?? perm}
                </span>
                {isIdentity && (
                  <span className="text-xs text-neutral-400 ml-auto">Always granted</span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="relative z-10 px-6 py-4 border-t border-neutral-200/50 dark:border-white/8 flex gap-3 shrink-0">
        <Button variant="secondary" fullWidth onClick={handleDeny}>
          Deny
        </Button>
        <Button variant="success" fullWidth onClick={handleApprove}>
          Connect
        </Button>
      </div>
    </BaseModal>
  );
}
