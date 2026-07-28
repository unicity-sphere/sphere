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

export function describeConnectRejection(data: Record<string, unknown> | undefined): string {
  const reason = data?.reason as string | undefined;
  if (reason === 'protocol_incompatible') return describeProtocolRejection(data ?? {});
  if (reason === 'network_incompatible') return describeNetworkRejection(data ?? {});
  return 'is not compatible with this wallet.';
}
