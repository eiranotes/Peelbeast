import { describe, expect, it } from 'vitest';
import { validateContent } from '@/game/data/validate';
import { validateCatalog } from '@/assets/assetLoader';
import { ASSET_CATALOG } from '@/assets/assetCatalog';
import { PARTS, partsForSlot } from '@/game/data/parts';
import { INTENTS } from '@/game/data/intents';
import { ROUTES } from '@/game/data/routes';
import { EVENTS } from '@/game/data/events';
import { SHOPS } from '@/game/data/shops';
import { effectLabel } from '@/components/event/EventScreen';

/**
 * The class of bug this file exists to prevent: a typo'd part id, skill id or
 * asset id surviving to runtime. In v0.8 every one of those was a silent
 * failure — a black rectangle or a no-op button.
 */
describe('content integrity', () => {
  it('has no cross-reference errors', () => {
    const errors = validateContent().filter((i) => i.level === 'error');
    expect(errors.map((e) => `${e.where}: ${e.message}`)).toEqual([]);
  });

  it('has no asset catalog errors', () => {
    const errors = validateCatalog().filter((i) => i.level === 'error');
    expect(errors.map((e) => `${e.id}: ${e.message}`)).toEqual([]);
  });

  it('every part asset id resolves to a part-category catalog entry', () => {
    for (const part of Object.values(PARTS)) {
      const entry = ASSET_CATALOG[part.assetId];
      expect(entry, `${part.id} -> ${part.assetId}`).toBeDefined();
      expect(entry.category).toBe('part');
      expect(entry.slot).toBe(part.slot);
    }
  });

  it('offers at least three parts per slot', () => {
    for (const slot of ['head', 'hand', 'core', 'trinket'] as const) {
      expect(partsForSlot(slot).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('every intent is reachable from some encounter', () => {
    const warnings = validateContent().filter((i) => i.level === 'warning' && i.message.includes('not referenced'));
    expect(warnings).toEqual([]);
  });

  it('both routes end on a boss and contain every node type', () => {
    for (const route of Object.values(ROUTES)) {
      const types = new Set(route.nodes.map((n) => n.type));
      expect(route.nodes[route.nodes.length - 1].type).toBe('boss');
      expect(types.has('combat')).toBe(true);
      expect(types.has('event')).toBe(true);
      expect(types.has('shop')).toBe(true);
    }
    // and the two routes must actually differ, not just be reordered
    const [a, b] = Object.values(ROUTES);
    expect(a.nodes.map((n) => n.type).join()).not.toBe(b.nodes.map((n) => n.type).join());
    expect(a.profile.risk).not.toBe(b.profile.risk);
  });

  it('intent definitions never claim to be both piercing and blockable', () => {
    for (const intent of Object.values(INTENTS)) {
      expect(intent.piercing && intent.blockable, intent.id).toBe(false);
    }
  });

  it('placeholders never declare a fallback (they are the fallback)', () => {
    for (const entry of Object.values(ASSET_CATALOG)) {
      if (entry.category === 'placeholder') expect(entry.fallbackFile).toBeUndefined();
    }
  });

  /**
   * An event option's numbers are generated from its `effects`. A description
   * that repeats them is a second source for the same fact, which is precisely
   * how v0.8's intent text drifted away from its own arithmetic.
   */
  it('event option descriptions never restate their own numbers', () => {
    for (const event of Object.values(EVENTS)) {
      for (const option of event.options) {
        if (!option.desc) continue;
        for (const effect of option.effects) {
          const label = effectLabel(effect);
          expect(option.desc, `${event.id}/${option.id}`).not.toContain(label);
        }
        expect(option.desc, `${event.id}/${option.id}`).not.toMatch(/HP|Glue|Scrap|Block/);
      }
    }
  });

  it('shop service descriptions never restate their own numbers either', () => {
    for (const shop of Object.values(SHOPS)) {
      for (const item of shop.pool) {
        if (item.kind !== 'service' || !item.desc) continue;
        for (const effect of item.effects ?? []) {
          expect(item.desc, item.id).not.toContain(effectLabel(effect));
        }
      }
    }
  });

  it('every event option can render its effects', () => {
    for (const event of Object.values(EVENTS)) {
      for (const option of event.options) {
        expect(option.effects.length, `${event.id}/${option.id}`).toBeGreaterThan(0);
        for (const effect of option.effects) {
          expect(effectLabel(effect), `${event.id}/${option.id}`).toBeTruthy();
        }
      }
    }
  });
});
