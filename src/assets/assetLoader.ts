/**
 * Runtime asset resolution.
 *
 * Guarantees:
 *  - an unknown id never throws and never renders nothing; it renders a
 *    placeholder and is recorded in the missing-asset registry
 *  - a file that fails to load falls back to `fallbackFile`, then to
 *    `ph.generic`, which is the only asset allowed to have no fallback
 *  - nothing outside this module ever sees a file path
 */

import { ASSET_CATALOG } from './assetCatalog';
import type { AssetEntry, PartSlot, ResolvedAsset } from './assetTypes';

const BASE = import.meta.env?.BASE_URL ?? '/';

/** `/assets/x.png` → `<base>/assets/x.png`, so the build works from a subpath. */
export function assetUrl(file: string): string {
  if (/^(https?:)?\/\//.test(file) || file.startsWith('data:')) return file;
  const base = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE;
  return `${base}${file.startsWith('/') ? '' : '/'}${file}`;
}

const missing = new Map<string, number>();

/** Ids requested but not present in the catalog, for /dev/assets and tests. */
export function getMissingAssets(): Array<{ id: string; requests: number }> {
  return [...missing.entries()].map(([id, requests]) => ({ id, requests }));
}

export function resetMissingAssets(): void {
  missing.clear();
}

const PLACEHOLDER_BY_SLOT: Record<PartSlot, string> = {
  head: 'ph.head',
  hand: 'ph.hand',
  core: 'ph.core',
  trinket: 'ph.trinket',
};

export function hasAsset(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(ASSET_CATALOG, id);
}

export function getAssetEntry(id: string): AssetEntry | undefined {
  return ASSET_CATALOG[id];
}

/**
 * Resolve a logical id. `slotHint` picks a nicer placeholder when the id is
 * unknown — a missing head still occupies head-shaped space.
 */
export function resolveAsset(id: string, slotHint?: PartSlot): ResolvedAsset {
  const entry = ASSET_CATALOG[id];
  if (entry) {
    return { id, entry, url: assetUrl(entry.file), usedFallback: false, missing: false };
  }
  missing.set(id, (missing.get(id) ?? 0) + 1);
  const phId = slotHint ? PLACEHOLDER_BY_SLOT[slotHint] : 'ph.generic';
  const ph = ASSET_CATALOG[phId] ?? ASSET_CATALOG['ph.generic'];
  return { id, entry: ph, url: assetUrl(ph.file), usedFallback: true, missing: true };
}

/** URL to use after an `<img>` load error. `null` when there is nothing left. */
export function fallbackUrl(entry: AssetEntry, alreadyTried: string): string | null {
  const chain = [entry.fallbackFile, ASSET_CATALOG['ph.generic']?.file].filter(Boolean) as string[];
  for (const file of chain) {
    const url = assetUrl(file);
    if (url !== alreadyTried) return url;
  }
  return null;
}

// ─── layout ──────────────────────────────────────────────────────────────────

export interface PartLayout {
  /** px, relative to the body box's top-left */
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  /** transform-origin as a percentage pair, so rotation pivots on the anchor */
  originX: number;
  originY: number;
}

/**
 * Pin `part`'s anchor onto `body`'s attach point for `slot`, at a body rendered
 * `bodyWidth` px wide. Pure — this is what the /dev/assets tuner previews and
 * what the battle and workshop views both render with.
 */
export function computePartLayout(
  body: AssetEntry,
  part: AssetEntry,
  slot: PartSlot,
  bodyWidth: number,
  overrides?: Partial<Pick<AssetEntry, 'anchorX' | 'anchorY' | 'scale' | 'rotation' | 'zIndex'>>,
): PartLayout {
  const bodyHeight = bodyWidth * (body.height / body.width);
  const attach = body.attach?.[slot] ?? { x: 0.5, y: 0.5 };

  const anchorX = overrides?.anchorX ?? part.anchorX;
  const anchorY = overrides?.anchorY ?? part.anchorY;
  const scale = overrides?.scale ?? part.scale;
  const rotation = overrides?.rotation ?? part.rotation;
  const zIndex = overrides?.zIndex ?? part.zIndex;

  const width = bodyWidth * scale;
  const height = width * (part.height / part.width);

  return {
    left: attach.x * bodyWidth - anchorX * width,
    top: attach.y * bodyHeight - anchorY * height,
    width,
    height,
    rotation,
    zIndex,
    originX: anchorX * 100,
    originY: anchorY * 100,
  };
}

/** Catalog integrity problems. Surfaced by tests and by /dev/assets. */
export interface CatalogIssue {
  id: string;
  level: 'error' | 'warning';
  message: string;
}

export function validateCatalog(): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const generic = ASSET_CATALOG['ph.generic'];
  if (!generic) {
    issues.push({ id: 'ph.generic', level: 'error', message: 'ph.generic is the fallback of last resort and must exist' });
  }

  for (const [id, e] of Object.entries(ASSET_CATALOG)) {
    if (e.id !== id) issues.push({ id, level: 'error', message: `entry.id "${e.id}" does not match its key` });
    if (!e.file.startsWith('/assets/')) issues.push({ id, level: 'error', message: `file must be root-relative under /assets/, got "${e.file}"` });
    if (e.category !== 'reference' && (e.width <= 0 || e.height <= 0)) {
      issues.push({ id, level: 'error', message: 'width/height must be positive' });
    }
    for (const [k, v] of [['anchorX', e.anchorX], ['anchorY', e.anchorY]] as const) {
      if (v < -0.5 || v > 1.5) issues.push({ id, level: 'warning', message: `${k}=${v} is far outside the image box` });
    }
    if (e.scale <= 0) issues.push({ id, level: 'error', message: 'scale must be > 0' });
    if (e.category === 'part' && !e.slot) issues.push({ id, level: 'error', message: 'part assets must declare a slot' });
    if (e.category === 'body' && !e.attach) issues.push({ id, level: 'error', message: 'body assets must declare attach points' });
    if (e.category !== 'placeholder' && e.category !== 'reference' && !e.fallbackFile) {
      issues.push({ id, level: 'warning', message: 'no fallbackFile; a load failure will drop to ph.generic' });
    }
    if (e.status === 'deprecated') {
      issues.push({ id, level: 'warning', message: 'deprecated asset is still in the catalog' });
    }
  }
  return issues;
}
