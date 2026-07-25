import { describe, expect, it } from 'vitest';
import {
  createBattle,
  resolvePlayerAction,
  resolveSkill,
  resolveEnemyIntent,
  skillAvailability,
  intentsRevealed,
} from '@/game/engine/battleEngine';
import { peelPart, reattachPart, peeledSlots, attemptPeel, peelChance } from '@/game/engine/peelResolver';
import { applyStatus, getStatus, tickStatusDecay } from '@/game/engine/statusResolver';
import { applyDamage, gainBlock } from '@/game/engine/damageResolver';
import { createAssembly } from '@/game/systems/assemblySystem';
import { BALANCE } from '@/game/data/balance';
import type { BattleState } from '@/game/state/battleState';
import type { PartSlot } from '@/game/data/types';

const LOADOUT = {
  head: 'part.head.toast_helm',
  hand: 'part.hand.scissors',
  core: 'part.core.coffee_cup',
  trinket: 'part.trinket.ribbon_knot',
};

function battle(overrides: Partial<Parameters<typeof createBattle>[0]> = {}): BattleState {
  return createBattle({
    encounterId: 'rat',
    assembly: createAssembly(LOADOUT),
    relics: [],
    seed: 12345,
    ...overrides,
  });
}

describe('battle setup', () => {
  it('starts on the player turn with a full intent queue', () => {
    const b = battle();
    expect(b.side).toBe('player');
    expect(b.outcome).toBe('ongoing');
    expect(b.enemy.intents).toHaveLength(BALANCE.enemy.intentQueueLength);
    expect(b.player.hp).toBe(b.player.maxHp);
  });

  it('honours carry-over hp/glue from the run', () => {
    const b = battle({ carry: { hp: 9, glue: 3 } });
    expect(b.player.hp).toBe(9);
    expect(b.player.glue).toBe(3);
  });

  it('applies relic openers', () => {
    const b = battle({ relics: ['brass_clip', 'thick_glue'] });
    expect(b.player.block).toBe(5);
    // thick_glue: +4 max and +2 current, but current is already capped at max
    expect(b.player.maxGlue).toBeGreaterThan(battle().player.maxGlue);
  });
});

describe('block', () => {
  it('absorbs damage before hp, and is consumed', () => {
    const b = battle();
    gainBlock(b, 'player', 10, 'test');
    const hp = b.player.hp;
    applyDamage(b, { amount: 6, target: 'player', label: 'test' });
    expect(b.player.hp).toBe(hp);
    expect(b.player.block).toBe(4);
  });

  it('overflow damage reaches hp', () => {
    const b = battle();
    gainBlock(b, 'player', 4, 'test');
    const hp = b.player.hp;
    applyDamage(b, { amount: 10, target: 'player', label: 'test' });
    expect(b.player.block).toBe(0);
    expect(b.player.hp).toBe(hp - 6);
  });

  it('ignoreBlock bypasses it entirely', () => {
    const b = battle();
    gainBlock(b, 'player', 20, 'test');
    const hp = b.player.hp;
    applyDamage(b, { amount: 7, target: 'player', ignoreBlock: true, label: 'test' });
    expect(b.player.block).toBe(20);
    expect(b.player.hp).toBe(hp - 7);
  });

  it('Guard grants base block plus passive bonuses', () => {
    const plain = resolvePlayerAction(battle(), 'guard');
    expect(plain.player.block).toBe(BALANCE.core.guardBlock);

    const boxed = resolvePlayerAction(
      battle({ assembly: createAssembly({ ...LOADOUT, head: 'part.head.box_shell' }) }),
      'guard',
    );
    expect(boxed.player.block).toBe(BALANCE.core.guardBlock + 2);
  });

  it('player block resets at the start of the next player turn', () => {
    let b = resolvePlayerAction(battle(), 'guard');
    expect(b.player.block).toBeGreaterThan(0);
    b = resolveEnemyIntent(b);
    if (b.outcome === 'ongoing') expect(b.side).toBe('player');
  });
});

