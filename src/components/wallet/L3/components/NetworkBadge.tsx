import { NETWORKS } from '@unicitylabs/sphere-sdk';
import { SPHERE_NETWORK } from '../../../../config/network';
import { isTestMoney } from '../../../../config/networkCapabilities';

/**
 * Which network the balance above belongs to.
 *
 * It sits under the balance rather than in a corner because that is what it
 * qualifies: networks are isolated worlds, so the number means nothing without
 * the world it belongs to — an identical wallet shows different assets on each.
 *
 * Standing context, not an alarm, so it stays quiet enough to live on screen
 * permanently: a dot and a name. The colour carries the one distinction worth
 * repeating, and it is deliberately asymmetric — believing you are on a test
 * network while actually on a live one is the expensive mistake, so "this is
 * not real money" is what gets the amber.
 */
export function NetworkBadge() {
  const label = NETWORKS[SPHERE_NETWORK].name;
  const testMoney = isTestMoney(SPHERE_NETWORK);

  return (
    <div
      className="flex items-center justify-center gap-1.5 mt-1"
      title={
        testMoney
          ? `${label} — test network, tokens hold no real value`
          : `${label} — live network, real assets`
      }
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          testMoney ? 'bg-amber-500' : 'bg-emerald-500'
        }`}
      />
      <span className="text-[10px] font-mono tracking-wide text-neutral-400 dark:text-[rgba(255,255,255,0.35)]">
        {label}
      </span>
    </div>
  );
}
