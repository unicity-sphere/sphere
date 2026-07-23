/**
 * Human-readable explanation for a Sphere Connect compatibility-gate rejection,
 * derived from the SphereRpcError `data.reason` (see the SDK's `checkCompatibility`).
 * Shared by the wallet's Connect surfaces (ConnectPage popup, IframeAgent) so the
 * copy stays consistent.
 *
 * The returned phrase is a sentence fragment meant to follow the dApp name, e.g.
 * `${dapp.name} ${describeConnectRejection(data)}`.
 */
export function describeConnectRejection(data: Record<string, unknown> | undefined): string {
  const reason = data?.reason as string | undefined;
  if (reason === 'protocol_incompatible') {
    return 'was built for an older version of Sphere. Its developer needs to update it before it can connect.';
  }
  if (reason === 'network_incompatible') {
    return 'is built for a different Unicity network than your wallet, so it cannot connect here.';
  }
  return 'is not compatible with this wallet.';
}
