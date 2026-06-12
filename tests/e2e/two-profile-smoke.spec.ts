/**
 * Two-profile wallet-api smoke (LOCAL-ONLY — see playwright.config.ts for
 * the required dev stack and the run command).
 *
 * Two isolated browser contexts = two wallets (separate IndexedDB,
 * localStorage, deviceIds). One pass exercises the whole S4 surface against
 * the REAL backend: challenge sign-in, open minting via the mock aggregator,
 * blob upload (presigned PUT), inventory deposit, mailbox delivery + claim
 * with the §6 inventory handoff, and §16 payment requests end-to-end:
 *
 *   A creates + funds a wallet → sends UCT to B → B sees the balance →
 *   B sends A a payment request → A pays it → both UIs converge.
 *
 * Nametags ride Nostr (unchanged by this integration) and are REQUIRED for
 * recipient resolution: the engine send path needs the recipient's published
 * chain pubkey, so both profiles register one during onboarding.
 *
 * Triage rule (wallet-api ARCHITECTURE §18): infra failures (stack down,
 * 5xx, relay timeouts) are retried/blocked on — they never license test
 * weakening. Only deterministic failures are code defects.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

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

/** Open mint via Top Up (UCT/BTC/SOL/ETH basket) and wait for the deposit. */
async function topUp(page: Page): Promise<void> {
  await visibleButton(page, 'Top Up').click();
  await visible(page, 'Get test tokens').click();
  // Mint (mock aggregator) + §6 deposit (upload-urls → PUT → apply) for the
  // whole basket; the assets list then shows the UCT balance.
  await expect(visible(page, '100.0000 UCT')).toBeVisible({ timeout: 240_000 });
}

test('two profiles converge over wallet-api: fund, send, request, pay', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  // ── Onboard both profiles (A funds itself via open minting) ─────────────
  await createWallet(a, TAG_A);
  await createWallet(b, TAG_B);
  await topUp(a);

  // ── A sends 10 UCT to @B (mailbox delivery + B's claim/handoff) ─────────
  await visibleButton(a, 'Send').click();
  await a.getByRole('button', { name: /^UCT / }).filter({ visible: true }).first().click();
  await a.getByPlaceholder("Recipient's Unicity ID").fill(TAG_B);
  await a.locator('input[inputmode="decimal"]').fill('10');
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

  // ── B receives: wake → mailbox claim → inventory custody → balance ──────
  await expect(visible(b, '10.0000 UCT')).toBeVisible({ timeout: 240_000 });

  // ── B requests 5 UCT from @A (§16 payment request) ──────────────────────
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

  // ── A pays it (payPaymentRequest: send + linked 'paid' respond) ─────────
  // The requests modal auto-opens on the incoming request (wake push).
  await expect(visible(a, 'smoke: lunch money')).toBeVisible({ timeout: 240_000 });
  await visibleButton(a, 'Pay Now').click();
  await expect(visible(a, 'Paid Successfully')).toBeVisible({ timeout: 240_000 });

  // ── Convergence: B holds 15 UCT, A holds 85 ─────────────────────────────
  await expect(visible(b, '15.0000 UCT')).toBeVisible({ timeout: 240_000 });
  await expect(visible(a, '85.0000 UCT')).toBeVisible({ timeout: 60_000 });

  await ctxA.close();
  await ctxB.close();
});
