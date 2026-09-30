/**
 * Human-readable explanation for a Sphere Connect compatibility-gate rejection,
 * derived from the SphereRpcError `data` (see the SDK's `checkCompatibility`).
 * Shared by the wallet's Connect surfaces (ConnectPage popup, IframeAgent) so the
 * copy stays consistent.
 *
 * The gate publishes the versions it compared — `requiredSdk`/`actualSdk` for the npm
 * floor, `clientProtocol`/`requiredProtocol`/`walletProtocol` for the protocol checks,
 * `clientNetwork`/`walletNetwork` for the network check. Quote them: this fragment plus
 * a bare error code is the whole of what a developer sees, and "built for an older
 * version" with no number tells them to upgrade without saying to what.
 *
 * Every field is read defensively. `data` arrives over postMessage from a peer that may
 * be on an older (or newer) SDK, so a missing or malformed field degrades to the generic
 * copy rather than printing `undefined` at the user.
 *
 * The returned phrase is a sentence fragment meant to follow the dApp name, e.g.
 * `${dapp.name} ${describeConnectRejection(data)}`.
 */
import type { SwitchRefusal } from './networkSwitchOffer';

/** A non-empty string field, or null for anything else (missing, null, wrong type). */
function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** `testnet2 (4)` / `network 4`, or null when the peer sent no usable descriptor. */
function describeNetwork(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const { id, name } = value as { id?: unknown; name?: unknown };
  if (typeof id !== 'number') return null;
  const label = text(name);
  return label ? `${label} (${id})` : `network ${id}`;
}

const OUTDATED = 'was built for an older version of Sphere';
const UPDATE = 'Its developer needs to update it before it can connect.';

function describeProtocolRejection(data: Record<string, unknown>): string {
  // The gate runs MAJOR → MINOR → SDK and attaches the protocol pair to all three, so an
  // SDK-floor refusal also carries a perfectly good protocol pair. Report the floor that
  // actually failed — quoting both would read as two separate faults.
  const requiredSdk = text(data.requiredSdk);
  if (requiredSdk) {
    const actualSdk = text(data.actualSdk);
    const clause = actualSdk
      ? `it uses SDK ${actualSdk}, but this wallet requires ${requiredSdk} or newer`
      : `it did not report an SDK version, and this wallet requires ${requiredSdk} or newer`;
    return `${OUTDATED} — ${clause}. ${UPDATE}`;
  }

  const clientProtocol = text(data.clientProtocol);
  const requiredProtocol = text(data.requiredProtocol);
  const walletProtocol = text(data.walletProtocol);

  if (clientProtocol && requiredProtocol) {
    return `${OUTDATED} — it speaks Connect protocol ${clientProtocol}, but this wallet requires ${requiredProtocol} or newer. ${UPDATE}`;
  }
  if (clientProtocol && walletProtocol) {
    // MAJOR mismatch: not a floor. A NEWER major is refused just the same, so "or newer"
    // would be a lie — state both sides and leave it there.
    return `${OUTDATED} — it speaks Connect protocol ${clientProtocol}, this wallet speaks ${walletProtocol}. ${UPDATE}`;
  }
  return `${OUTDATED}. ${UPDATE}`;
}

function describeNetworkRejection(data: Record<string, unknown>): string {
  const client = describeNetwork(data.clientNetwork);
  const wallet = describeNetwork(data.walletNetwork);
  if (client && wallet) {
    return `is built for ${client}, but your wallet is on ${wallet}, so it cannot connect here.`;
  }
  return 'is built for a different Unicity network than your wallet, so it cannot connect here.';
}

/**
 * Why the wallet declined to OFFER a network switch, one sentence per reason.
 * Appended after the generic network copy, so the user learns why the wallet
 * did not simply offer to switch, rather than only that the app cannot connect.
 *
 * `Record<SwitchRefusal, string>` makes the table exhaustive at compile time: a
 * new reason in evaluateSwitchOffer will not build until it has a sentence here.
 *
 * NO PEER STRING, EVER. The generic copy above already quotes the app's declared
 * network name (an existing wart, and not made worse here); every sentence in this
 * table is fixed wallet text. A refusal carries no label to interpolate, and none
 * is looked up, so there is nothing a hostile app could word.
 */
const SWITCH_REFUSAL_CLAUSES: Record<SwitchRefusal, string> = {
  suppressed:
    'You asked not to be offered a network switch for this app. You can turn that back on in Connected Sites.',
  'unknown-network': 'Sphere does not recognise the network it asks for, so there is nothing to switch to.',
  'already-current':
    'This wallet already reports being on that network, so it will not switch. Reload the app and try again.',
  'wallet-network-unknown':
    'This wallet could not confirm which network it is on, so it will not offer to switch.',
  'not-served-here': 'This Sphere deployment does not serve that network, so the wallet cannot switch to it here.',
  'coming-soon': 'That network is not available in this wallet yet.',
};

/**
 * `switchRefusal` is the reason the wallet gave for not offering a switch, when the
 * network hook ran and refused before this rejection. It only ever extends the
 * network sentence: a protocol or SDK-floor refusal never went through the hook, so
 * a clause about switching networks would be a non sequitur there.
 */
export function describeConnectRejection(
  data: Record<string, unknown> | undefined,
  switchRefusal?: SwitchRefusal,
): string {
  const reason = data?.reason as string | undefined;
  if (reason === 'protocol_incompatible') return describeProtocolRejection(data ?? {});
  if (reason === 'network_incompatible') {
    const base = describeNetworkRejection(data ?? {});
    const clause = switchRefusal ? SWITCH_REFUSAL_CLAUSES[switchRefusal] : undefined;
    return clause ? `${base} ${clause}` : base;
  }
  return 'is not compatible with this wallet.';
}
