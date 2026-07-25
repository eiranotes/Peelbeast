/**
 * Seeded RNG.
 *
 * The whole engine is deterministic: same seed + same inputs = same battle.
 * The generator state is a plain number so it serialises straight into a save
 * and into test fixtures. Nothing in `src/game` may call `Math.random()`.
 */

export interface Rng {
  /** Current state; advance by calling the helpers with it. */
  state: number;
}

export function createRng(seed: number): Rng {
  // avoid the degenerate 0 state
  return { state: (seed >>> 0) || 0x9e3779b9 };
}

/** mulberry32 — small, fast, good enough distribution for game logic. */
function next(rng: Rng): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Float in [0, 1). Mutates `rng.state`. */
export function rngFloat(rng: Rng): number {
  return next(rng);
}

/** Integer in [0, maxExclusive). */
export function rngInt(rng: Rng, maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  return Math.floor(next(rng) * maxExclusive);
}

export function rngPick<T>(rng: Rng, items: readonly T[]): T {
  return items[rngInt(rng, items.length)];
}

export function rngChance(rng: Rng, probability: number): boolean {
  return next(rng) < probability;
}

/** Fisher-Yates on a copy. */
export function rngShuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rngInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick `n` distinct items, or all of them if the pool is smaller. */
export function rngSample<T>(rng: Rng, items: readonly T[], n: number): T[] {
  return rngShuffle(rng, items).slice(0, Math.min(n, items.length));
}

/** A fresh seed for a new run. This is the one place randomness enters. */
export function randomSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
