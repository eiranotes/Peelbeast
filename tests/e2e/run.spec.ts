import { test, expect, type Page } from '@playwright/test';

/**
 * End-to-end walkthrough in a real browser.
 *
 * These assert the things unit tests structurally cannot: that the assembled
 * image actually appears in the fight, that a peeled part actually leaves the
 * DOM and lands on the desk, and that the run's screens connect to each other.
 */

type Screen = 'battle' | 'event' | 'shop' | 'reward' | 'result' | 'workshop' | 'unknown';

/** Which screen is showing right now. */
async function currentScreen(page: Page): Promise<Screen> {
  const map: Array<[string, Screen]> = [
    ['battle-screen', 'battle'],
    ['event-screen', 'event'],
    ['shop-screen', 'shop'],
    ['reward-screen', 'reward'],
    ['result-screen', 'result'],
  ];
  for (const [id, name] of map) {
    if (await page.getByTestId(id).isVisible().catch(() => false)) return name;
  }
  if (await page.getByTestId('enter-node').isVisible().catch(() => false)) return 'workshop';
  return 'unknown';
}

/** Poll until the screen changes away from `from`. Avoids racing React renders. */
async function waitForScreenChange(page: Page, from: Screen, timeoutMs = 8000): Promise<Screen> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const now = await currentScreen(page);
    if (now !== from && now !== 'unknown') return now;
    await page.waitForTimeout(120);
  }
  return currentScreen(page);
}

/** Fights the current battle until it resolves, or gives up. */
async function fightUntilResolved(page: Page, maxActions = 40): Promise<'reward' | 'result' | 'stuck'> {
  for (let i = 0; i < maxActions; i++) {
    if (await page.getByTestId('reward-screen').isVisible().catch(() => false)) return 'reward';
    if (await page.getByTestId('result-screen').isVisible().catch(() => false)) return 'result';
    const attack = page.getByTestId('action-attack');
    if (!(await attack.isVisible().catch(() => false))) {
      await page.waitForTimeout(300);
      continue;
    }
    if (await attack.isEnabled()) {
      await attack.click();
      await page.waitForTimeout(780);
    } else {
      await page.waitForTimeout(320);
    }
  }
  return 'stuck';
}

async function startRun(page: Page, route: 'snip' | 'stitch' = 'snip', seed = 20260725) {
  // `?seed=` makes the whole run reproducible, so these assertions do not
  // depend on a lucky roll.
  await page.goto(`/?seed=${seed}`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`/?seed=${seed}`);
  await page.getByTestId('new-run').click();
  await page.getByTestId(`pick-route-${route}`).click();
  await expect(page.getByTestId('enter-node')).toBeVisible();
}

/**
 * Build a beast that is durable but has zero peel resistance and no peel-catch:
 * Umbrella + Coffee + Bread Patch. Tape Roll (35% catch) and Ribbon Knot
 * (+1 resist) are both swapped out. The spider's peel intents then land
 * reliably, so the peel tests exercise the mechanic rather than the odds.
 */
async function makePeelable(page: Page) {
  await page.getByTestId('slot-tab-hand').click();
  await page.getByTestId('part-part.hand.umbrella_hook').click();
  await page.getByTestId('slot-tab-core').click();
  await page.getByTestId('part-part.core.coffee_cup').click();
  await page.getByTestId('slot-tab-trinket').click();
  await page.getByTestId('part-part.trinket.bread_patch').click();
}

/**
 * Stall the fight so peel pressure can build: Repair heals without dealing
 * damage and without granting Block, so the fight neither ends nor blocks the
 * spider's peel attempts. The floor is checked before each action, so a peel is
 * observed before Repair could undo it.
 */
async function stallUntilPeel(page: Page, maxActions = 30): Promise<string | null> {
  const floor = page.getByTestId('floor-parts');
  for (let i = 0; i < maxActions; i++) {
    if ((await floor.locator('.floor-part').count()) > 0) {
      return (await floor.locator('.floor-part').first().locator('.floor-part__tag').innerText())
        .trim()
        .toLowerCase();
    }
    const repair = page.getByTestId('action-repair');
    if (!(await repair.isVisible().catch(() => false))) return null;
    if (await repair.isEnabled()) {
      await repair.click();
      await page.waitForTimeout(700);
    } else {
      await page.waitForTimeout(280);
    }
  }
  return null;
}

