import { useState, useEffect } from 'react';
import { Plug } from 'lucide-react';
import { PERMISSION_SCOPES } from '@unicitylabs/sphere-sdk/connect';
import type { PermissionScope } from '@unicitylabs/sphere-sdk/connect';
import { AlertMessage, BaseModal, Button, DetailRow, DetailsDisclosure, ModalHeader } from '../wallet/ui';
import { classifyAgentOrigin } from '../../config/agentOrigins';
import { useConnectContext } from './ConnectContext';
import { VerifiedOrigin } from './VerifiedOrigin';
import { ACCESS_COPY, describableScopes, splitScopes } from './permissionCopy';

function hostOf(value: string): string | null {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/**
 * The question this screen asks is "does this site get to use your wallet?", and the two group
 * headings are what let someone answer it in two seconds instead of auditing eight rows: one
 * group is read silently for as long as the session lives, the other cannot happen without
 * another prompt. Both are derived from the SDK's own tables, so the headings are true by
 * construction rather than by copywriting.
 *
 * TRUST. The transport-verified origin is the heading, and it is the only identity on the screen.
 * Everything the site says about itself — its name, its description, the address it reports —
 * sits behind a disclosure labelled as a claim, because no caption can stop a name set beside an
 * icon from reading as identity. Its icon is not shown at all: an icon is the most identity-like
 * element a consent screen can carry, it is chosen by whoever is asking, it can be a pixel-exact
 * bank logo, and loading it would fetch a remote image into wallet chrome. Moving it into the
 * disclosure would keep both problems, since expanding still fires the request.
 *
 * On colour: the muted trust sentence below the origin is NOT an alert, deliberately.
 * TRUSTED_AGENT_ORIGINS is empty, so it is the baseline truth of every real connection, and a
 * warning that fires every single time is wallpaper. Amber and red are kept for the one genuine
 * anomaly — a site loaded from an address that is not the one it claims.
 */
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
    // Seeded from DESCRIBABLE scopes only. A scope with no ACCESS_COPY entry is neither shown nor
    // granted: granting something the user was never shown is not consent, and the label map this
    // replaced fell back to printing the raw scope id at them instead.
    const initial = new Set(describableScopes(pendingApproval.permissions));
    initial.add(PERMISSION_SCOPES.IDENTITY_READ as PermissionScope);
    setSelected(initial);
  }, [pendingApproval]);

  if (!pendingApproval) return null;

  const { dapp, permissions, origin } = pendingApproval;

  // Trust is anchored to the transport-verified origin, never to dApp-supplied
  // metadata. `untrusted` (anything not on the curated allowlist) gets the plain
  // note; a reported-url host that disagrees with the verified origin is a
  // spoofing signal and gets the alert.
  const isTrusted = classifyAgentOrigin(origin) === 'trusted';
  const reportedHost = hostOf(dapp.url);
  const verifiedHost = hostOf(origin);
  const hostMismatch =
    reportedHost !== null && verifiedHost !== null && reportedHost !== verifiedHost;

  const { silent, prompted } = splitScopes(permissions);

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
        title="Connection request"
        icon={Plug}
        iconVariant="gradient"
        onClose={handleDeny}
        closeLabel="Deny"
      />

      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center gap-6 px-6 py-6">
          <div className="space-y-2">
            <VerifiedOrigin origin={origin} testId="connect-verified-origin" size="lg" />
            {hostMismatch ? (
              // The one genuine anomaly, and the only place red fires on this screen.
              // AlertMessage forwards no testid, so it goes on this wrapper.
              <div data-testid="connect-origin-mismatch" role="alert">
                <AlertMessage variant="error" title="This is not the site it claims to be">
                  It calls itself <span className="font-mono">{reportedHost}</span>, but it is
                  loaded from <span className="font-mono">{verifiedHost}</span>. Connect only if you
                  trust <span className="font-mono">{verifiedHost}</span>.
                </AlertMessage>
              </div>
            ) : isTrusted ? (
              <p className="text-xs text-neutral-500 dark:text-white/45">A first-party Sphere site.</p>
            ) : (
              // Replaces a "(verified)" badge that sat above a warning saying the site could not
              // be verified. Both were true of DIFFERENT things — the address is confirmed,
              // whoever runs it is not — and one word doing two jobs on the screen where someone
              // hands over access to money is the worst place for it. Said in one line, because
              // a paragraph here is a paragraph nobody reads.
              <p
                data-testid="connect-origin-warning"
                className="text-xs text-neutral-500 dark:text-white/45"
              >
                Sphere checked the address, not who runs it.
              </p>
            )}
          </div>

          {silent.length > 0 && (
            <PermissionGroup
              title="Reads without asking"
              scopes={silent}
              selected={selected}
              onToggle={togglePermission}
              testId="connect-permissions-silent"
            />
          )}
          {prompted.length > 0 && (
            <PermissionGroup
              title="Asks you every time"
              scopes={prompted}
              selected={selected}
              onToggle={togglePermission}
              testId="connect-permissions-prompted"
            />
          )}

          <DetailsDisclosure label="Details about this site" testId="connect-dapp-details">
            <DetailRow label="Sphere cannot check any of this">A site can put anything here.</DetailRow>
            <DetailRow label="It calls itself">{dapp.name}</DetailRow>
            {dapp.description && <DetailRow label="Its description">{dapp.description}</DetailRow>}
            {dapp.url && <DetailRow label="The web address it reports" mono>{dapp.url}</DetailRow>}
            {/* Joined into ONE value on purpose: no node's exact text is a bare scope id, so an
                assertion that a raw scope name never reaches the user cannot be satisfied by this
                developer list. */}
            <DetailRow label="Permission names" mono>{[...new Set(permissions)].join(', ')}</DetailRow>
            <DetailRow label="Afterwards">
              Approvals are per network. You can disconnect this site any time in Connected Sites.
            </DetailRow>
          </DetailsDisclosure>
        </div>
      </div>

      <div className="relative z-10 px-6 py-4 border-t border-neutral-200/50 dark:border-white/8 shrink-0 flex gap-3">
        <Button variant="secondary" fullWidth onClick={handleDeny}>
          Deny
        </Button>
        {/* Primary, not success. Green reads "safe, proceed", and nothing on this screen has been
            established as safe; orange is the wallet's affirmative action everywhere else. */}
        <Button variant="primary" fullWidth onClick={handleApprove}>
          Connect
        </Button>
      </div>
    </BaseModal>
  );
}