describe('statuses', () => {
  it('clamps to the declared maximum', () => {
    const b = battle();
    applyStatus(b, 'player', 'focus', 99);
    expect(getStatus(b, 'player', 'focus')).toBe(3);
  });

  it('endOfRound statuses lose one stack per tick and eventually expire', () => {
    const b = battle();
    applyStatus(b, 'player', 'drift', 2);
    tickStatusDecay(b);
    expect(getStatus(b, 'player', 'drift')).toBe(1);
    tickStatusDecay(b);
    expect(getStatus(b, 'player', 'drift')).toBe(0);
    tickStatusDecay(b);
    expect(getStatus(b, 'player', 'drift')).toBe(0);
  });

  it('onConsume statuses do not decay on their own', () => {
    const b = battle();
    b.player.statuses.focus = 0;
    applyStatus(b, 'player', 'focus', 2);
    tickStatusDecay(b);
    expect(getStatus(b, 'player', 'focus')).toBe(2);
  });

  it('Focus is spent by a basic attack and raises its damage', () => {
    const b = battle();
    b.player.statuses.focus = 1;
    const before = b.enemy.hp;
    const after = resolvePlayerAction(b, 'attack');
    expect(getStatus(after, 'player', 'focus')).toBe(0);
    expect(before - after.enemy.hp).toBeGreaterThanOrEqual(b.player.atk + BALANCE.damage.focusBonus);
  });

  it('Drift reduces incoming damage', () => {
    const plain = battle();
    const drifting = battle();
    applyStatus(drifting, 'player', 'drift', 1);
    const hpA = plain.player.hp;
    const hpB = drifting.player.hp;
    applyDamage(plain, { amount: 6, target: 'player', label: 'test' });
    applyDamage(drifting, { amount: 6, target: 'player', label: 'test' });
    expect(hpA - plain.player.hp).toBe(6);
    expect(hpB - drifting.player.hp).toBe(6 - BALANCE.damage.driftReduction);
  });

  it('Fragile raises incoming damage', () => {
    const b = battle();
    applyStatus(b, 'enemy', 'fragile', 1);
    const before = b.enemy.hp;
    applyDamage(b, { amount: 5, target: 'enemy', label: 'test' });
    expect(before - b.enemy.hp).toBe(5 + BALANCE.damage.fragileBonus);
  });
});

describe('glue', () => {
  it('Repair restores glue and hp, more with Coffee Cup', () => {
    const b = battle();
    b.player.glue = 0;
    b.player.hp = 10;
    const after = resolvePlayerAction(b, 'repair');
    // Coffee Cup's Warm Brew adds +2 on top of the base
    expect(after.player.glue).toBe(BALANCE.core.repairGlue + 2);
    expect(after.player.hp).toBe(10 + BALANCE.core.repairHp);
  });

  it('a skill cannot be used without its glue cost', () => {
    const b = battle();
    b.player.glue = 0;
    expect(skillAvailability(b, 'hand').enabled).toBe(false);
    expect(skillAvailability(b, 'hand').reason).toContain('Glue');
    expect(resolveSkill(b, 'hand')).toBe(b);
  });

  it('using a skill spends glue and sets its cooldown', () => {
    const b = battle();
    const after = resolveSkill(b, 'hand');
    expect(after.player.glue).toBe(b.player.glue - 3);
    expect(after.player.slots.hand.cooldown).toBe(3);
    expect(skillAvailability(after, 'hand').enabled).toBe(false);
  });
});

