/**
 * Two-profile wallet-api smoke (LOCAL-ONLY — see playwright.config.ts for
 * the required dev stack and the run command).
 *
 * Two persistent browser profiles = two wallets (separate user-data-dirs, so
 * separate IndexedDB, localStorage, deviceIds). One pass exercises the whole
 * S4 surface against the REAL backend: challenge sign-in, open minting via the
 * mock aggregator, blob upload (presigned PUT), inventory deposit, mailbox
 * delivery + claim with the §6 inventory handoff, and §16 payment requests
 * end-to-end:
 *
 *   A creates + funds a wallet → sends UCT to B → B sees the balance →
 *   B sends A a payment request → A pays it → both UIs converge.
 *
 * RELOAD-CLASS COVERAGE (issue #356 — the browser layer where the #521 /
 * #549 / #550 bugs actually bit, and where the SDK reload tests passed while
 * production broke). Both profiles run on `launchPersistentContext`, so a real
 * browser close+reopen replays storage from disk — not an in-memory
 * `newContext`. After the key state transitions we assert that state survives
 * the FULL pull from wallet-api on a fresh engine:
 *
 *   • F5 reload (dev.9): minted/received balance survives `page.reload()`
 *     (sphere-sdk#521 lost it here).
 *   • G1 — real close+reopen + HISTORY (dev.11): after A's send we CLOSE A's
 *     context and REOPEN it over the same user-data-dir, then re-assert BOTH
 *     the balance AND the transaction history (the SENT record + its memo).
 *     This is the assertion that catches the history-reload bug (#549/#550);
 *     a `page.reload()` alone never replayed persisted history this way.
 *   • G4 — second tab: `context.newPage()` on A's context (same context =
 *     shared storage, a true second tab) shows identical post-send state
 *     (balance + the SENT history record) to the first tab.
 *   • J12 — payment-request resolution survives reopen: after A pays B's
 *     request, close+reopen A and re-assert A's payment-request view still
 *     shows the resolved "Paid Successfully" status. (In this app the resolved
 *     payment-request status view lives on the PAYER's side — the requester
 *     has no outgoing-request response view wired in — so J12 is asserted on
 *     A, the only party that holds a resolved-request view.)
 *
 * Nametags ride Nostr (unchanged by this integration) and are REQUIRED for
 * recipient resolution: the engine send path needs the recipient's published
 * chain pubkey, so both profiles register one during onboarding.
 *
 * Triage rule (wallet-api ARCHITECTURE §18): infra failures (stack down,
 * 5xx, relay timeouts) are retried/blocked on — they never license test
 * weakening. Only deterministic failures are code defects.
 */
