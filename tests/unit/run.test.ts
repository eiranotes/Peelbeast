import { describe, expect, it } from 'vitest';
import {
  advanceNode,
  applyBattleResult,
  applyRunEffects,
  canAfford,
  chooseEventOption,
  createRun,
  currentEncounter,
  currentNode,
  eventOptionAvailable,
  equipPart,
  isFinalNode,
  purchase,
  rollShop,
  shopItemCost,
  shopOfferItems,
} from '@/game/engine/rewardResolver';
import { computeBuild } from '@/game/systems/assemblySystem';
import { BALANCE } from '@/game/data/balance';
import { SHOPS } from '@/game/data/shops';
import { ROUTES } from '@/game/data/routes';

describe('run creation', () => {
  it('starts at node 0 with the default loadout and starting scrap', () => {
    const run = createRun('snip', 1);
    expect(run.nodeIndex).toBe(0);
    expect(run.scrap).toBe(BALANCE.run.startingScrap);
    expect(run.status).toBe('active');
    expect(currentNode(run)?.type).toBe('combat');
    expect(run.carry.hp).toBe(computeBuild(run.assembly).maxHp);
  });
});

describe('run effects', () => {
  it('applies scrap, hp and glue and clamps carry to the build', () => {
    let run = createRun('snip', 1);
    const max = computeBuild(run.assembly).maxHp;
    run = applyRunEffects(run, [{ kind: 'scrap', amount: 5 }, { kind: 'hp', amount: 999 }]);
    expect(run.scrap).toBe(BALANCE.run.startingScrap + 5);
    expect(run.carry.hp).toBe(max);
  });

  it('never lets carry hp fall below the floor', () => {
    let run = createRun('snip', 1);
    run = applyRunEffects(run, [{ kind: 'hp', amount: -9999 }]);
    expect(run.carry.hp).toBe(BALANCE.run.minCarryHp);
  });

  it('grants relics without duplicating them', () => {
    let run = createRun('snip', 1);
    run = applyRunEffects(run, [{ kind: 'relic', relicId: 'pin_badge' }]);
    run = applyRunEffects(run, [{ kind: 'relic', relicId: 'pin_badge' }]);
    expect(run.relics).toEqual(['pin_badge']);
  });

  it('carries pre-battle boons into the next fight', () => {
    let run = createRun('snip', 1);
    run = applyRunEffects(run, [
      { kind: 'startBlock', amount: 6 },
      { kind: 'startStatus', status: 'focus', amount: 2 },
    ]);
    expect(run.carry.startBlock).toBe(6);
    expect(run.carry.startStatuses.focus).toBe(2);
  });

  it('damagePart marks a slot, repairAllParts clears them', () => {
    let run = createRun('snip', 1);
    run = applyRunEffects(run, [{ kind: 'damagePart', slot: 'random' }]);
    expect(run.damagedSlots).toHaveLength(1);
    run = applyRunEffects(run, [{ kind: 'repairAllParts' }]);
    expect(run.damagedSlots).toHaveLength(0);
  });

  it('forceEncounter redirects the current node to a fight', () => {
    let run = createRun('stitch', 1);
    expect(currentEncounter(run)?.id).toBe('spider');
    run = applyRunEffects(run, [{ kind: 'forceEncounter', encounterId: 'eliteSpider' }]);
    expect(currentEncounter(run)?.id).toBe('eliteSpider');
  });
});

describe('events', () => {
  it('applies the chosen option and records it', () => {
    const run = createRun('snip', 1);
    const after = chooseEventOption(run, 'gluePool', 'salvage');
    expect(after.scrap).toBe(run.scrap + 10);
    expect(after.history.at(-1)?.detail).toBe('Salvage the mess');
  });

  it('gated options are hidden until their requirement is met', () => {
    let run = createRun('snip', 1);
    run.scrap = 2;
    expect(eventOptionAvailable(run, 'clipDrawer', 'haggle')).toBe(false);
    expect(chooseEventOption(run, 'clipDrawer', 'haggle')).toBe(run);

    run = { ...run, scrap: 30 };
    expect(eventOptionAvailable(run, 'clipDrawer', 'haggle')).toBe(true);
    const after = chooseEventOption(run, 'clipDrawer', 'haggle');
    expect(after.scrap).toBe(22);
    expect(after.shopDiscount).toBe(8);
  });

  it('an unknown option is a no-op rather than a crash', () => {
    const run = createRun('snip', 1);
    expect(chooseEventOption(run, 'gluePool', 'nope')).toBe(run);
  });
});

