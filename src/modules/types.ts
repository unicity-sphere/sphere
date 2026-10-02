import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Token, TokenPlugin } from '@unicitylabs/sphere-sdk';

/** How to show a coin the network's token registry does not list. */
export interface CoinPresentation {
  readonly symbol: string;
  readonly name: string;
  readonly decimals: number;
  /** Short tag beside the symbol, e.g. where a bridged asset came from. */
  readonly badge?: string;
  readonly priceUsd?: number;
}

export interface ModuleScreenProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

/** One button in the wallet's action area; it opens the module's own screen. */
export interface WalletModuleAction {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  /** Always mounted (like the built-in modals); shown while `isOpen`. */
  readonly Screen: ComponentType<ModuleScreenProps>;
  isAvailable?(network: string): boolean;
}

/** Why a token must not be sent yet, in words for the user. */
export interface TokenHold {
  readonly reason: string;
}

/** What a hold check may read about a token. */
export interface TokenHoldContext {
  /** The token's mint justification (its genesis reason), or null when it has none. */
  justification(tokenId: string): Promise<Uint8Array | null>;
}

export interface WalletModule {
  readonly id: string;
  /** Token plugins handed to `Sphere.init({ plugins })`, so the wallet verifies the module's tokens. */
  tokenPlugins?(): readonly TokenPlugin[];
  /** Presentation for a coin the module knows and the registry does not; `undefined` for any other. */
  describeCoin?(coinId: string): CoinPresentation | undefined;
  /** A hold on a token the module knows must not travel yet; `undefined` for any other token. */
  tokenHold?(token: Token, ctx: TokenHoldContext): Promise<TokenHold | undefined>;
  readonly actions?: readonly WalletModuleAction[];
}
