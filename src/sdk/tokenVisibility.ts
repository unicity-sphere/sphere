import type { Token } from '@unicitylabs/sphere-sdk';

export function isWalletVisibleToken(token: Token): boolean {
  return token.status !== 'spent' && token.status !== 'invalid' && !token.suspectedSpent;
}

export function isSpendableToken(token: Token): boolean {
  return token.status === 'confirmed' && !token.suspectedSpent;
}
