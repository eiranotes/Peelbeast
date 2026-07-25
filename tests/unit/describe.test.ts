import { describe, expect, it } from 'vitest';
import { describeIntent, describeEffects, peelTargetLabel } from '@/game/engine/describe';
import { createBattle, resolvePlayerAction, resolveEnemyIntent } from '@/game/engine/battleEngine';
import { createAssembly } from '@/game/systems/assemblySystem';
import { DEFAULT_LOADOUT, PARTS } from '@/game/data/parts';
import { INTENTS } from '@/game/data/intents';
import type { BattleState } from '@/game/state/battleState';

function fresh(seed = 11): BattleState {
  return createBattle({ encounterId: 'rat', assembly: createAssembly(DEFAULT_LOADOUT), relics: [], seed });
}

/**
 * The single most important guarantee of the rewrite: the number on the intent
 * card is the number the resolver deals. v0.8 kept them in two places and they
 * diverged the moment Fury was introduced — this file locks that shut.
 */
describe('intent preview matches what actually happens', () => {
  it('predicted damage equals the hp lost, for every pure-damage intent', () => {
    const pureDamage = Object.values(INTENTS).filter(
      (i) => i.effects.length === 1 && i.effects[0].kind === 'damage' && !i.effects[0].bonus,
    );
    expect(pureDamage.length).toBeGreaterThan(0);

    for (const intent of pureDamage) {
      const b = fresh();
      b.enemy.intents[0] = { key: 'k', intentId: intent.id, bonusDamage: 0, weakened: 0 };
      const preview = describeIntent(b, b.enemy.intents[0], true);

      let after = resolvePlayerAction(b, 'press'); // no block, no damage
      const hpBefore = after.player.hp;
      after = resolveEnemyIntent(after);
      const lost = hpBefore - after.player.hp;

      expect(lost, intent.id).toBe(preview.damage);
    }
  });

  it('Fury is reflected in the preview, not just in the arithmetic', () => {
    const b = fresh();
    b.enemy.intents[0] = { key: 'k', intentId: 'pounce', bonusDamage: 0, weakened: 0 };
    const base = describeIntent(b, b.enemy.intents[0], true).damage!;

    b.enemy.fury = 3;
    const furious = describeIntent(b, b.enemy.intents[0], true).damage!;
    expect(furious).toBe(base + 3);

    let after = resolvePlayerAction(b, 'press');
    const hpBefore = after.player.hp;
    after = resolveEnemyIntent(after);
    expect(hpBefore - after.player.hp).toBe(furious);
  });

  it('weakening from Copy Eye lowers the preview and the real hit together', () => {
    const b = fresh();
    b.enemy.intents[0] = { key: 'k', intentId: 'pounce', bonusDamage: 0, weakened: 2 };
    const preview = describeIntent(b, b.enemy.intents[0], true);

    let after = resolvePlayerAction(b, 'press');
    const hpBefore = after.player.hp;
    after = resolveEnemyIntent(after);
    expect(hpBefore - after.player.hp).toBe(preview.damage);
  });

  it('multi-hit intents report the total, not the per-hit figure', () => {
    const b = fresh();
    b.enemy.intents[0] = { key: 'k', intentId: 'scratchRush', bonusDamage: 0, weakened: 0 };
    const preview = describeIntent(b, b.enemy.intents[0], true);
    expect(preview.hits).toBe(2);
    expect(preview.damage).toBe(6);
  });

  it('surfaces the structured fields the battle UI needs', () => {
    const b = fresh();
    b.enemy.intents[0] = { key: 'k', intentId: 'webWrap', bonusDamage: 0, weakened: 0 };
    const p = describeIntent(b, b.enemy.intents[0], true);
    expect(p.peelTargets).toEqual(['hand']);
    expect(p.peelBlockThreshold).toBe(4);
    expect(p.statuses.map((s) => s.status)).toContain('bind');
    expect(p.blockable).toBe(true);
    expect(p.piercing).toBe(false);
    expect(['low', 'medium', 'high', 'extreme']).toContain(p.danger);
  });

  it('marks a peeling intent as at least high danger', () => {
    const b = fresh();
    for (const id of ['webWrap', 'shearPluck', 'undercut', 'snarePluck', 'clipSnip']) {
      const p = describeIntent(b, { key: 'k', intentId: id, bonusDamage: 0, weakened: 0 }, true);
      expect(['high', 'extreme'], id).toContain(p.danger);
    }
  });

  it('marks piercing intents as unblockable in the preview', () => {
    const b = fresh();
    const p = describeIntent(b, { key: 'k', intentId: 'talonRake', bonusDamage: 0, weakened: 0 }, true);
    expect(p.piercing).toBe(true);
    expect(p.blockable).toBe(false);
  });
});

describe('generated ability text', () => {
  it('produces a non-empty line for every skill and intent', () => {
    for (const part of Object.values(PARTS)) {
      const lines = describeEffects(part.active.effects);
      expect(lines.length, part.active.id).toBeGreaterThan(0);
      for (const l of lines) expect(l.trim()).not.toBe('');
    }
    for (const intent of Object.values(INTENTS)) {
      const lines = describeEffects(intent.effects);
      expect(lines.length, intent.id).toBeGreaterThan(0);
    }
  });

  it('mentions the real damage figure', () => {
    expect(describeEffects([{ kind: 'damage', amount: 8 }])).toEqual(['8 피해']);
    expect(describeEffects([{ kind: 'damage', amount: 3, hits: 2 }])).toEqual(['3 피해 x2']);
    expect(describeEffects([{ kind: 'damage', amount: 6, ignoreBlock: true }])[0]).toContain('관통');
  });

  it('labels peel targets', () => {
    expect(peelTargetLabel('any')).toBe('아무 파츠나');
    expect(peelTargetLabel(['head', 'trinket'])).toBe('Head / Trinket');
    expect(peelTargetLabel(null)).toBeNull();
  });
});
