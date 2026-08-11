/**
 * PREVIEW-ONLY measurement (not a CI test): how long does a send that consumes
 * N source tokens actually take IN A BROWSER, and where does the time go?
 *
 * QA reported ~21s. My own numbers came from Node against staging, which is not
 * the environment the complaint came from — this drives the real UI and reads
 * the [pv2-perf] phase timings the preview SDK emits.
 *
 *   PERF_TOPUPS=20 SMOKE_BASE_URL=... npx playwright test perf-many-tokens
 */
import { test, expect, chromium, type Page } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TOPUPS = Number(process.env.PERF_TOPUPS ?? 20);
const RECIPIENT = process.env.PERF_RECIPIENT ?? 'api-4';
const TAG = `perf${String(Date.now()).slice(-7)}`;

function visible(page: Page, text: string) {
  return page.getByText(text).filter({ visible: true }).first();
}
function visibleButton(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true }).filter({ visible: true }).first();
}
/** The app renders mobile+desktop copies; click whichever one is actionable. */
async function clickAnyCopy(page: Page, name: string): Promise<void> {
  const all = page.getByRole('button', { name, exact: true });
  const n = await all.count();
  for (let i = 0; i < n; i += 1) {
    try {
      await all.nth(i).click({ timeout: 10_000 });
      return;
    } catch {
      /* try the next copy */
    }
  }
  throw new Error(`no clickable copy of button "${name}" among ${String(n)}`);
}

/** Balances render with locale grouping in the visible copy ("1,000.0000") and
 *  without it in the hidden duplicate — accept either. */
function amountRe(n: number): RegExp {
  const grouped = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',?');
  return new RegExp(`${grouped}\\.0000 UCT`);
}

function modalScreen(page: Page, text: string) {
  return page
    .locator('div.absolute.inset-0.z-10')
    .filter({ hasText: text })
    .filter({ visible: true })
    .last();
}

test('measure a send that consumes many source tokens', async () => {
  test.setTimeout(30 * 60_000);
  const dir = mkdtempSync(join(tmpdir(), 'perf-profile-'));
  const context = await chromium.launchPersistentContext(dir, {
    baseURL: process.env.SMOKE_BASE_URL || 'http://localhost:4173',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = context.pages()[0] ?? (await context.newPage());

  const perf: string[] = [];
  page.on('console', (m) => {
    const text = m.text();
    if (text.includes('[pv2-perf]')) perf.push(text.replace(/.*\[pv2-perf\]\s*/, ''));
    if (m.type() === 'error') console.log(`[browser-error] ${text.slice(0, 300)}`);
  });
  page.on('pageerror', (e) => console.log(`[page-error] ${String(e).slice(0, 300)}`));
  page.on('requestfailed', (r) => {
    console.log(`[req-failed] ${r.url().slice(0, 120)} ${String(r.failure()?.errorText)}`);
  });

  // ── onboard ────────────────────────────────────────────────────────────────
  await page.goto('/home');
  await page.getByText('Skip tutorial').first().click({ timeout: 15_000 }).catch(() => {});
  await page.getByRole('button', { name: 'Create New Wallet' }).first().click();
  await page.locator('input').first().fill(TAG);
  const cont = page.getByRole('button', { name: 'Continue' });
  await expect(cont).toBeEnabled({ timeout: 60_000 });
  await cont.click();
  // Scrape the 12 words off the show screen — the flow now re-asks for them.
  const grid = page.locator('div.grid.grid-cols-3 > div').filter({ visible: true });
  await expect(grid.first()).toBeVisible({ timeout: 180_000 });
  const words = (await grid.allInnerTexts()).map((cell) =>
    cell.replace(/^\s*\d+\.\s*/, '').trim()
  );
  expect(words).toHaveLength(12);

  await page.getByRole('button', { name: "I've Saved My Recovery Phrase" }).click({ timeout: 180_000 });

  // "Confirm Recovery Phrase": type them back.
  await expect(page.getByText('Confirm Recovery Phrase')).toBeVisible({ timeout: 60_000 });
  const inputs = page.getByPlaceholder('word');
  for (let i = 0; i < 12; i += 1) await inputs.nth(i).fill(words[i]);
  await page.getByRole('button', { name: 'Confirm' }).click();

  // The post-mnemonic screens (password, backup download, subscription plan)
  // vary in order and timing between runs, so advance on whatever is present
  // until the wallet itself shows the nametag.
  const walletReady = page.getByText(`@${TAG}`).filter({ visible: true }).first();
  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    if (await walletReady.isVisible().catch(() => false)) break;
    for (const label of ['Skip', 'Enter Wallet', 'Continue', 'Done', 'Close']) {
      const b = page.getByRole('button', { name: label, exact: true });
      if ((await b.count().catch(() => 0)) === 0) continue;
      const clicked = await clickAnyCopy(page, label).then(() => true).catch(() => false);
      if (clicked) break;
    }
    await page.waitForTimeout(1_000);
  }

  await expect(page.getByText(`@${TAG}`).filter({ visible: true }).first()).toBeVisible({ timeout: 180_000 });

  // ── top up N times: each mint is one more UCT source token ────────────────
  for (let i = 1; i <= TOPUPS; i += 1) {
    await visibleButton(page, 'Top Up').click();
    await visible(page, 'Get test tokens').click();
    await expect(
      page.getByText(amountRe(i * 100)).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 240_000 });
    console.log(`[perf] top-up ${String(i)}/${String(TOPUPS)} settled`);
  }

  // ── send the whole balance, which must consume every token ────────────────
  const amount = String(TOPUPS * 100);
  await visibleButton(page, 'Send').click();
  await page.getByRole('button', { name: /^UCT / }).filter({ visible: true }).first().click();
  await page.getByPlaceholder("Recipient's Unicity ID").fill(RECIPIENT);
  await page.locator('input[inputmode="decimal"]').fill(amount);
  await expect(async () => {
    await page.getByRole('button', { name: 'Review' }).click();
    await expect(page.getByText('You are sending')).toBeVisible({ timeout: 15_000 });
  }).toPass({ timeout: 120_000, intervals: [5_000] });

  perf.length = 0; // measure the send only
  const started = Date.now();
  await modalScreen(page, 'You are sending').getByRole('button', { name: 'Send', exact: true }).click();
  await expect(visible(page, 'Success!')).toBeVisible({ timeout: 20 * 60_000 });
  const elapsed = Date.now() - started;

  console.log(`\n===== SEND OF ${amount} UCT FROM ${String(TOPUPS)} TOKENS =====`);
  for (const line of perf) console.log(`  ${line}`);
  console.log(`  TOTAL (click -> "Success!") ${String(elapsed)}ms`);
  console.log('==================================================\n');

  await context.close();
});
