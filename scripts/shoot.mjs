#!/usr/bin/env node
/**
 * Visual QA driver.
 *
 * Walks a seeded run at both target desktop sizes and writes screenshots of
 * every screen, including a mid-fight shot with a part peeled onto the desk.
 * `tests/e2e` asserts behaviour; this produces images to actually look at.
 *
 *   npm run preview
 *   node scripts/shoot.mjs [outDir]
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv[2] ?? 'screenshots';
const BASE = process.env.PEELBEAST_URL ?? 'http://127.0.0.1:4173';
const SEED = 20260725;
const SIZES = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x720', width: 1280, height: 720 },
];

// The container ships a Chromium build older than this Playwright version, so
// point at it explicitly instead of downloading a second copy.
const EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium';

async function shoot(page, dir, name) {
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(dir, `${name}.png`) });
  console.log(`  ${name}`);
}

async function screen(page) {
  for (const [id, name] of [
    ['battle-screen', 'battle'],
    ['event-screen', 'event'],
    ['shop-screen', 'shop'],
    ['reward-screen', 'reward'],
    ['result-screen', 'result'],
  ]) {
    if (await page.getByTestId(id).isVisible().catch(() => false)) return name;
  }
  if (await page.getByTestId('enter-node').isVisible().catch(() => false)) return 'workshop';
  return 'unknown';
}

const browser = await chromium.launch({ executablePath: EXECUTABLE });

for (const size of SIZES) {
  const dir = path.join(OUT, size.name);
  await fs.mkdir(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('requestfailed', (r) => errors.push(`404? ${r.url()}`));

  console.log(`\n[${size.name}]`);
  const url = `${BASE}/?seed=${SEED}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, { waitUntil: 'networkidle' });
  await shoot(page, dir, '01-title');

  await page.getByTestId('new-run').click();
  await shoot(page, dir, '02-route-select');

  await page.getByTestId('pick-route-stitch').click();
  await shoot(page, dir, '03-workshop');

  await page.getByTestId('slot-tab-core').click();
  await page.getByTestId('part-part.core.coffee_cup').hover();
  await shoot(page, dir, '04-workshop-part-preview');

  // a build with no peel resistance, so the peel shot is reliable
  await page.getByTestId('slot-tab-hand').click();
  await page.getByTestId('part-part.hand.umbrella_hook').click();
  await page.getByTestId('slot-tab-core').click();
  await page.getByTestId('part-part.core.coffee_cup').click();
  await page.getByTestId('slot-tab-trinket').click();
  await page.getByTestId('part-part.trinket.bread_patch').click();

  await page.getByTestId('enter-node').click();
  await page.waitForSelector('[data-testid="battle-screen"]');
  await shoot(page, dir, '05-battle-turn-1');

  // stall with Repair until something peels, then capture it on the desk
  for (let i = 0; i < 30; i++) {
    if ((await page.getByTestId('floor-parts').locator('.floor-part').count()) > 0) break;
    const repair = page.getByTestId('action-repair');
    if (!(await repair.isVisible().catch(() => false))) break;
    if (await repair.isEnabled()) {
      await repair.click();
      await page.waitForTimeout(700);
    } else {
      await page.waitForTimeout(280);
    }
  }
  if ((await page.getByTestId('floor-parts').locator('.floor-part').count()) > 0) {
    await shoot(page, dir, '06-battle-part-peeled');
  }

  // Second pass: a fresh run played normally, so the reward / event / shop /
  // result screens are reached with a healthy build. The first pass had to
  // stall itself into a losing position to force a peel.
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByTestId('new-run').click();
  await page.getByTestId('pick-route-snip').click();

  const captured = new Set();
  for (let step = 0; step < 60; step++) {
    const s = await screen(page);
    if (s === 'result') {
      await shoot(page, dir, '10-result');
      break;
    }
    if (s === 'battle') {
      const attack = page.getByTestId('action-attack');
      if (await attack.isEnabled().catch(() => false)) {
        await attack.click();
        await page.waitForTimeout(700);
      } else {
        await page.waitForTimeout(280);
      }
      continue;
    }
    if (s === 'reward') {
      if (!captured.has(s)) {
        await shoot(page, dir, '07-reward');
        captured.add(s);
      }
      await page.getByTestId('reward-continue').click();
      await page.waitForTimeout(480);
      continue;
    }
    if (s === 'event') {
      if (!captured.has(s)) {
        await shoot(page, dir, '08-event');
        captured.add(s);
      }
      await page.locator('[data-testid^="event-option-"]').first().click();
      await page.getByTestId('event-continue').click();
      await page.waitForTimeout(480);
      continue;
    }
    if (s === 'shop') {
      if (!captured.has(s)) {
        await shoot(page, dir, '09-shop');
        captured.add(s);
      }
      await page.getByTestId('shop-leave').click();
      await page.waitForTimeout(480);
      continue;
    }
    if (s === 'workshop') {
      await page.getByTestId('enter-node').click();
      await page.waitForTimeout(480);
      continue;
    }
    break;
  }

  await page.goto(`${BASE}/#/dev/assets`, { waitUntil: 'networkidle' });
  await page.getByTestId('asset-tile-part.head.toast_helm').click();
  await shoot(page, dir, '11-asset-catalog');

  await page.goto(`${BASE}/#/dev/data`, { waitUntil: 'networkidle' });
  await shoot(page, dir, '12-data-debug');

  const real = errors.filter((e) => !e.includes('favicon'));
  if (real.length) console.log('  console errors:', real.slice(0, 6));
  else console.log('  no console errors');
  await ctx.close();
}

await browser.close();
console.log(`\nwrote screenshots to ${OUT}/`);
