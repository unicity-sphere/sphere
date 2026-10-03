import { Unplug } from 'lucide-react';
import { BaseModal, Button, DetailRow, DetailsDisclosure, ModalHeader } from '../wallet/ui';
import { VerifiedOrigin } from './VerifiedOrigin';
import {
  connectRejectionDiagnostics,
  describeConnectRejection,
  describeSwitchRefusal,
} from './rejectionMessage';
import type { SwitchRefusal } from './networkSwitchOffer';

/** Lives here so the modal owns its own shape; ConnectPage imports the type. */
export interface ConnectRejection {
  dappName: string;
  code: number;
  message: string;
  data: Record<string, unknown> | undefined;
  switchRefusal: SwitchRefusal | undefined;
}

interface ConnectRejectionModalProps {
  /** The popup's ?origin= param. Null only in the degenerate case; the copy falls back. */
  origin: string | null;
  rejection: ConnectRejection;
  onClose: () => void;
}

/**
 * Why a site could not connect.
 *
 * THE ORIGIN IS THE SUBJECT, not the name the site chose for itself. The sentence used to open
 * with `dapp.name` in bold — an attacker-chosen string set as the grammatical subject of a
 * statement the wallet is making, which is the exact leak the approval and switch screens are
 * careful about. The name is still here, under "It calls itself", where it reads as a claim.
 *
 * NO AMBER, NO WARNING GLYPH. Nothing is broken and nothing is dangerous: a site built for
 * another network simply cannot connect here. Alarm applied uniformly is a large part of why
 * these screens read as machine-made, and it leaves no colour free for a real anomaly.
 *
 * The numbers go behind the disclosure. An error code is something only a developer can act on,
 * and it sat at the same size and altitude as the explanation — but a developer looking at a
 * popup has no wallet-side console, so it is kept rather than dropped. `rejection.message` is
 * surfaced there for the first time: ConnectPage has always captured it and never rendered it.
 */
export function ConnectRejectionModal({ origin, rejection, onClose }: ConnectRejectionModalProps) {
  const diagnostics = connectRejectionDiagnostics(rejection.data, rejection.code);

  return (
    <BaseModal isOpen={true} onClose={onClose}>
      <ModalHeader title="Unable to connect" icon={Unplug} onClose={onClose} closeLabel="Close" />

      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center gap-4 px-6 py-6">
          <p className="text-sm leading-relaxed text-neutral-900 dark:text-white">
            {origin ? (
              <>
                <VerifiedOrigin origin={origin} as="span" size="sm" testId="connect-rejection-origin" />{' '}
              </>
            ) : (
              <>This site </>
            )}
            {describeConnectRejection(rejection.data)}
          </p>

          {/* Its own paragraph rather than a clause tacked onto the sentence above: it answers a
              different question — not "why did this fail" but "why were you not offered a way
              out of it". */}
          {rejection.switchRefusal && (
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-white/45">
              {describeSwitchRefusal(rejection.switchRefusal)}
            </p>
          )}

          <DetailsDisclosure label="Developer details" testId="connect-rejection-details">
            {diagnostics.map((row) => (
              <DetailRow key={row.label} label={row.label} mono>
                {row.value}
              </DetailRow>
            ))}
            {rejection.message && <DetailRow label="Message">{rejection.message}</DetailRow>}
            <DetailRow label="It calls itself">{rejection.dappName}</DetailRow>
          </DetailsDisclosure>
        </div>
      </div>

      <div className="relative z-10 px-6 py-4 border-t border-neutral-200/50 dark:border-white/8 shrink-0">
        <Button variant="secondary" fullWidth onClick={onClose}>
          Close
        </Button>
      </div>
    </BaseModal>
  );
}