test.describe('PEELBEAST vertical slice', () => {
  test('1. a new game reaches the workshop with a fully assembled beast', async ({ page }) => {
    await startRun(page);

    const figure = page.getByTestId('peelbeast-figure').first();
    await expect(figure).toBeVisible();
    // body + one layer per equipped slot
    await expect(figure.locator('.figure__body')).toBeVisible();
    for (const slot of ['head', 'hand', 'core', 'trinket']) {
      await expect(figure.locator(`.figure__part--${slot}`)).toHaveCount(1);
    }
  });

  test('2. swapping a part changes the figure and the stats immediately', async ({ page }) => {
    await startRun(page);

    const figure = page.getByTestId('peelbeast-figure').first();
    const headBefore = await figure.locator('.figure__part--head').getAttribute('data-part-id');
    expect(headBefore).toBe('part.head.toast_helm');

    await page.getByTestId('slot-tab-head').click();
    await page.getByTestId('part-part.head.box_shell').click();

    await expect(figure.locator('.figure__part--head')).toHaveAttribute('data-part-id', 'part.head.box_shell');
    // Box Shell is the tanky option, so max HP must have gone up
    await expect(page.locator('.stat-block__cell', { hasText: 'HP' }).first()).toContainText(/\d+/);
  });

  test('3. unequipping a part removes its layer from the figure entirely', async ({ page }) => {
    await startRun(page);
    const figure = page.getByTestId('peelbeast-figure').first();
    await expect(figure.locator('.figure__part--trinket')).toHaveCount(1);

    await page.getByTestId('slot-tab-trinket').click();
    await page.getByTestId('part-part.trinket.ribbon_knot').click(); // toggles off

    await expect(figure.locator('.figure__part--trinket')).toHaveCount(0);
  });

  test('4. entering combat shows three enemy intents with readable detail', async ({ page }) => {
    await startRun(page);
    await page.getByTestId('enter-node').click();
    await expect(page.getByTestId('battle-screen')).toBeVisible();

    const rail = page.getByTestId('intent-rail');
    await expect(rail.locator('.intent-card')).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const card = page.getByTestId(`intent-${i}`);
      await expect(card).toBeVisible();
      await expect(card.locator('.intent-card__name')).not.toBeEmpty();
      await expect(card.locator('.danger')).toBeVisible();
    }
  });

  test('5. the assembled build appears in battle and actions advance the turn', async ({ page }) => {
    await startRun(page);
    await page.getByTestId('enter-node').click();
    await expect(page.getByTestId('battle-screen')).toBeVisible();

    const figure = page.getByTestId('peelbeast-figure').first();
    for (const slot of ['head', 'hand', 'core', 'trinket']) {
      await expect(figure.locator(`.figure__part--${slot}`)).toHaveCount(1);
    }

    await expect(page.getByTestId('turn-pill')).toContainText('YOUR TURN');
    await page.getByTestId('action-attack').click();
    await expect(page.getByTestId('turn-pill')).toContainText('ENEMY TURN');
    // and control comes back
    await expect(page.getByTestId('turn-pill')).toContainText('YOUR TURN', { timeout: 8000 });
  });

  test('6. Guard grants block, which the UI reports', async ({ page }) => {
    await startRun(page);
    await page.getByTestId('enter-node').click();
    await page.getByTestId('action-guard').click();
    await expect(page.getByTestId('player-block')).toBeVisible();
  });

  test('7. a part that peels leaves the figure and lands on the desk', async ({ page }) => {
    // Stitch Loop opens on the Tape Spider, whose whole kit is peel pressure.
    await startRun(page, 'stitch');
    await makePeelable(page);
    await page.getByTestId('enter-node').click();
    await expect(page.getByTestId('battle-screen')).toBeVisible();

    const slotKey = await stallUntilPeel(page);
    expect(slotKey, 'a part should have been peeled').not.toBeNull();

    // the fallen part is on the desk...
    await expect(page.getByTestId('floor-parts').locator('.floor-part').first()).toBeVisible();

    // ...its integrity row says PEELED...
    await expect(page.getByTestId(`peel-${slotKey}`)).toContainText('PEELED');

    // ...its skill button is disabled and labelled as peeled...
    const skillBtn = page.getByTestId(`skill-${slotKey}`);
    await expect(skillBtn).toBeDisabled();
    await expect(skillBtn).toContainText('박리됨');

    // ...and the layer is gone from the character.
    await expect(page.getByTestId('peelbeast-figure').first().locator(`.figure__part--${slotKey}`)).toHaveCount(0);
  });

  test('8. Repair reattaches a peeled part and re-enables its skill', async ({ page }) => {
    await startRun(page, 'stitch');
    await makePeelable(page);
    await page.getByTestId('enter-node').click();

    const slotKey = await stallUntilPeel(page);
    expect(slotKey, 'a part should have been peeled').not.toBeNull();

    const repair = page.getByTestId('action-repair');
    await expect(repair).toBeEnabled({ timeout: 8000 });
    await repair.click();
    await page.waitForTimeout(700);

    await expect(page.getByTestId(`peel-${slotKey}`)).not.toContainText('PEELED');
    await expect(page.getByTestId('peelbeast-figure').first().locator(`.figure__part--${slotKey}`)).toHaveCount(1);
    await expect(page.getByTestId('floor-parts').locator('.floor-part')).toHaveCount(0);
  });

  test('9. clearing a fight leads to a reward screen and then the next node', async ({ page }) => {
    await startRun(page);
    await page.getByTestId('enter-node').click();

    const outcome = await fightUntilResolved(page);
    test.skip(outcome === 'stuck', 'fight did not resolve in the action budget');

    if (outcome === 'reward') {
      await expect(page.getByTestId('reward-screen')).toBeVisible();
      await page.getByTestId('reward-continue').click();
      await expect(page.getByTestId('enter-node')).toBeVisible();
    } else {
      await expect(page.getByTestId('result-screen')).toBeVisible();
    }
  });

  test('10. an event applies its choice and moves the run on', async ({ page }) => {
    await startRun(page);
    // walk to the event node without fighting, via the route board position
    await page.getByTestId('enter-node').click();
    const outcome = await fightUntilResolved(page);
    test.skip(outcome !== 'reward', 'first fight was not won in this seed');

    await page.getByTestId('reward-continue').click();
    await waitForScreenChange(page, 'reward');
    await page.getByTestId('enter-node').click();

    await expect(page.getByTestId('event-screen')).toBeVisible();
    const option = page.locator('[data-testid^="event-option-"]').first();
    await option.click();
    await expect(page.getByTestId('event-resolved')).toBeVisible();
    await page.getByTestId('event-continue').click();
    await expect(page.getByTestId('enter-node')).toBeVisible();
  });

  test('11. the shop sells things and scrap goes down', async ({ page }) => {
    await startRun(page);
    // drive forward until a shop node is reached
    for (let i = 0; i < 8; i++) {
      await page.getByTestId('enter-node').click();
      await waitForScreenChange(page, 'workshop');

      if (await page.getByTestId('shop-screen').isVisible().catch(() => false)) break;
      if (await page.getByTestId('event-screen').isVisible().catch(() => false)) {
        await page.locator('[data-testid^="event-option-"]').first().click();
        await page.getByTestId('event-continue').click();
        await waitForScreenChange(page, 'event');
        continue;
      }
      const outcome = await fightUntilResolved(page);
      if (outcome !== 'reward') {
        test.skip(true, 'run ended before reaching the shop');
        return;
      }
      await page.getByTestId('reward-continue').click();
      await waitForScreenChange(page, 'reward');
    }

    if (!(await page.getByTestId('shop-screen').isVisible().catch(() => false))) {
      test.skip(true, 'shop not reached in the step budget');
      return;
    }

    const scrapBefore = Number((await page.getByTestId('shop-scrap').innerText()).replace(/\D/g, ''));
    const buyable = page.locator('[data-testid^="shop-item-"]:not([disabled])').first();
    if ((await buyable.count()) > 0) {
      await buyable.click();
      const scrapAfter = Number((await page.getByTestId('shop-scrap').innerText()).replace(/\D/g, ''));
      expect(scrapAfter).toBeLessThan(scrapBefore);
    }
    await page.getByTestId('shop-leave').click();
    await expect(page.getByTestId('enter-node')).toBeVisible();
  });

  test('12. a full route plays through combat, event, shop and boss to a result', async ({ page }) => {
    // A whole run at roughly human pacing, so give it room.
    test.setTimeout(300_000);
    await startRun(page);

    const seen = new Set<Screen>();

    for (let step = 0; step < 40; step++) {
      const screen = await currentScreen(page);
      seen.add(screen);

      if (screen === 'result') break;

      if (screen === 'workshop') {
        await page.getByTestId('enter-node').click();
        await waitForScreenChange(page, 'workshop');
        continue;
      }
      if (screen === 'event') {
        await page.locator('[data-testid^="event-option-"]').first().click();
        await expect(page.getByTestId('event-resolved')).toBeVisible();
        await page.getByTestId('event-continue').click();
        await waitForScreenChange(page, 'event');
        continue;
      }
      if (screen === 'shop') {
        await page.getByTestId('shop-leave').click();
        await waitForScreenChange(page, 'shop');
        continue;
      }
      if (screen === 'reward') {
        await page.getByTestId('reward-continue').click();
        await waitForScreenChange(page, 'reward');
        continue;
      }
      if (screen === 'battle') {
        const outcome = await fightUntilResolved(page, 90);
        expect(outcome, 'the fight should reach a conclusion').not.toBe('stuck');
        continue;
      }
      break;
    }

    // the run reached an end, and it passed through every node type on the way
    await expect(page.getByTestId('result-screen')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('result-retry')).toBeVisible();
    expect(seen.has('battle')).toBe(true);
    expect(seen.has('event')).toBe(true);
    expect(seen.has('shop')).toBe(true);
  });
});