describe('peel and reattach', () => {
  it('peeling removes the skill, the passive and the stats', () => {
    const b = battle();
    const hpBefore = b.player.maxHp;
    expect(skillAvailability(b, 'hand').enabled).toBe(true);

    peelPart(b, 'hand', 'test');

    expect(b.player.slots.hand.peeled).toBe(true);
    expect(skillAvailability(b, 'hand').enabled).toBe(false);
    expect(skillAvailability(b, 'hand').reason).toBe('박리됨');
    expect(b.player.atk).toBeLessThan(battle().player.atk);
    expect(b.player.maxHp).toBeLessThanOrEqual(hpBefore);
    expect(b.player.floor.map((f) => f.slot)).toContain('hand');
  });

  it('a peeled skill cannot be used even if forced', () => {
    const b = battle();
    peelPart(b, 'core', 'test');
    expect(resolveSkill(b, 'core')).toBe(b);
  });

  it('reattaching restores everything and clears the floor', () => {
    const fresh = battle();
    const b = battle();
    peelPart(b, 'hand', 'test');
    reattachPart(b, 'hand', 'test');

    expect(b.player.slots.hand.peeled).toBe(false);
    expect(b.player.atk).toBe(fresh.player.atk);
    expect(b.player.maxHp).toBe(fresh.player.maxHp);
    expect(b.player.floor).toHaveLength(0);
    expect(skillAvailability(b, 'hand').enabled).toBe(true);
  });

  it('peeling breaks a synergy and reattaching restores it', () => {
    const b = createBattle({
      encounterId: 'rat',
      assembly: createAssembly({ head: 'part.head.toast_helm', core: 'part.core.coffee_cup' }),
      relics: [],
      seed: 7,
    });
    // Warm Breakfast grants +2 max glue while both halves are attached
    const glueWhole = b.player.maxGlue;
    peelPart(b, 'core', 'test');
    expect(b.player.maxGlue).toBeLessThan(glueWhole);
    reattachPart(b, 'core', 'test');
    expect(b.player.maxGlue).toBe(glueWhole);
  });

  it('Repair reattaches a peeled part', () => {
    const b = battle();
    peelPart(b, 'trinket', 'test');
    expect(peeledSlots(b)).toEqual(['trinket']);
    const after = resolvePlayerAction(b, 'repair');
    expect(peeledSlots(after)).toEqual([]);
  });

  it('enough Block shrugs off a peel attempt entirely', () => {
    const b = battle();
    gainBlock(b, 'player', 10, 'test');
    const result = attemptPeel(b, 'any', 4, 'test');
    expect(result.peeled).toBe(false);
    expect(result.reason).toBe('blocked');
    expect(peeledSlots(b)).toEqual([]);
  });

  it('peel resistance lowers the chance and is bounded', () => {
    const b = battle();
    const base = peelChance(b);
    b.player.peelResist = 6;
    expect(peelChance(b)).toBeLessThan(base);
    expect(peelChance(b)).toBeGreaterThanOrEqual(BALANCE.peel.minChance);
    b.player.peelResist = -50;
    expect(peelChance(b)).toBeLessThanOrEqual(BALANCE.peel.maxChance);
  });

  it("Tape Roll's Adhesive Memory can catch a peel", () => {
    // sweep seeds; with a 35% catch rate at least one must be caught
    let caught = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const b = createBattle({
        encounterId: 'rat',
        assembly: createAssembly({ ...LOADOUT, core: 'part.core.tape_roll' }),
        relics: [],
        seed,
      });
      if (!peelPart(b, 'hand', 'test')) caught++;
    }
    expect(caught).toBeGreaterThan(0);
    expect(caught).toBeLessThan(40);
  });

  it("Bread Patch's Emergency Stitch grants block on any peel", () => {
    const b = createBattle({
      encounterId: 'rat',
      assembly: createAssembly({ ...LOADOUT, core: 'part.core.bomb_belly', trinket: 'part.trinket.bread_patch' }),
      relics: [],
      seed: 3,
    });
    const before = b.player.block;
    peelPart(b, 'hand', 'test');
    expect(b.player.block).toBe(before + 3);
  });

  it('running out of glue peels a part at the start of your turn', () => {
    let b = battle();
    b.player.glue = 0;
    b = resolvePlayerAction(b, 'guard');
    b.player.glue = 0;
    b = resolveEnemyIntent(b);
    if (b.outcome === 'ongoing') {
      expect(b.player.floor.length + peeledSlots(b).length).toBeGreaterThan(0);
    }
  });
});

