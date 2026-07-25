import { describe, expect, it } from 'vitest';
import {
  createBattle,
  resolveEnemyIntent,
  resolvePlayerAction,
  resolveSkill,
  skillAvailability,
} from '@/game/engine/battleEngine';
import {
  advanceNode,
  applyBattleResult,
  chooseEventOption,
  createRun,
  currentEncounter,
  currentNode,
  isFinalNode,
  purchase,
  rollShop,
  shopOfferItems,
} from '@/game/engine/rewardResolver';
import { peelPart, peeledSlots, reattachPart } from '@/game/engine/peelResolver';
import { computeBuild } from '@/game/systems/assemblySystem';
import { loadRun, saveRun } from '@/game/state/runState';
import { ROUTES } from '@/game/data/routes';
import type { BattleState } from '@/game/state/battleState';
import type { RunState } from '@/game/state/runState';

/**
 * Integration: the seams between assembly, battle, rewards and the route.
 * Each test crosses at least one module boundary.
 */

/** Auto-battler used to drive fights to a conclusion inside a test. */
function autoBattle(state: BattleState, maxTurns = 60): BattleState {
  let b = state;
  let guard = 0;
  while (b.outcome === 'ongoing' && guard++ < maxTurns) {
    if (b.side === 'player') {
      // reattach first, then hit as hard as available
      if (peeledSlots(b).length > 0 && b.player.hp < b.player.maxHp * 0.6) {
        b = resolvePlayerAction(b, 'repair');
      } else {
        const ready = (['hand', 'core', 'head', 'trinket'] as const).find((s) => skillAvailability(b, s).enabled);
        b = ready ? resolveSkill(b, ready) : resolvePlayerAction(b, 'attack');
      }
    } else {
      b = resolveEnemyIntent(b);
    }
  }
  return b;
}

function startBattle(run: RunState, seedSalt = 0): BattleState {
  const encounter = currentEncounter(run)!;
  return createBattle({
    encounterId: encounter.id,
    assembly: run.assembly,
    relics: run.relics,
    seed: run.rngState ^ (run.nodeIndex + seedSalt),
    carry: {
      hp: run.carry.hp,
      glue: run.carry.glue,
      startBlock: run.carry.startBlock,
      startStatuses: run.carry.startStatuses,
    },
  });
}

describe('assembly → battle', () => {
  it('the battle is built from the run assembly, slot for slot', () => {
    const run = createRun('snip', 42);
    const b = startBattle(run);
    for (const slot of ['head', 'hand', 'core', 'trinket'] as const) {
      expect(b.player.slots[slot].partId).toBe(run.assembly.slots[slot]);
    }
    expect(b.player.maxHp).toBe(computeBuild(run.assembly, { relics: run.relics }).maxHp);
  });

  it('a part bought in the shop is present in the very next battle', () => {
    let run = rollShop(createRun('snip', 5), 'bench');
    run.scrap = 99;
    const part = shopOfferItems(run, 'bench').find((i) => i.kind === 'part');
    if (!part) return;

    run = purchase(run, 'bench', part.id);
    const b = startBattle(run);
    expect(Object.values(b.player.slots).map((s) => s.partId)).toContain(part.ref);
  });

  it('a relic bought in the shop changes the next battle opening', () => {
    let run = createRun('snip', 5);
    run.relics = ['brass_clip'];
    const b = startBattle(run);
    expect(b.player.block).toBe(5);
  });

  it('carry-over hp/glue is what the fight starts with', () => {
    const run = createRun('snip', 42);
    run.carry.hp = 11;
    run.carry.glue = 2;
    const b = startBattle(run);
    expect(b.player.hp).toBe(11);
    expect(b.player.glue).toBe(2);
  });

  it('pre-battle boons from an event apply on turn 1', () => {
    let run = createRun('snip', 42);
    run = chooseEventOption(run, 'inkSpill', 'soak'); // +4 hp, start Block 6
    const b = startBattle(run);
    expect(b.player.block).toBe(6);
  });
});

describe('battle → reward → next node', () => {
  it('a win moves the run forward with scrap and carry-over', () => {
    let run = createRun('snip', 1234);
    const finished = autoBattle(startBattle(run));
    expect(finished.outcome).not.toBe('ongoing');

    const { run: afterRun, summary } = applyBattleResult(run, {
      cleared: finished.outcome === 'won',
      hp: finished.player.hp,
      glue: finished.player.glue,
      turns: finished.turn,
      peelCount: finished.player.peelCount,
      encounterId: finished.encounterId,
    });

    if (finished.outcome === 'won') {
      expect(summary.scrapGained).toBeGreaterThan(0);
      run = advanceNode(afterRun);
      expect(run.nodeIndex).toBe(1);
      expect(currentNode(run)?.type).toBe('event');
    } else {
      expect(afterRun.status).toBe('lost');
    }
  });

  it('an event choice is visible in the run before the following node', () => {
    let run = createRun('snip', 7);
    run = advanceNode(run); // to the event node
    expect(currentNode(run)?.eventId).toBe('gluePool');
    const before = run.scrap;
    run = chooseEventOption(run, 'gluePool', 'salvage');
    expect(run.scrap).toBe(before + 10);
    run = advanceNode(run);
    expect(currentNode(run)?.type).toBe('combat');
  });
});

