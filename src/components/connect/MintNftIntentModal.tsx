import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { NftMediaRef } from '@unicitylabs/sphere-sdk';
import { AlertTriangle, ImagePlus, ShieldCheck, ShieldQuestionMark } from 'lucide-react';
import { ERROR_CODES } from '@unicitylabs/sphere-sdk/connect';
import { BaseModal, ModalHeader, Button } from '../wallet/ui';
import { NftResolvedContentDetails } from '../wallet/shared/nft/NftDetails';
import { NftMediaDisplayContext, type NftMediaDisplayStatus } from '../wallet/shared/nft/mediaDisplay';
import { useConnectContext } from './ConnectContext';
import type { MintNftParams } from './intentValidation';
import { getPayments } from '../../sdk/payments';
import { getErrorMessage } from '../../sdk/errors';
import { useSphereContext } from '../../sdk';
import {
  NFT_PREVIEW_WAIT_MS,
  useNftPreviewState,
  type NftMediaDisplays,
} from '../../sdk/hooks/payments/useNftPreviewState';
import { truncateId } from '../../utils/identifiers';

/** Shown once part of the preview ended up not shown, for a signed mint and an unsigned one. */
const UNSHOWN_SIGNED = 'Some of this NFT could not be shown — minting will sign it without it having been shown to you';
const UNSHOWN_UNSIGNED = 'Some of this NFT could not be shown — it will be minted without having been shown to you';

/**
 * The refusal for an NFT mint that failed AFTER it was journaled. The wallet
 * resumes a journaled mint, so it may still complete — the dApp is told that, and
 * given the token id to reconcile against rather than asking again.
 */
function journaledNftMintMessage(tokenId: string, error: string | undefined): string {
  const reason = error ? ` (${error})` : '';
  return `The NFT mint has not finished${reason}, but it may still complete: this wallet resumes it. Token ID: ${tokenId}`;
}

/**
 * The refusal for an NFT mint that THREW instead of answering. Nothing says whether
 * it was journaled before it threw, and a journaled mint resumes on its own, so its
 * outcome is unknown — and asking again could mint a second NFT.
 */
function unknownNftMintMessage(error: string): string {
  return `The NFT mint may have started and may still complete (${error}). Check this wallet's Tokens tab before trying again.`;
}

/**
 * What signing will mean for an NFT that does not exist yet. Deliberately NOT a
 * signature status: there is no signature to verify before the mint.
 */
function MintSignLine({ sign }: { sign: boolean }) {
  if (sign) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        You will be its creator — signed with your wallet key
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
      <ShieldQuestionMark className="h-3.5 w-3.5 shrink-0" />
      Unsigned — anyone could mint an identical token
    </p>
  );
}

/** This intent's mint: whether it runs, and whether it has already settled the intent. */
interface NftMintRun {
  running: boolean;
  settled: boolean;
  error: string | null;
}

const IDLE: NftMintRun = { running: false, settled: false, error: null };

interface MintNftIntentModalProps {
  intentId: number;
  origin: string;
  request: MintNftParams;
  subscriptionKeyReady: boolean;
  onCancel: () => void;
}

/**
 * The `mint_nft` confirmation (Connect 2.3, #785). Render it keyed by the intent:
 * the one-mint guard, the preview wait and the settle-shield arming below hold for
 * one intent each.
 */
