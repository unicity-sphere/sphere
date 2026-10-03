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
 * version" with no number tells them to upgrade without saying to what. A network is
 * quoted by id and named from the wallet's own table; the name the app declared for it
 * is display text it chose, and is never printed.
 *
 * Every field is read defensively. `data` arrives over postMessage from a peer that may
 * be on an older (or newer) SDK, so a missing or malformed field degrades to the generic
 * copy rather than printing `undefined` at the user.
 *
 * The returned phrase is a sentence fragment meant to follow the dApp name, e.g.
 * `${dapp.name} ${describeConnectRejection(data)}`.
 */
import { NETWORKS } from '@unicitylabs/sphere-sdk';
import { resolveSphereNetwork } from '@unicitylabs/sphere-sdk/connect';
import type { SwitchRefusal } from './networkSwitchOffer';

/** A non-empty string field, or null for anything else (missing, null, wrong type). */
function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * `testnet2` for an id the wallet knows, `network 424242` for one it does not, or null when
 * `data` carried no usable descriptor.
 *
 * BOTH sides are labelled here, from the wallet's own table, by id alone. The `name` in the
 * descriptor is never read: it is display text the peer chose, and the SDK sends the wallet's
 * side as `{ id }` with no name at all, so printing the peer's would have let a hostile app
 * label ITS side "Mainnet" inside a sentence the wallet vouches for, next to a bare
 * `network 1` for the wallet's own. Labelling both from one source keeps them comparable.
 *
 * The id itself is not shown beside a name it would only repeat — it is a number the reader has
 * no use for, and the sentence it sat in is one a person has to act on. It survives in the one
 * place it carries the whole meaning: a network this wallet's table cannot name.
 */
function describeNetwork(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const { id } = value as { id?: unknown };
  if (typeof id !== 'number') return null;
  // The registry key (`mainnet`, `testnet2`) is not what the rest of the wallet calls a network;
  // every other surface says Mainnet and Testnet. Two names for one network in one product is
  // the kind of seam a reader notices and cannot explain. Still sourced entirely from the
  // wallet's own table, and the fallback for an id it cannot name is untouched.
  const known = resolveSphereNetwork(id);
  return known ? NETWORKS[known.name].name : `network ${id}`;
}

const OUTDATED = 'was built for an older version of Sphere';
const UPDATE = 'Its developer needs to update it before it can connect.';

// NOTE: `actualSdk` and `clientProtocol` below are peer-supplied and printed verbatim (see the
// note above SWITCH_REFUSAL_CLAUSES); the `required*` and `walletProtocol` values are the wallet's.
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
 * NO PEER STRING, EVER, in THIS table or in the network sentence above it: the network
 * sentence labels both networks from the wallet's own table by id (describeNetwork) and
 * never prints the name the app declared, and every sentence here is fixed wallet text. A
 * refusal carries no label to interpolate, and none is looked up, so there is nothing a
 * hostile app could word.
 *
 * That is NOT true of this file as a whole. The protocol copy (describeProtocolRejection)
 * still prints two peer-supplied strings verbatim: `actualSdk` (the app's own SDK version)
 * and `clientProtocol` (the protocol version it claims to speak). They are only rendered as
 * text, but an app can put any string in them, so do not read this file as if nothing the
 * peer sent gets through.
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

/**
 * The refusal clause on its own, so a surface with room can set it as its own paragraph instead
 * of running it onto the end of the sentence above.
 */
export function describeSwitchRefusal(reason: SwitchRefusal): string {
  return SWITCH_REFUSAL_CLAUSES[reason];
}

/**
 * The numbers the gate actually compared, for a disclosure.
 *
 * None of this belongs in the sentence a person reads: an error code is something only a
 * developer can act on, and it sat at the same altitude as the explanation. But a dApp developer
 * looking at a popup has no wallet-side console, so throwing it away is not an option either —
 * this is where it goes.
 *
 * Every field is read defensively: `data` crossed a postMessage boundary and a peer can put
 * anything in it. The peer-supplied values are rendered as text only, exactly as the sentence
 * copy already treats them.
 */
export function connectRejectionDiagnostics(
  data: Record<string, unknown> | undefined,
  code: number,
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [{ label: 'Error code', value: String(code) }];
  const bag = data ?? {};

  const networkId = (value: unknown): string => {
    if (typeof value !== 'object' || value === null) return 'unknown';
    const { id } = value as { id?: unknown };
    return typeof id === 'number' ? String(id) : 'unknown';
  };
  if ('clientNetwork' in bag || 'walletNetwork' in bag) {
    rows.push({
      label: 'Networks',
      value:
        `This site asked for network ${networkId(bag.clientNetwork)}. ` +
        `Your wallet is on network ${networkId(bag.walletNetwork)}.`,
    });
  }

  const text = (value: unknown): string | undefined =>
    typeof value === 'string' && value.length > 0 ? value : undefined;

  const clientProtocol = text(bag.clientProtocol);
  const requiredProtocol = text(bag.requiredProtocol);
  const walletProtocol = text(bag.walletProtocol);
  if (clientProtocol && (requiredProtocol || walletProtocol)) {
    rows.push({
      label: 'Connect protocol',
      value: requiredProtocol
        ? `It speaks ${clientProtocol}; this wallet requires ${requiredProtocol} or newer.`
        : `It speaks ${clientProtocol}; this wallet speaks ${walletProtocol}.`,
    });
  }

  const requiredSdk = text(bag.requiredSdk);
  if (requiredSdk) {
    const actualSdk = text(bag.actualSdk);
    rows.push({
      label: 'SDK version',
      value: actualSdk
        ? `It reports ${actualSdk}; this wallet requires ${requiredSdk} or newer.`
        : `It did not report a version; this wallet requires ${requiredSdk} or newer.`,
    });
  }

  return rows;
}
