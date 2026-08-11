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
  });

  // ── onboard ────────────────────────────────────────────────────────────────
  await page.goto('/home');
  await page.getByText('Skip tutorial').first().click({ timeout: 15_000 }).catch(() => {});
  await page.getByRole('button', { name: 'Create New Wallet' }).first().click();
  await page.locator('input').first().fill(TAG);
  const cont = page.getByRole('button', { name: 'Continue' });
  await expect(cont).toBeEnabled({ timeout: 60_000 });
  await cont.click();
  await page.getByRole('button', { name: "I've Saved My Recovery Phrase" }).click({ timeout: 180_000 });
  await expect(page.getByText(`@${TAG}`).filter({ visible: true }).first()).toBeVisible({ timeout: 180_000 });

  // ── top up N times: each mint is one more UCT source token ────────────────
  for (let i = 1; i <= TOPUPS; i += 1) {
    await visibleButton(page, 'Top Up').click();
    await visible(page, 'Get test tokens').click();
    await expect(visible(page, `${String(i * 100)}.0000 UCT`)).toBeVisible({ timeout: 240_000 });
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