export function MintNftIntentModal({ intentId, origin, request, subscriptionKeyReady, onCancel }: MintNftIntentModalProps) {
  const { resolveIntent, rejectIntent, armIntentShield } = useConnectContext();
  const { sphere } = useSphereContext();
  const [run, setRun] = useState<NftMintRun>(IDLE);
  // Set before the mint's first await: one mint per intent, whatever lands before a re-render.
  const mintStarted = useRef(false);

  // What each media element in the preview reported — the browser's own verdict on
  // bytes that passed every check. A functional update, so two elements reporting in
  // the same tick both land.
  const [displays, setDisplays] = useState<NftMediaDisplays>(() => new Map());
  const reportDisplay = useCallback((media: NftMediaRef, status: NftMediaDisplayStatus) => {
    setDisplays((current) => (current.get(media) === status ? current : new Map(current).set(media, status)));
  }, []);
  const preview = useNftPreviewState(request.content, displays);

  // Mint waits until the preview is on screen — the user cannot approve what they have
  // not seen: linked content fetched, and every media item displayed by its element.
  // But only for so long: a host can accept the request and never finish it, and an
  // element can neither load nor fail, and that must not make the intent impossible to
  // approve. Past the wait, what is not displayed counts as not shown: Mint is offered
  // with the warning, and the preview still fills in if the content arrives after all.
  const [waitedOut, setWaitedOut] = useState(false);
  useEffect(() => {
    if (!preview.loading || waitedOut) return;
    const timer = setTimeout(() => setWaitedOut(true), NFT_PREVIEW_WAIT_MS);
    return () => clearTimeout(timer);
  }, [preview.loading, waitedOut]);
  const waiting = preview.loading && !waitedOut;

  // THE INVARIANT (ConnectContext.armIntentShield): the settle window measures from
  // the moment ACTIONABLE UI is presented. While Mint waits for the preview it is
  // disabled, so the moment it becomes actionable — everything shown, or the wait
  // over — is a fresh presentation, armed ONCE: it is a primary button enabling under
  // a cursor that may already rest on it. A LAYOUT effect, so the shield is up in the
  // same paint. A preview with nothing to wait for is actionable on arrival, and the
  // provider's arrival arm already covers it.
  const waitedForPreview = useRef(false);
  const armedAfterPreview = useRef(false);
  useLayoutEffect(() => {
    if (waiting) {
      waitedForPreview.current = true;
      return;
    }
    if (!waitedForPreview.current || armedAfterPreview.current) return;
    armedAfterPreview.current = true;
    armIntentShield();
  }, [waiting, armIntentShield]);

  // Once the mint runs, "the user declined" is no longer a true answer — the NFT may
  // be minted either way — so nothing here can settle the intent a second time.
  const locked = run.running || run.settled;
  const close = locked ? () => {} : onCancel;

  const handleMintNft = async () => {
    if (mintStarted.current) return;
    const payments = getPayments(sphere);
    if (!payments) {
      setRun({ ...IDLE, error: 'Wallet not available' });
      return;
    }
    // Mint is a certification_request — refuse until the subscription key is on
    // the oracle (else it 401s in the provisioning window). Reject gracefully.
    if (!subscriptionKeyReady) {
      rejectIntent(intentId, ERROR_CODES.INTERNAL_ERROR, 'Subscription is still being set up — try again in a moment');
      return;
    }

    mintStarted.current = true;
    setRun({ running: true, settled: false, error: null });
    try {
      const result = await payments.mintNft({ content: request.content, sign: request.sign });
      if (result.success && result.tokenId !== undefined) {
        resolveIntent(intentId, { tokenId: result.tokenId });
      } else if (result.tokenId !== undefined) {
        // Journaled before it failed: the wallet resumes it, so it may still complete.
        rejectIntent(
          intentId,
          ERROR_CODES.INTERNAL_ERROR,
          journaledNftMintMessage(result.tokenId, result.error),
          { tokenId: result.tokenId },
        );
      } else {
        // Refused before anything was journaled or minted (a value rule, the size cap):
        // nothing started, so the dApp may safely ask again.
        rejectIntent(intentId, ERROR_CODES.INTERNAL_ERROR, result.error ?? 'NFT mint failed');
      }
      setRun({ running: false, settled: true, error: null });
    } catch (err) {
      // A throw is not an answer: the mint may have been journaled before it threw,
      // and a journaled mint resumes by itself. So the outcome is unknown — settled
      // now, and never offered again, because a retry would mint a second NFT.
      const message = unknownNftMintMessage(getErrorMessage(err));
      rejectIntent(intentId, ERROR_CODES.INTENT_OUTCOME_UNKNOWN, message);
      setRun({ running: false, settled: true, error: message });
    }
  };

  // Not shown: refused, unavailable, failed to display, or — once the wait is over — still not on screen.
  const unshown = !waiting && (preview.unavailable || preview.loading);

  return (
    <BaseModal isOpen={true} onClose={close}>
      <ModalHeader title="Mint NFT" icon={ImagePlus} onClose={close} closeDisabled={locked} />

      <div className="relative z-10 px-6 py-5 overflow-y-auto flex-1">
        <div className="text-sm text-neutral-500 mb-1">
          This dApp is asking to mint an NFT{' '}
          <span className="text-neutral-900 dark:text-white font-medium">to your own wallet</span>.
        </div>
        <div className="text-xs text-neutral-400 mb-4 break-all">
          Requested by{' '}
          <span className="font-mono text-neutral-700 dark:text-neutral-300">{origin}</span>
        </div>

        {/* The NFT views are drawn for a dark panel (TokenDataModal's), so the
            preview keeps one in both themes. Its height is FIXED: media — and a hosted
            metadata document — loads on the dApp's timing, often after the settle shield
            drops, and a preview that grew would move Mint under a cursor aimed at Cancel.
            Taller content scrolls, and the warning below appears INSIDE the box for the
            same reason. A document link is fetched and checked exactly as the token detail
            view does; what is minted, and signed, is still the dApp's content — the link
            that pins the document. */}
        <section
          aria-label="NFT preview"
          data-testid="nft-mint-preview"
          className="mb-4 h-80 space-y-3 overflow-y-auto overscroll-contain rounded-2xl bg-neutral-900 p-4 text-white"
        >
          {unshown && (
            <p role="alert" className="flex items-start gap-1.5 text-xs text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {request.sign ? UNSHOWN_SIGNED : UNSHOWN_UNSIGNED}
            </p>
          )}
          <NftMediaDisplayContext.Provider value={reportDisplay}>
            <NftResolvedContentDetails content={request.content} fallbackTitle="NFT" />
          </NftMediaDisplayContext.Provider>
        </section>

        {/* Known from the content itself, so it is there from the first paint: what the
            link names does not wait for — or depend on — the document loading. */}
        {preview.documentLink && (
          <p className="mb-2 text-xs text-neutral-500 break-all">
            {`Metadata document: ${preview.documentLink.uri} · SHA-256 ${truncateId(preview.documentLink.sha256)}`}
          </p>
        )}

        <MintSignLine sign={request.sign} />
      </div>

      <div className="relative z-10 px-6 py-4 border-t border-neutral-200/50 dark:border-white/8 shrink-0">
        {run.error && <div className="text-red-500 text-sm mb-3 text-center">{run.error}</div>}
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onCancel} disabled={locked}>
            Cancel
          </Button>
          <Button variant="primary" fullWidth disabled={locked || waiting} onClick={handleMintNft}>
            {run.running ? 'Minting…' : 'Mint'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
}