interface PermissionGroupProps {
  title: string;
  scopes: PermissionScope[];
  selected: Set<PermissionScope>;
  onToggle: (perm: PermissionScope) => void;
  testId: string;
}

/**
 * The heading IS the rule, and it is the whole of it — there is no explanatory line under it.
 * The pair it forms with the other group's heading is the one thing a reader has to take from
 * this screen, so it is stated once, in the verb: reads against asks you. A sentence repeating
 * the heading in longer words is what turns a consent screen into something nobody reads.
 *
 * For the same reason a row's second line says only what the group heading does not already
 * cover — what the site gets to choose — and the rows that have one are therefore physically
 * taller than the rest. That asymmetry is the signal: no colour, no badge, no icon.
 */
function PermissionGroup({ title, scopes, selected, onToggle, testId }: PermissionGroupProps) {
  return (
    <section data-testid={testId}>
      <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-white/30">
        {title}
      </h4>
      <div className="space-y-2">
        {scopes.map((perm) => {
          const copy = ACCESS_COPY[perm];
          const isIdentity = perm === PERMISSION_SCOPES.IDENTITY_READ;
          return (
            <label
              key={perm}
              className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-neutral-50 dark:bg-white/4
                         hover:bg-neutral-100 dark:hover:bg-white/8 transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(perm)}
                disabled={isIdentity}
                onChange={() => onToggle(perm)}
                className="w-4 h-4 mt-0.5 shrink-0 rounded accent-orange-500"
              />
              {/* Value first, muted caption under — never an uppercase caption above a value. */}
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-neutral-900 dark:text-white">{copy.title}</span>
                {copy.consequence && (
                  <span className="block mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-white/45">
                    {copy.consequence}
                  </span>
                )}
              </span>
              {isIdentity && (
                <span
                  className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full
                             bg-neutral-200/70 dark:bg-white/8 text-neutral-500 dark:text-white/45"
                >
                  Always granted
                </span>
              )}
            </label>
          );
        })}
      </div>
    </section>
  );
}
