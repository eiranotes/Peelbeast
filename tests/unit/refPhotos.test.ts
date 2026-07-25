/**
 * The reference sheet is a painted screenshot, so some of its regions contain
 * v0.8's own interface rather than art. Those may be inspected in /dev/assets
 * but must never be framed on a gameplay screen — putting old UI chrome on the
 * desk and calling it art is the defect this rewrite was opened against.
 *
 * These tests hold the clean list against every gameplay use of it.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CLEAN_REF_PHOTOS, ENEMY_REF, EVENT_REF } from '@/components/common/RefPhoto';
import { ASSET_CATALOG } from '@/assets/assetCatalog';
import { ENCOUNTERS } from '@/game/data/enemies';
import { EVENTS } from '@/game/data/events';

const SRC = join(process.cwd(), 'src');

/** Every enemy that can appear in a fight, across both phases of every encounter. */
const ENEMY_IDS = new Set(
  Object.values(ENCOUNTERS).flatMap((e) => e.phases.map((p) => p.enemyId)),
);

/** Every .tsx under src/, so a new screen cannot quietly frame a dirty crop. */
function componentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? componentFiles(join(dir, e.name)) : e.name.endsWith('.tsx') ? [join(dir, e.name)] : [],
  );
}

describe('reference photos', () => {
  it('lists only ids that exist in the catalog', () => {
    for (const id of CLEAN_REF_PHOTOS) expect(ASSET_CATALOG[id], id).toBeDefined();
  });

  it('frames only clean crops for enemies', () => {
    for (const [enemyId, ref] of Object.entries(ENEMY_REF)) {
      expect(ENEMY_IDS.has(enemyId), enemyId).toBe(true);
      expect(CLEAN_REF_PHOTOS, `${enemyId} → ${ref}`).toContain(ref);
    }
  });

  it('frames only clean crops for events', () => {
    for (const [eventId, ref] of Object.entries(EVENT_REF)) {
      expect(EVENTS[eventId], eventId).toBeDefined();
      expect(CLEAN_REF_PHOTOS, `${eventId} → ${ref}`).toContain(ref);
    }
  });

  it('gives every event a photo', () => {
    for (const id of Object.keys(EVENTS)) expect(EVENT_REF[id], id).toBeDefined();
  });

  it('never frames a dirty crop anywhere in the component tree', () => {
    const dirty = Object.keys(ASSET_CATALOG).filter(
      (id) => id.startsWith('ref.') && !CLEAN_REF_PHOTOS.includes(id),
    );
    expect(dirty.length).toBeGreaterThan(0); // the list is meaningful only if some are excluded

    for (const file of componentFiles(SRC)) {
      const source = readFileSync(file, 'utf8');
      // /dev/assets browses the whole catalog by id, which is its job.
      if (file.includes('/dev/')) continue;
      for (const id of dirty) {
        expect(source.includes(`"${id}"`) || source.includes(`'${id}'`), `${file} frames ${id}`).toBe(
          false,
        );
      }
    }
  });
});
