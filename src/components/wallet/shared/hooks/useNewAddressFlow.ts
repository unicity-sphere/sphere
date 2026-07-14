/**
 * useNewAddressFlow — shared flow for deriving a new address and prompting
 * for a Unicity ID (#413). Used by AddressSelector ("New") and
 * AddressManagerModal ("Derive New Address") via NewAddressModal.
 *
 * Derivation switches the wallet to the new address; the nametag prompt is a
 * follow-up on the already-active address. Skipping leaves the address usable
 * and ID-less.
 *
 * The switch is only trusted once sphere.getCurrentAddressIndex() actually
 * reports the new index: the SDK assigns sphere.identity AFTER awaited
 * network work, so on a slow relay a bare timeout would leave us reading the
 * PREVIOUS address's identity — and registering the ID onto the wrong key.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isValidNametag, normalizeNametag } from '@unicitylabs/sphere-sdk';
import type { Sphere } from '@unicitylabs/sphere-sdk';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { SPHERE_KEYS } from '../../../../sdk/queryKeys';

export type NewAddressStep =
  | 'idle'
  | 'deriving'
  | 'nametag_input'
  | 'registering'
  | 'complete'
  | 'error';

/** 'unknown' = transport could not verify — NOT the same as available. */
export type NametagAvailability = 'idle' | 'checking' | 'available' | 'taken' | 'unknown';

export type NewAddressOutcome = 'registered' | 'recovered' | 'skipped';

export interface NewAddressState {
  step: NewAddressStep;
  /** Fatal derivation error (step === 'error') */
  error: string | null;
  /** Inline registration error (step stays 'nametag_input') */
  registerError: string | null;
  newAddress: { chainPubkey: string; index: number } | null;
  /** Set when step === 'complete' (null for the skipped outcome) */
  completedNametag: string | null;
  outcome: NewAddressOutcome | null;
  /** The switch outlived the quick timeout — surface a "network is slow" hint. */
  slow: boolean;
}

const INITIAL: NewAddressState = {
  step: 'idle',
  error: null,
  registerError: null,
  newAddress: null,
  completedNametag: null,
  outcome: null,
  slow: false,
};

/** How long we wait before showing the "network is slow" hint. */
const SWITCH_QUICK_MS = 5000;
/** Total time the switch may take before we give up with an error. */
const SWITCH_EXTENDED_MS = 30000;
/** Poll interval while waiting for the switch to land (event is the fast path). */
const SWITCH_POLL_MS = 500;

/** Mirrors the SDK's isValidNametag error message (sphere-sdk core/Sphere.ts). */
export const NAMETAG_FORMAT_HINT =
  'Use a-z, 0-9, _ or - (3-20 chars), or a phone number.';

export function cleanNametagInput(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase();
}

/**
 * The exact form the SDK registers and resolves: strip @, then
 * normalizeNametag (lowercase, strip @unicity suffix, phone → E.164).
 * Availability checks and success copy must use THIS, not the raw input.
 */
export function canonicalNametag(raw: string): string {
  const cleaned = cleanNametagInput(raw);
  try {
    return normalizeNametag(cleaned);
  } catch {
    return cleaned;
  }
}

/**
 * Resolve once the wallet is actually on `index`: fast path via the
 * 'identity:changed' event, plus polling as a belt-and-braces fallback
 * (the event may have fired before we subscribed).
 */
function waitForSwitch(sphere: Sphere, index: number, timeoutMs: number): Promise<boolean> {
  if (sphere.getCurrentAddressIndex() === index) return Promise.resolve(true);
  return new Promise(resolve => {
    let unsubscribe = () => {};
    const finish = (ok: boolean) => {
      unsubscribe();
      clearInterval(poll);
      clearTimeout(deadline);
      resolve(ok);
    };
    unsubscribe = sphere.on('identity:changed', ({ addressIndex }) => {
      if (addressIndex === index) finish(true);
    });
    const poll = setInterval(() => {
      if (sphere.getCurrentAddressIndex() === index) finish(true);
    }, SWITCH_POLL_MS);
    const deadline = setTimeout(() => finish(false), timeoutMs);
  });
}

