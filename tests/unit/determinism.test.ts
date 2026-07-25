import { describe, expect, it } from 'vitest';
import { createBattle, resolveEnemyIntent, resolvePlayerAction, resolveSkill } from '@/game/engine/battleEngine';
import { createRun, rollShop, applyRunEffects } from '@/game/engine/rewardResolver';
import { createRng, rngFloat, rngInt, rngPick, rngSample, rngShuffle } from '@/game/engine/rng';
import { createAssembly } from '@/game/systems/assemblySystem';
import { DEFAULT_LOADOUT } from '@/game/data/parts';
import type { BattleState } from '@/game/state/battleState';

/**
 * The determinism contract. Without it the engine cannot be regression-tested,
 * balance cannot be simulated and a reported bug cannot be reproduced — which is
 * exactly where v0.8's bare `Math.random()` calls left it.
 */

function playScript(seed: number): BattleState {
  let b = createBattle({
    encounterId: 'spider',
    assembly: createAssembly(DEFAULT_LOADOUT),
    relics: ['pin_badge'],
    seed,
  });
  const script = ['attack', 'guard', 'attack', 'repair', 'press', 'attack', 'guard', 'attack'] as const;
  for (const action of script) {
    if (b.outcome !== 'ongoing') break;
    b = resolvePlayerAction(b, action);
    b = resolveEnemyIntent(b);
  }
  return b;
}

/** fx carries no state; strip it so comparison is about the model, not motion. */
function fingerprint(b: BattleState) {
  return JSON.stringify({ ...b, fx: [] });
}

describe('rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(42);
    const c = createRng(42);
    for (let i = 0; i < 50; i++) expect(rngFloat(a)).toBe(rngFloat(c));
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 20 }, () => rngFloat(a));
    const seqB = Array.from({ length: 20 }, () => rngFloat(b));
    expect(seqA).not.toEqual(seqB);
  });

  it('stays inside its declared bounds', () => {
    const r = createRng(9);
    for (let i = 0; i < 400; i++) {
      const f = rngFloat(r);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = rngInt(r, 7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
    }
  });

  it('shuffle and sample preserve membership', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const r = createRng(5);
    expect(rngShuffle(r, items).sort((a, b) => a - b)).toEqual(items);
    const sample = rngSample(createRng(5), items, 3);
    expect(sample).toHaveLength(3);
    expect(new Set(sample).size).toBe(3);
    for (const s of sample) expect(items).toContain(s);
  });

  it('sample never asks for more than the pool holds', () => {
    expect(rngSample(createRng(1), [1, 2], 9)).toHaveLength(2);
  });

  it('rngPick works on a single-item pool', () => {
    expect(rngPick(createRng(3), ['only'])).toBe('only');
  });
});

describe('battle determinism', () => {
  it('same seed + same actions = identical state', () => {
    expect(fingerprint(playScript(2024))).toBe(fingerprint(playScript(2024)));
  });

  it('different seeds diverge', () => {
    expect(fingerprint(playScript(1))).not.toBe(fingerprint(playScript(999)));
  });

  it('the rng cursor travels with the state, so a clone continues identically', () => {
    let a = createBattle({ encounterId: 'rat', assembly: createAssembly(DEFAULT_LOADOUT), relics: [], seed: 77 });
    a = resolvePlayerAction(a, 'attack');
    const branch = structuredClone(a);

    const left = resolveEnemyIntent(a);
    const right = resolveEnemyIntent(branch);
    expect(fingerprint(left)).toBe(fingerprint(right));
  });

  it('skills are deterministic too', () => {
    const run = (seed: number) => {
      let b = createBattle({ encounterId: 'rat', assembly: createAssembly(DEFAULT_LOADOUT), relics: [], seed });
      b = resolveSkill(b, 'hand');
      b = resolveEnemyIntent(b);
      b = resolveSkill(b, 'core');
      return fingerprint(b);
    };
    expect(run(555)).toBe(run(555));
  });
});

describe('run determinism', () => {
  it('shop rolls are reproducible from the run seed', () => {
    const a = rollShop(createRun('snip', 4242), 'bench');
    const b = rollShop(createRun('snip', 4242), 'bench');
    expect(a.shopOffers).toEqual(b.shopOffers);
    expect(a.rngState).toBe(b.rngState);
  });

  it('random relic grants are reproducible', () => {
    const a = applyRunEffects(createRun('snip', 88), [{ kind: 'randomRelic' }]);
    const b = applyRunEffects(createRun('snip', 88), [{ kind: 'randomRelic' }]);
    expect(a.relics).toEqual(b.relics);
    expect(a.relics).toHaveLength(1);
  });

  it('different run seeds produce different shops', () => {
    const a = rollShop(createRun('snip', 1), 'bench');
    const b = rollShop(createRun('snip', 2), 'bench');
    expect(a.shopOffers).not.toEqual(b.shopOffers);
  });
});
