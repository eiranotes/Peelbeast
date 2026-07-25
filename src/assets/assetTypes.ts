/**
 * Asset catalog types.
 *
 * Nothing in the game addresses an image by file path. Components ask for a
 * logical asset id (`part.head.toast_helm`) and the catalog resolves it to a
 * file, a fallback, an anchor, a scale and a z-index. Swapping art is therefore
 * a catalog edit, never a component edit.
 */

export type AssetCategory =
  | 'body'
  | 'part'
  /** Finished illustration placed in a scene; not mountable, not gameplay art. */
  | 'art'
  | 'enemy'
  | 'background'
  | 'prop'
  | 'ui'
  | 'icon'
  | 'effect'
  | 'placeholder'
  | 'reference';

/**
 * Lifecycle of a piece of art.
 * - `reference`   — art direction only, never rendered in game
 * - `placeholder` — real, shippable image, but intended to be replaced
 * - `production`  — final art
 * - `deprecated`  — kept for history, must not be referenced by game data
 */
export type AssetStatus = 'reference' | 'placeholder' | 'production' | 'deprecated';

export type PartSlot = 'head' | 'hand' | 'core' | 'trinket';

export type AnimationProfile =
  | 'static'
  | 'soft-bounce'
  | 'sway'
  | 'jitter'
  | 'float'
  | 'spin-slow';

export interface VisualBounds {
  /** Normalised, relative to the image box. Used for hit sparks and peel origin. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where each slot's part anchor lands on a body, normalised to the body image. */
export type BodyAttachMap = Record<PartSlot, { x: number; y: number }>;

export interface AssetEntry {
  id: string;
  displayName: string;
  category: AssetCategory;

  /** Path under `public/`, always root-relative. */
  file: string;
  /** Shown when `file` fails to load. Must itself always exist. */
  fallbackFile?: string;
  /** The v0.8 reference crop this art was drawn against, for /dev/assets. */
  referenceFile?: string;

  /** Intrinsic pixel size of `file`; verified by `npm run assets:validate`. */
  width: number;
  height: number;

  /** Normalised point inside this image that is pinned to the attach point. */
  anchorX: number;
  anchorY: number;
  /** Rendered width as a fraction of the body's rendered width (parts), or 1. */
  scale: number;
  /** Degrees, applied about the anchor. */
  rotation: number;
  zIndex: number;

  slot?: PartSlot;
  /** Body ids this asset may be mounted on. Empty means "any". */
  bodyCompatibility?: string[];
  /** Attach points, bodies only. */
  attach?: BodyAttachMap;

  animationProfile: AnimationProfile;
  visualBounds?: VisualBounds;

  tags: string[];
  license: string;
  source: string;
  status: AssetStatus;
}

export type AssetCatalog = Record<string, AssetEntry>;

export interface ResolvedAsset {
  id: string;
  entry: AssetEntry;
  /** URL to render. Equals `entry.file` unless a load failure forced a fallback. */
  url: string;
  usedFallback: boolean;
  missing: boolean;
}