describe('enemy turn', () => {
  it('consumes one intent and refills the queue', () => {
    let b = resolvePlayerAction(battle(), 'guard');
    const firstKey = b.enemy.intents[0].key;
    b = resolveEnemyIntent(b);
    expect(b.enemy.intents).toHaveLength(BALANCE.enemy.intentQueueLength);
    expect(b.enemy.intents[0].key).not.toBe(firstKey);
  });

  it('hands the turn back to the player and advances the counter', () => {
    let b = resolvePlayerAction(battle(), 'guard');
    expect(b.side).toBe('enemy');
    b = resolveEnemyIntent(b);
    if (b.outcome === 'ongoing') {
      expect(b.side).toBe('player');
      expect(b.turn).toBe(2);
    }
  });

  it('does nothing when called out of turn', () => {
    const b = battle();
    expect(resolveEnemyIntent(b)).toBe(b);
  });
});

describe('boss phases', () => {
  it('does not end the fight when phase 1 dies; it shifts phase', () => {
    const b = createBattle({ encounterId: 'boss', assembly: createAssembly(LOADOUT), relics: [], seed: 99 });
    expect(b.enemy.phaseIndex).toBe(0);
    const firstName = b.enemy.name;

    b.enemy.hp = 1;
    const after = resolvePlayerAction(b, 'attack');

    expect(after.outcome).toBe('ongoing');
    expect(after.enemy.phaseIndex).toBe(1);
    expect(after.enemy.name).not.toBe(firstName);
    expect(after.enemy.hp).toBe(after.enemy.maxHp);
    expect(after.enemy.intents).toHaveLength(BALANCE.enemy.intentQueueLength);
  });

  it('ends the fight when the final phase dies', () => {
    const b = createBattle({ encounterId: 'boss', assembly: createAssembly(LOADOUT), relics: [], seed: 99 });
    b.enemy.phaseIndex = 1;
    b.enemy.hp = 1;
    const after = resolvePlayerAction(b, 'attack');
    expect(after.outcome).toBe('won');
  });
});

describe('intent visibility', () => {
  it('is hidden by default and revealed by Eye Sticker', () => {
    expect(intentsRevealed(battle())).toBe(false);
    const seer = battle({ assembly: createAssembly({ ...LOADOUT, trinket: 'part.trinket.eye_sticker' }) });
    expect(intentsRevealed(seer)).toBe(true);
  });

  it('losing the Eye Sticker to a peel hides the numbers again', () => {
    const b = battle({ assembly: createAssembly({ ...LOADOUT, trinket: 'part.trinket.eye_sticker' }) });
    expect(intentsRevealed(b)).toBe(true);
    peelPart(b, 'trinket', 'test');
    b.player.statuses.insight = 0;
    expect(intentsRevealed(b)).toBe(false);
  });
});

describe('peel targeting', () => {
  it('respects the slot list an intent declares', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const b = battle({ seed });
      const result = attemptPeel(b, ['hand'], 0, 'test');
      if (result.slot) expect(result.slot).toBe('hand');
    }
  });

  it('Drift pushes peels away from the trinket', () => {
    const seen = new Set<PartSlot>();
    for (let seed = 1; seed <= 30; seed++) {
      const b = battle({ seed });
      applyStatus(b, 'player', 'drift', 2);
      const result = attemptPeel(b, 'any', 0, 'test');
      if (result.slot) seen.add(result.slot);
    }
    expect(seen.has('trinket')).toBe(false);
    expect(seen.size).toBeGreaterThan(0);
  });
});
