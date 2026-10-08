import { describe, it, expect } from 'vitest';
import { burnStoppedSentence, formatDuration, formatUnits, pendingLockSentence, returnStatusSentence, returnTimingSentence } from '@/modules/bridge/format';

describe('burn stopped sentence', () => {
  it('names the token that failed with its own reason and counts only the tokens after it as kept', () => {
    expect(burnStoppedSentence({ done: 1, total: 4 }, 'The fee rose.')).toBe(
      'Burning stopped at token 2 of 4: The fee rose. The last 2 tokens were not burned and stay in this wallet.',
    );
    expect(burnStoppedSentence({ done: 1, total: 3 }, 'The fee rose.')).toBe(
      'Burning stopped at token 2 of 3: The fee rose. The last token was not burned and stays in this wallet.',
    );
  });

  it('says nothing about kept tokens when the failing token was the last', () => {
    expect(burnStoppedSentence({ done: 1, total: 2 }, 'The fee rose.')).toBe('Burning stopped at token 2 of 2: The fee rose.');
  });
});

describe('bridge amount formatting', () => {
  it('formats smallest units back, trimming trailing zeros', () => {
    expect(formatUnits(1_000_000n, 6)).toBe('1');
    expect(formatUnits(1_234_500n, 6)).toBe('1.2345');
    expect(formatUnits(5n, 6)).toBe('0.000005');
    expect(formatUnits(0n, 6)).toBe('0');
  });
});

describe('return status sentence', () => {
  it('says the wallet keeps a burn the service has not taken yet', () => {
    expect(returnStatusSentence({ status: 'burned' }, 'Tron')).toMatch(/has not accepted the burn yet.*keeps the burned token/);
  });

  it('says in plain words that the proof is being made', () => {
    expect(returnStatusSentence({ status: 'proving' }, 'Tron')).toBe('The bridge service is generating proof of burn.');
    expect(returnStatusSentence({ status: 'queued' }, 'Tron')).toBe('The bridge service accepted the burn and queued it for proving.');
  });

  it('names the chain for the release steps', () => {
    expect(returnStatusSentence({ status: 'proven' }, 'Tron')).toBe('The burn is proven. The release is being sent to Tron.');
    expect(returnStatusSentence({ status: 'submitted' }, 'Tron')).toBe('The release is waiting for confirmation on Tron.');
    expect(returnStatusSentence({ status: 'settled' }, 'Tron')).toBe('Released on Tron.');
  });

  it('quotes the service on a refusal', () => {
    expect(returnStatusSentence({ status: 'failed', message: 'stale config' }, 'Tron')).toBe('The bridge service refused the burn: stale config');
    expect(returnStatusSentence({ status: 'failed' }, 'Tron')).toBe('The bridge service refused the burn.');
    expect(returnStatusSentence({ status: 'failed', message: 'chain not synced', recoverable: true }, 'Tron')).toBe(
      'The bridge service could not accept the burn yet: chain not synced. This wallet keeps the burned token and retries by itself.',
    );
  });
});

const MIN = 60_000;

describe('returnTimingSentence', () => {
  it('says how long the proof has run and what a proof usually takes', () => {
    expect(returnTimingSentence({ status: 'proving', sinceMs: 100 * MIN }, { averageProofMs: 58 * MIN }, 112 * MIN)).toBe(
      'Proving for 12 min. A proof takes about 58 min on average.',
    );
  });

  it('admits when no proof has finished on the service yet', () => {
    expect(returnTimingSentence({ status: 'proving', sinceMs: 100 * MIN }, {}, 105 * MIN)).toBe(
      'Proving for 5 min. No proof has finished on this service yet.',
    );
    expect(returnTimingSentence({ status: 'proving', sinceMs: 100 * MIN }, null, 105 * MIN)).toBe(
      'Proving for 5 min. No proof has finished on this service yet.',
    );
  });

  it('places a queued burn behind the batch that is proving', () => {
    expect(
      returnTimingSentence({ status: 'queued', queuePosition: 2 }, { provingSinceMs: 0, averageProofMs: 60 * MIN }, 30 * MIN),
    ).toBe('Position 2 in the queue. Another batch has been proving for 30 min; this burn joins the next one. A proof takes about 1 h on average.');
  });

  it('has nothing to add once the proof is done', () => {
    expect(returnTimingSentence({ status: 'proven' }, null, 0)).toBeNull();
    expect(returnTimingSentence({ status: 'settled' }, null, 0)).toBeNull();
  });
});

describe('formatDuration', () => {
  it('rounds to the useful unit', () => {
    expect(formatDuration(40_000)).toBe('40 s');
    expect(formatDuration(12 * MIN)).toBe('12 min');
    expect(formatDuration(65 * MIN)).toBe('1 h 5 min');
    expect(formatDuration(120 * MIN)).toBe('2 h');
    expect(formatDuration(-5_000)).toBe('0 s');
  });
});

describe('pendingLockSentence', () => {
  it('tells a deposit the wallet never signed from one whose lock may have been sent', () => {
    expect(pendingLockSentence({ status: 'locking' })).toBe('not signed, nothing is locked');
    expect(pendingLockSentence({ status: 'locking', lockRequested: true })).toBe(
      "the lock may have been sent; check your wallet's activity before discarding",
    );
    expect(pendingLockSentence({ status: 'locking', lockTxid: 'aa' })).toBe('lock sent');
    expect(pendingLockSentence({ status: 'locked', lockTxid: 'aa' })).toBe('locked, not yet minted');
  });
});