describe('shop', () => {
  it('rolls the configured number of offers and always includes a service', () => {
    const run = rollShop(createRun('snip', 5), 'bench');
    const offers = shopOfferItems(run, 'bench');
    expect(offers).toHaveLength(SHOPS.bench.offerCount);
    expect(offers.some((i) => i.kind === 'service')).toBe(true);
  });

  it('never offers a relic the player already owns', () => {
    let run = createRun('snip', 5);
    run.relics = ['warm_saucer', 'spring_clip', 'backup_patch'];
    run = rollShop(run, 'bench');
    const refs = shopOfferItems(run, 'bench').map((i) => i.ref);
    expect(refs).not.toContain('warm_saucer');
    expect(refs).not.toContain('spring_clip');
  });

  it('never offers a part that is already equipped', () => {
    const run = rollShop(createRun('snip', 5), 'bench');
    const equipped = Object.values(run.assembly.slots).filter(Boolean);
    for (const item of shopOfferItems(run, 'bench')) {
      if (item.kind === 'part') expect(equipped).not.toContain(item.ref);
    }
  });

  it('buying a relic spends scrap and grants it once', () => {
    let run = rollShop(createRun('snip', 5), 'bench');
    const relic = shopOfferItems(run, 'bench').find((i) => i.kind === 'relic');
    if (!relic) return;
    run.scrap = 60;
    const cost = shopItemCost(run, relic);
    const after = purchase(run, 'bench', relic.id);
    expect(after.scrap).toBe(60 - cost);
    expect(after.relics).toContain(relic.ref);
    // second purchase of the same offer is refused
    expect(canAfford(after, 'bench', relic.id)).toBe(false);
    expect(purchase(after, 'bench', relic.id)).toBe(after);
  });

  it('buying a part equips it immediately, changing the build', () => {
    let run = rollShop(createRun('snip', 5), 'bench');
    run.scrap = 99;
    const part = shopOfferItems(run, 'bench').find((i) => i.kind === 'part');
    if (!part) return;
    const before = computeBuild(run.assembly, { relics: run.relics });
    const after = purchase(run, 'bench', part.id);
    expect(Object.values(after.assembly.slots)).toContain(part.ref);
    const now = computeBuild(after.assembly, { relics: after.relics });
    expect(now).not.toEqual(before);
  });

  it('a service applies its run effects', () => {
    let run = rollShop(createRun('snip', 5), 'bench');
    run.scrap = 99;
    run.carry.hp = 5;
    const svc = shopOfferItems(run, 'bench').find((i) => i.id === 'svc_repair');
    if (!svc) return;
    const after = purchase(run, 'bench', svc.id);
    expect(after.carry.hp).toBeGreaterThan(5);
  });

  it('an unaffordable purchase is refused', () => {
    let run = rollShop(createRun('snip', 5), 'bench');
    run.scrap = 0;
    const item = shopOfferItems(run, 'bench')[0];
    expect(canAfford(run, 'bench', item.id)).toBe(false);
    expect(purchase(run, 'bench', item.id)).toBe(run);
  });

  it('a discount reduces cost but never below 1', () => {
    let run = createRun('snip', 5);
    run.shopDiscount = 999;
    const item = SHOPS.bench.pool[0];
    expect(shopItemCost(run, item)).toBe(1);
  });
});

describe('battle results and progression', () => {
  it('a win pays scrap, records history and refunds a little hp/glue', () => {
    const run = createRun('snip', 1);
    const { run: after, summary } = applyBattleResult(run, {
      cleared: true,
      hp: 10,
      glue: 4,
      turns: 6,
      peelCount: 2,
      encounterId: 'rat',
    });
    expect(summary.scrapGained).toBe(9);
    expect(after.scrap).toBe(run.scrap + 9);
    expect(after.battlesWon).toBe(1);
    expect(after.carry.hp).toBe(10 + BALANCE.run.carryHpRefund);
    expect(after.carry.glue).toBe(4 + BALANCE.run.carryGlueRefund);
    expect(after.history.at(-1)?.outcome).toBe('cleared');
    expect(after.status).toBe('active');
  });

  it('a loss ends the run', () => {
    const { run: after } = applyBattleResult(createRun('snip', 1), {
      cleared: false,
      hp: 0,
      glue: 0,
      turns: 4,
      peelCount: 3,
      encounterId: 'rat',
    });
    expect(after.status).toBe('lost');
    expect(after.history.at(-1)?.outcome).toBe('failed');
  });

  it('a boss win pays the boss reward', () => {
    const { summary } = applyBattleResult(createRun('snip', 1), {
      cleared: true, hp: 5, glue: 5, turns: 12, peelCount: 1, encounterId: 'boss',
    });
    expect(summary.scrapGained).toBe(BALANCE.run.scrap.boss);
  });

  it('advancing walks the route and finishing the last node wins the run', () => {
    let run = createRun('snip', 1);
    const total = ROUTES.snip.nodes.length;
    for (let i = 0; i < total - 1; i++) {
      expect(isFinalNode(run)).toBe(false);
      run = advanceNode(run);
    }
    expect(isFinalNode(run)).toBe(true);
    run = advanceNode(run);
    expect(run.status).toBe('won');
  });

  it('advancing clears the shop roll so the next visit re-rolls', () => {
    let run = rollShop(createRun('snip', 1), 'bench');
    expect(run.shopOffers).not.toBeNull();
    run = advanceNode(run);
    expect(run.shopOffers).toBeNull();
    expect(run.shopPurchased).toEqual([]);
  });
});

describe('carry-over interacts with assembly', () => {
  it('swapping to a lower-hp build clamps carried hp down', () => {
    let run = createRun('snip', 1);
    run = equipPart(run, 'head', 'part.head.box_shell'); // +8 hp
    const high = computeBuild(run.assembly).maxHp;
    run.carry.hp = high;

    run = equipPart(run, 'head', 'part.head.ghost_hood'); // +1 hp
    expect(run.carry.hp).toBe(computeBuild(run.assembly).maxHp);
    expect(run.carry.hp).toBeLessThan(high);
  });

  it('unequipping a slot leaves it empty and drops its stats', () => {
    let run = createRun('snip', 1);
    const before = computeBuild(run.assembly).atk;
    run = equipPart(run, 'hand', null);
    expect(run.assembly.slots.hand).toBeNull();
    expect(computeBuild(run.assembly).atk).toBeLessThan(before);
  });
});