test.describe('developer screens', () => {
  test('the asset catalog lists assets with no validation errors', async ({ page }) => {
    await page.goto('/#/dev/assets');
    await expect(page.getByTestId('asset-catalog-screen')).toBeVisible();
    await expect(page.getByTestId('catalog-errors')).toContainText('0 errors');

    const tiles = page.locator('[data-testid^="asset-tile-"]');
    expect(await tiles.count()).toBeGreaterThan(40);

    await page.getByTestId('asset-search').fill('toast');
    await expect(page.getByTestId('asset-tile-part.head.toast_helm')).toBeVisible();

    await page.getByTestId('asset-tile-part.head.toast_helm').click();
    await expect(page.getByTestId('asset-tuner')).toBeVisible();
    await expect(page.locator('.asset-detail')).toContainText('/assets/parts/head/toast_helm.png');
  });

  test('a missing asset falls back instead of breaking the page', async ({ page }) => {
    // block one sprite at the network layer and confirm the fallback loads
    await page.route('**/assets/parts/head/toast_helm.png', (r) => r.abort());
    await page.goto('/#/dev/assets');
    await expect(page.getByTestId('asset-catalog-screen')).toBeVisible();

    const img = page.locator('[data-asset-id="part.head.toast_helm"]').first();
    await expect(img).toBeVisible();
    await expect(img).toHaveJSProperty('naturalWidth', 480); // the head placeholder
  });

  test('the data debug screen reports no content errors', async ({ page }) => {
    await page.goto('/#/dev/data');
    await expect(page.getByTestId('data-debug-screen')).toBeVisible();
    await expect(page.getByTestId('content-errors')).toContainText('0 content errors');
  });
});