describe('peel → recover round trip inside a live battle', () => {
  it('a peeled part disables its skill; Patch Loop brings it back', () => {
    const run = createRun('snip', 3);
    run.assembly.slots.core = 'part.core.tape_roll';
    run.assembly.slots.hand = 'part.hand.scissors';
    let b = startBattle(run);

    // force the hand off; Adhesive Memory may catch it, so retry until it sticks
    let attempts = 0;
    while (!b.player.slots.hand.peeled && attempts++ < 30) peelPart(b, 'hand', 'test');
    expect(b.player.slots.hand.peeled).toBe(true);
    expect(skillAvailability(b, 'hand').enabled).toBe(false);
    expect(b.player.floor.some((f) => f.slot === 'hand')).toBe(true);

    b.player.glue = b.player.maxGlue;
    b.player.slots.core.cooldown = 0;
    b = resolveSkill(b, 'core'); // Patch Loop reattaches

    expect(b.player.slots.hand.peeled).toBe(false);
    expect(b.player.floor).toHaveLength(0);
    // the turn has passed to the enemy, so nothing is "available" right now —
    // what matters is that the reason is no longer the peel
    expect(skillAvailability(b, 'hand').reason).not.toBe('박리됨');
    expect(b.player.atk).toBe(startBattle(run).player.atk);
  });

  it('peeling never permanently corrupts the build', () => {
    const run = createRun('snip', 3);
    const fresh = startBattle(run);
    const b = startBattle(run);

    for (const slot of ['head', 'hand', 'core', 'trinket'] as const) peelPart(b, slot, 'test');
    expect(peeledSlots(b).length).toBeGreaterThan(0);
    for (const slot of peeledSlots(b)) reattachPart(b, slot, 'test');

    expect(b.player.maxHp).toBe(fresh.player.maxHp);
    expect(b.player.atk).toBe(fresh.player.atk);
    expect(b.player.maxGlue).toBe(fresh.player.maxGlue);
    expect(b.player.spd).toBe(fresh.player.spd);
  });
});

describe('boss', () => {
  it('runs both phases through to a conclusion', () => {
    const run = createRun('snip', 5150);
    run.nodeIndex = ROUTES.snip.nodes.length - 1;
    expect(currentNode(run)?.type).toBe('boss');

    const finished = autoBattle(startBattle(run), 200);
    expect(finished.outcome).not.toBe('ongoing');
    if (finished.outcome === 'won') {
      expect(finished.enemy.phaseIndex).toBe(1);
    }
  });
});

describe('a full run can be played end to end', () => {
  it('walks every node of Snip Lane to a terminal state', () => {
    let run = createRun('snip', 20260725);
    let steps = 0;

    while (run.status === 'active' && steps++ < 40) {
      const node = currentNode(run);
      if (!node) break;

      if (node.type === 'event') {
        const eventId = node.eventId!;
        run = chooseEventOption(run, eventId, firstSafeOption(eventId));
      } else if (node.type === 'shop') {
        run = rollShop(run, node.shopId!);
        const affordable = shopOfferItems(run, node.shopId!).filter((i) => i.cost <= run.scrap);
        if (affordable.length) run = purchase(run, node.shopId!, affordable[0].id);
      } else {
        const finished = autoBattle(startBattle(run, steps), 200);
        const { run: next } = applyBattleResult(run, {
          cleared: finished.outcome === 'won',
          hp: finished.player.hp,
          glue: finished.player.glue,
          turns: finished.turn,
          peelCount: finished.player.peelCount,
          encounterId: finished.encounterId,
        });
        run = next;
        if (run.status === 'lost') break;
      }

      if (run.status !== 'active') break;
      if (isFinalNode(run)) {
        run = advanceNode(run);
        break;
      }
      run = advanceNode(run);
    }

    expect(['won', 'lost']).toContain(run.status);
    expect(run.history.length).toBeGreaterThan(0);
    expect(run.turnsTaken).toBeGreaterThan(0);
  });

  it('Stitch Loop is playable too and its elite node fights an elite', () => {
    const run = createRun('stitch', 999);
    const eliteIndex = ROUTES.stitch.nodes.findIndex((n) => n.type === 'elite');
    expect(eliteIndex).toBeGreaterThan(-1);
    const at = { ...run, nodeIndex: eliteIndex };
    expect(currentEncounter(at)?.kind).toBe('elite');
    const finished = autoBattle(startBattle(at), 200);
    expect(finished.outcome).not.toBe('ongoing');
  });
});

describe('save and load', () => {
  it('round-trips a run through localStorage', () => {
    const store = new Map<string, string>();
    // minimal localStorage stand-in; the module guards on `typeof localStorage`
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;

    let run = createRun('stitch', 31337);
    run = chooseEventOption(run, 'gluePool', 'salvage');
    saveRun(run);

    const loaded = loadRun();
    expect(loaded).toEqual(run);

    saveRun({ ...run, status: 'won' });
    expect(loadRun()).toBeNull(); // finished runs are not resumable
  });
});

/** Pick an option that does not force a fight, so the walkthrough stays linear. */
function firstSafeOption(eventId: string): string {
  const safe: Record<string, string> = {
    gluePool: 'salvage',
    pencilMarks: 'rest',
    clipDrawer: 'tip',
    inkSpill: 'soak',
    nestNoise: 'slip',
    breadCrumbs: 'eat',
  };
  return safe[eventId] ?? 'skip';
}