export interface UseNewAddressFlowReturn {
  state: NewAddressState;
  /** Derive the next address and enter the nametag prompt (or complete via recovery). */
  start: () => Promise<void>;
  /** Validate + register the Unicity ID on the freshly derived (now current) address. */
  register: (nametag: string) => Promise<void>;
  /** Leave the address ID-less. */
  skip: () => void;
  /**
   * Resolve the nametag against the relay. 'unknown' means the availability
   * could not be verified (transport missing/unreachable) — callers must not
   * present it as free; registration is still allowed since the relay
   * enforces uniqueness at publish time.
   */
  checkAvailability: (nametag: string) => Promise<'available' | 'taken' | 'unknown'>;
  /** Dismiss the inline registration error (e.g. when the user edits the input). */
  clearRegisterError: () => void;
  reset: () => void;
}

export function useNewAddressFlow(): UseNewAddressFlowReturn {
  const { sphere, providers, resolveNametag } = useSphereContext();
  const queryClient = useQueryClient();
  const [state, setState] = useState<NewAddressState>(INITIAL);
  // Index of a derivation attempt that errored out: the SDK may have already
  // tracked it, so "Try Again" must reuse it instead of leaking an address.
  const pendingIndexRef = useRef<number | null>(null);

  // Don't lose the in-flight Nostr publish to a page close.
  useEffect(() => {
    if (state.step !== 'registering') return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Your Unicity ID is being registered. Closing now may cause issues.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.step]);

  // Recovery race: the SDK's background sync may recover a previously
  // registered nametag from the relay while the prompt is open — complete
  // the flow instead of letting the user double-register.
  useEffect(() => {
    if (!sphere || state.step !== 'nametag_input') return;
    const unsubscribe = sphere.on('nametag:recovered', ({ nametag }) => {
      pendingIndexRef.current = null;
      setState(prev =>
        prev.step === 'nametag_input'
          ? { ...prev, step: 'complete', completedNametag: nametag, outcome: 'recovered' }
          : prev,
      );
    });
    return unsubscribe;
  }, [sphere, state.step]);

  const refreshIdentityCaches = useCallback(
    (nametag?: string) => {
      // Write fresh identity directly — avoids the race where invalidation
      // refetches before sphere.identity has been updated by the SDK.
      if (sphere?.identity) {
        const fresh = { ...sphere.identity };
        if (nametag && !fresh.nametag) fresh.nametag = nametag;
        queryClient.setQueryData(SPHERE_KEYS.identity.current, fresh);
      }
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.identity.all });
      queryClient.invalidateQueries({ queryKey: SPHERE_KEYS.payments.all });
      window.dispatchEvent(new Event('wallet-updated'));
    },
    [sphere, queryClient],
  );

  const checkAvailability = useCallback(
    async (nametagRaw: string): Promise<'available' | 'taken' | 'unknown'> => {
      const cleanTag = canonicalNametag(nametagRaw);
      if (!cleanTag) return 'unknown';
      // A transport without nametag resolution can't verify — never claim "free".
      if (!providers?.transport?.resolveNametagInfo) return 'unknown';
      try {
        const existing = await resolveNametag(cleanTag);
        if (existing) return 'taken';
        // null can also mean the relay query silently timed out — only trust
        // it as "free" while the transport is actually connected.
        return providers.transport.isConnected?.() ? 'available' : 'unknown';
      } catch {
        return 'unknown';
      }
    },
    [providers, resolveNametag],
  );

  const start = useCallback(async () => {
    if (!sphere) {
      setState({ ...INITIAL, step: 'error', error: 'Wallet not initialized' });
      return;
    }
    setState({ ...INITIAL, step: 'deriving' });
    try {
      // Include hidden addresses so a hidden index is never re-derived.
      const tracked = sphere.getAllTrackedAddresses();
      const computedIndex = tracked.length > 0
        ? Math.max(...tracked.map(a => a.index)) + 1
        : 1;
      const nextIndex = pendingIndexRef.current ?? computedIndex;
      pendingIndexRef.current = nextIndex;

      const switchPromise = sphere.switchToAddress(nextIndex);
      // Keep a timeout-outlived rejection from becoming unhandled, and
      // remember it so the extended wait can surface the real failure.
      const switchFailure: { error: Error | null } = { error: null };
      switchPromise.catch(e => {
        switchFailure.error = e instanceof Error ? e : new Error(String(e));
      });

      try {
        await Promise.race([
          switchPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), SWITCH_QUICK_MS)),
        ]);
      } catch (e) {
        if (!(e instanceof Error && e.message === 'timeout')) throw e;
        // Slow network: the switch is still running. sphere.identity still
        // points at the PREVIOUS address until the SDK finishes — keep
        // waiting instead of reading (or registering onto) the wrong one.
        setState(prev => ({ ...prev, slow: true }));
        const switched = await waitForSwitch(
          sphere,
          nextIndex,
          SWITCH_EXTENDED_MS - SWITCH_QUICK_MS,
        );
        if (switchFailure.error) throw switchFailure.error;
        if (!switched) {
          throw new Error(
            'The address switch is taking too long — check your connection and try again.',
          );
        }
      }

      const derived = sphere.deriveAddress(nextIndex);
      refreshIdentityCaches();

      // Recovery race: switchToAddress restores a previously registered
      // nametag from the local cache — no prompt needed then. The pubkey
      // comparison guards against ever attributing another address's tag.
      const identity = sphere.identity;
      if (identity?.nametag && identity.chainPubkey === derived.publicKey) {
        pendingIndexRef.current = null;
        setState({
          ...INITIAL,
          step: 'complete',
          newAddress: { chainPubkey: derived.publicKey, index: nextIndex },
          completedNametag: identity.nametag,
          outcome: 'recovered',
        });
        return;
      }

      setState({
        ...INITIAL,
        step: 'nametag_input',
        newAddress: { chainPubkey: derived.publicKey, index: nextIndex },
      });
    } catch (err) {
      console.error('[useNewAddressFlow] Failed to derive address:', err);
      // pendingIndexRef intentionally survives: "Try Again" reuses the index.
      setState({
        ...INITIAL,
        step: 'error',
        error: err instanceof Error ? err.message : 'Failed to create address',
      });
    }
  }, [sphere, refreshIdentityCaches]);

  const register = useCallback(
    async (nametagRaw: string) => {
      if (!sphere) return;
      const cleanTag = canonicalNametag(nametagRaw);
      // Same gate the SDK enforces at registration — fail here, before any
      // network round-trip, instead of after a green availability check.
      if (!isValidNametag(cleanTag)) {
        setState(prev => ({
          ...prev,
          registerError: `Invalid Unicity ID format. ${NAMETAG_FORMAT_HINT}`,
        }));
        return;
      }
      // registerNametag acts on the CURRENT address — refuse if the wallet
      // is no longer (or not yet) on the one this prompt was opened for.
      if (state.newAddress && sphere.getCurrentAddressIndex() !== state.newAddress.index) {
        setState(prev => ({
          ...prev,
          registerError: 'The wallet is no longer on this address — close this dialog and try again.',
        }));
        return;
      }
      setState(prev => ({ ...prev, step: 'registering', registerError: null }));
      try {
        // Fresh pre-check; 'unknown' proceeds — the relay enforces uniqueness
        // at publish time and registerNametag throws if the ID is taken.
        const availability = await checkAvailability(cleanTag);
        if (availability === 'taken') {
          setState(prev => ({
            ...prev,
            step: 'nametag_input',
            registerError: `@${cleanTag} is already taken`,
          }));
          return;
        }

        await sphere.registerNametag(cleanTag);
        // The SDK stores the normalized form on the identity — show that.
        const registered = sphere.identity?.nametag ?? cleanTag;
        refreshIdentityCaches(registered);
        pendingIndexRef.current = null;
        setState(prev => ({
          ...prev,
          step: 'complete',
          completedNametag: registered,
          outcome: 'registered',
        }));
      } catch (err) {
        // Lost the recovery race: the address got its nametag while the
        // prompt was open (SDK throws ALREADY_INITIALIZED).
        if ((err as { code?: string })?.code === 'ALREADY_INITIALIZED') {
          const recovered = sphere.identity?.nametag ?? cleanTag;
          refreshIdentityCaches();
          pendingIndexRef.current = null;
          setState(prev => ({
            ...prev,
            step: 'complete',
            completedNametag: recovered,
            outcome: 'recovered',
          }));
          return;
        }
        console.error('[useNewAddressFlow] Failed to register Unicity ID:', err);
        setState(prev => ({
          ...prev,
          step: 'nametag_input',
          registerError: err instanceof Error ? err.message : 'Failed to register Unicity ID',
        }));
      }
    },
    [sphere, state.newAddress, checkAvailability, refreshIdentityCaches],
  );

  const skip = useCallback(() => {
    pendingIndexRef.current = null;
    setState(prev => ({
      ...prev,
      step: 'complete',
      completedNametag: null,
      outcome: 'skipped',
    }));
  }, []);

  const clearRegisterError = useCallback(() => {
    setState(prev => (prev.registerError ? { ...prev, registerError: null } : prev));
  }, []);

  const reset = useCallback(() => {
    pendingIndexRef.current = null;
    setState(INITIAL);
  }, []);

  return { state, start, register, skip, checkAvailability, clearRegisterError, reset };
}
