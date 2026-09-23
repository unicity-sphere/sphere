import {
  ManagedTronSigner,
  type InjectedTronWeb,
  type TronBridgeManifest,
  type SourceSigner,
  type ContractCall,
} from '@unicitylabs/bridge-plugin/wallet';

export function devKeySigner(m: TronBridgeManifest): (() => SourceSigner) | null {
  const key = import.meta.env.DEV ? (import.meta.env.VITE_BRIDGE_DEV_TRON_KEY as string | undefined) : undefined;
  if (!key) return null;
  return () =>
    new LazySigner(async () => {
      const { TronWeb } = await import('tronweb');
      const tw = new TronWeb({
        fullHost: m.rpcUrl,
        headers: m.apiKey ? { 'TRON-PRO-API-KEY': m.apiKey } : undefined,
        privateKey: key,
      });
      return new ManagedTronSigner(tw as unknown as InjectedTronWeb, m.chainId);
    });
}

class LazySigner implements SourceSigner {
  private readonly build: () => Promise<SourceSigner>;
  private inner: Promise<SourceSigner> | null = null;

  public constructor(build: () => Promise<SourceSigner>) {
    this.build = build;
  }

  private signer(): Promise<SourceSigner> {
    return (this.inner ??= this.build());
  }

  public async connect(): Promise<string> {
    return (await this.signer()).connect();
  }

  public async getAddress(): Promise<string> {
    return (await this.signer()).getAddress();
  }

  public async getNetwork(): Promise<number> {
    return (await this.signer()).getNetwork();
  }

  public async sendCall(call: ContractCall): Promise<string> {
    return (await this.signer()).sendCall(call);
  }
}