import { test, expect, chromium, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** The app renders mobile+desktop duplicates; assert/click the visible one. */
function visible(page: Page, text: string): Locator {
  return page.getByText(text).filter({ visible: true }).first();
}

function visibleButton(page: Page, name: string): Locator {
  return page.getByRole('button', { name, exact: true }).filter({ visible: true }).first();
}

/** The visible WalletScreen overlay (send/request modals) containing `text`. */
function modalScreen(page: Page, text: string): Locator {
  return page
    .locator('div.absolute.inset-0.z-10')
    .filter({ hasText: text })
    .filter({ visible: true })
    .last();
}

// One run-unique suffix; nametags are first-seen-wins on the public relays,
// so they must never repeat across runs.
const runId = Math.random().toString(36).slice(2, 8);
const TAG_A = `smka${runId}`;
const TAG_B = `smkb${runId}`;
const MEMO_SEND = `smoke: rent ${runId}`;

const baseURL = process.env.SMOKE_BASE_URL || 'http://localhost:4317';

/**
 * A persistent profile: a real on-disk user-data-dir so storage (IndexedDB +
 * localStorage) survives a context close+reopen, exactly like a browser the
 * user quits and relaunches. `reopen()` closes the live context and launches a
 * fresh one over the SAME dir — a true close/reopen, not `page.reload()`.
 */
class Profile {
  readonly userDataDir: string;
  context!: BrowserContext;
  page!: Page;

  constructor(label: string) {
    this.userDataDir = mkdtempSync(join(tmpdir(), `smoke-${label}-`));
  }

  async open(): Promise<Page> {
    this.context = await chromium.launchPersistentContext(this.userDataDir, { baseURL });
    this.page = this.context.pages()[0] ?? (await this.context.newPage());
    return this.page;
  }

  /** Real close + reopen over the same user-data-dir (fresh in-memory engine). */
  async reopen(): Promise<Page> {
    await this.context.close();
    return this.open();
  }

  async dispose(): Promise<void> {
    await this.context.close().catch(() => {});
    rmSync(this.userDataDir, { recursive: true, force: true });
  }
}

/** Walk onboarding: create wallet + register a nametag + ack the mnemonic. */
async function createWallet(page: Page, tag: string): Promise<void> {
  await page.goto('/home');
  // Tutorial overlay shows on first visit only.
  await page
    .getByText('Skip tutorial')
    .first()
    .click({ timeout: 15_000 })
    .catch(() => {});
  await page.getByRole('button', { name: 'Create New Wallet' }).first().click();

  // "Choose Unicity ID" — register the nametag (publishes the Nostr binding
  // the other profile resolves; mints the nametag token via the engine).
  await page.locator('input').first().fill(tag);
  const cont = page.getByRole('button', { name: 'Continue' });
  await expect(cont).toBeEnabled({ timeout: 30_000 });
  await cont.click();

  // Mnemonic backup → wallet view (creation + nametag mint happen here).
  await page
    .getByRole('button', { name: "I've Saved My Recovery Phrase" })
    .click({ timeout: 180_000 });
  await expect(page.getByText(`@${tag}`).filter({ visible: true }).first()).toBeVisible({
    timeout: 180_000,
  });
}

/**
 * F5 and re-assert the same balance. Reload discards all in-memory state,
 * so the balance can only come back via the full pull from wallet-api —
 * exactly the path sphere-sdk#521 broke (fixed in 0.9.1-dev.9).
 */
async function reloadAndExpectBalance(page: Page, balance: string): Promise<void> {
  await page.reload();
  await expect(visible(page, balance)).toBeVisible({ timeout: 240_000 });
}

/** Open mint via Top Up (UCT/BTC/SOL/ETH basket) and wait for the deposit. */
async function topUp(page: Page): Promise<void> {
  await visibleButton(page, 'Top Up').click();
  await visible(page, 'Get test tokens').click();
  // Mint (mock aggregator) + §6 deposit (upload-urls → PUT → apply) for the
  // whole basket; the assets list then shows the UCT balance.
  await expect(visible(page, '100.0000 UCT')).toBeVisible({ timeout: 240_000 });
}

/**
 * Open the Transaction History modal and assert the SENT record for `tag`
 * with its memo. History amounts strip trailing zeros (`-10 UCT`), unlike the
 * balance list — match the sign+amount loosely. This replays from the full
 * pull on a fresh engine: the path sphere-sdk#549/#550 broke on reload.
 */
async function expectSentInHistory(page: Page, tag: string, memo: string): Promise<void> {
  await page.getByTitle('Transaction history').filter({ visible: true }).first().click();
  await expect(visible(page, 'Transaction History')).toBeVisible({ timeout: 30_000 });
  // The SENT record card (clickable row): scoped to the recipient nametag so a
  // RECEIVED row can never satisfy it, then assert the sign+amount and memo
  // live inside that same card.
  const record = page
    .locator('div.cursor-pointer')
    .filter({ hasText: `Sent to @${tag}` })
    .filter({ visible: true })
    .first();
  await expect(record).toBeVisible({ timeout: 60_000 });
  await expect(record.getByText(/-\s*10\s*UCT/).first()).toBeVisible({ timeout: 30_000 });
  await expect(record.getByText(memo, { exact: false })).toBeVisible({ timeout: 30_000 });
}

/** Close the visible Transaction History modal (header close button). */
async function closeHistory(page: Page): Promise<void> {
  await modalScreen(page, 'Transaction History')
    .getByRole('button')
    .first()
    .click()
    .catch(() => {});
}

/** A sends 10 UCT to @B with `memo`; ends with A's balance at 90 UCT. */
async function sendToB(a: Page): Promise<void> {
  await visibleButton(a, 'Send').click();
  await a.getByRole('button', { name: /^UCT / }).filter({ visible: true }).first().click();
  await a.getByPlaceholder("Recipient's Unicity ID").fill(TAG_B);
  await a.locator('input[inputmode="decimal"]').fill('10');
  await a.getByPlaceholder('Memo (optional)').fill(MEMO_SEND);
  // Nametag resolution hits public relays — retry while the binding settles.
  await expect(async () => {
    await a.getByRole('button', { name: 'Review' }).click();
    await expect(a.getByText('You are sending')).toBeVisible({ timeout: 15_000 });
  }).toPass({ timeout: 120_000, intervals: [5_000] });
  // Scope to the confirm screen — the wallet panel has its own 'Send' button.
  await modalScreen(a, 'You are sending')
    .getByRole('button', { name: 'Send', exact: true })
    .click();
  await expect(visible(a, 'Success!')).toBeVisible({ timeout: 180_000 });
  await visibleButton(a, 'Close').click();
  await expect(visible(a, '90.0000 UCT')).toBeVisible({ timeout: 60_000 });
}

test('two profiles converge over wallet-api: fund, send, request, pay', async () => {
  const profileA = new Profile('a');
  const profileB = new Profile('b');
  let a = await profileA.open();
  const b = await profileB.open();

  try {
    // ── Onboard both profiles (A funds itself via open minting) ───────────
    await createWallet(a, TAG_A);
    await createWallet(b, TAG_B);
    await topUp(a);

    // ── A reloads (F5): minted balance must survive the full pull ─────────
    await reloadAndExpectBalance(a, '100.0000 UCT');

    // ── A sends 10 UCT to @B (mailbox delivery + B's claim/handoff) ───────
    await sendToB(a);

    // ── G4: a second tab on A's context (shared storage) shows identical ──
    //    post-send state — balance + the SENT history record with its memo.
    const a2 = await profileA.context.newPage();
    await a2.goto('/home');
    await expect(visible(a2, '90.0000 UCT')).toBeVisible({ timeout: 240_000 });
    await expectSentInHistory(a2, TAG_B, MEMO_SEND);
    await a2.close();

    // ── G1: REAL close+reopen of A over the same user-data-dir — balance ──
    //    AND history (SENT record + memo) must survive the reopen, replayed
    //    from wallet-api on a fresh engine (sphere-sdk#549/#550 broke here).
    a = await profileA.reopen();
    await expect(visible(a, '90.0000 UCT')).toBeVisible({ timeout: 240_000 });
    await expectSentInHistory(a, TAG_B, MEMO_SEND);
    await closeHistory(a);

    // ── B receives: wake → mailbox claim → inventory custody → balance ────
    await expect(visible(b, '10.0000 UCT')).toBeVisible({ timeout: 240_000 });

    // ── B reloads (F5): received balance must survive the full pull ───────
    await reloadAndExpectBalance(b, '10.0000 UCT');

    // ── B requests 5 UCT from @A (§16 payment request) ────────────────────
    await visibleButton(b, 'Top Up').click();
    await visible(b, 'Payment Request').click();
    await b.getByRole('button', { name: /^UCT/ }).filter({ visible: true }).first().click();
    await b.getByPlaceholder('Who should pay you?').fill(TAG_A);
    await b.locator('input[inputmode="decimal"]').fill('5');
    await b.getByPlaceholder('Message (optional)').fill('smoke: lunch money');
    await expect(async () => {
      await b.getByRole('button', { name: 'Review' }).click();
      await expect(b.getByRole('button', { name: 'Send Request' })).toBeVisible({ timeout: 15_000 });
    }).toPass({ timeout: 120_000, intervals: [5_000] });
    await visibleButton(b, 'Send Request').click();
    await expect(visible(b, 'Request Sent!')).toBeVisible({ timeout: 120_000 });
    await visibleButton(b, 'Close').click();

    // ── A pays it (payPaymentRequest: send + linked 'paid' respond) ───────
    // The requests modal auto-opens on the incoming request (wake push).
    await expect(visible(a, 'smoke: lunch money')).toBeVisible({ timeout: 240_000 });
    await visibleButton(a, 'Pay Now').click();
    await expect(visible(a, 'Paid Successfully')).toBeVisible({ timeout: 240_000 });

    // ── Convergence: B holds 15 UCT, A holds 85 ───────────────────────────
    await expect(visible(b, '15.0000 UCT')).toBeVisible({ timeout: 240_000 });
    await expect(visible(a, '85.0000 UCT')).toBeVisible({ timeout: 60_000 });

    // ── J12: REAL close+reopen of A — the resolved payment-request status ─
    //    ("Paid Successfully") must survive the reopen, re-hydrated from the
    //    full pull on a fresh engine (a reload-class bug would drop it).
    a = await profileA.reopen();
    await expect(visible(a, '85.0000 UCT')).toBeVisible({ timeout: 240_000 });
    await a.getByTitle('Payment requests').filter({ visible: true }).first().click();
    await expect(visible(a, 'Payment Requests')).toBeVisible({ timeout: 30_000 });
    await expect(visible(a, 'Paid Successfully')).toBeVisible({ timeout: 240_000 });
  } finally {
    await profileA.dispose();
    await profileB.dispose();
  }
});
