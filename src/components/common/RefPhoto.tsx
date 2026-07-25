import type { CSSProperties } from 'react';
import { Sprite } from './Sprite';
import { getAssetEntry } from '@/assets/assetLoader';

/**
 * A piece of the original v0.8 reference art, taped to the desk like a photo.
 *
 * These crops are painted screenshots with no alpha, so they cannot be layered
 * onto the character — but pinned inside a paper frame they read as exactly what
 * they are: reference photographs on the workbench. That keeps the uploaded art
 * visible in the game at full fidelity, without pasting an opaque rectangle onto
 * a sprite or laying a whole screenshot behind the UI.
 */
export function RefPhoto({
  assetId,
  caption,
  className,
  style,
  tilt = -2,
}: {
  assetId: string;
  caption?: string;
  className?: string;
  style?: CSSProperties;
  tilt?: number;
}) {
  // A reference id that is not in the catalog simply renders nothing rather
  // than a placeholder — this is decoration, not gameplay information.
  if (!getAssetEntry(assetId)) return null;

  return (
    <figure
      className={['ref-photo', className].filter(Boolean).join(' ')}
      style={{ ...style, ['--tilt' as string]: `${tilt}deg` }}
      data-testid={`ref-photo-${assetId}`}
    >
      <span className="ref-photo__tape" />
      <Sprite assetId={assetId} className="ref-photo__img" decorative />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/**
 * Reference crops that hold nothing but painted art.
 *
 * Only these may be framed on a gameplay screen. The v0.8 coordinate table was
 * written against the wrong resolution, so a number of regions land on the
 * sheet's own interface: `ref.tape` carries the letters `PE`/`EY`, `ref.boxshell`
 * says `BOX`, `ref.ghost` says `GHOST`, `ref.eye` says `ICKER`, `ref.holdcard`
 * shows a cursor and `TO PRESS`, and `ref.stage` is an entire v0.8 screenshot
 * down to its `STAGE 4` header and action bar.
 *
 * Framing those would repeat the exact defect the audit charged v0.8 with —
 * pasting old interface chrome into the game as if it were art. They stay in the
 * catalog, where `/dev/assets` shows them beside the sprite they inform, because
 * that is a developer view and the contamination is the point there.
 *
 * `refPhotos.test.ts` holds this list against the two maps below.
 */
export const CLEAN_REF_PHOTOS: readonly string[] = [
  'ref.hero_card',
  'ref.enemy_rat',
  'ref.enemy_spider',
  'ref.enemy_crow',
  'ref.toast',
  'ref.scissors',
  'ref.umbrella',
  'ref.coffee',
  'ref.bomb',
  'ref.spear',
];

/** Enemy id → the reference crop of that creature, for battle portraits. */
export const ENEMY_REF: Record<string, string> = {
  pencil_rat: 'ref.enemy_rat',
  tape_spider: 'ref.enemy_spider',
  scissor_crow: 'ref.enemy_crow',
};

/** Event id → a reference crop that suits it. Clean crops only. */
export const EVENT_REF: Record<string, string> = {
  gluePool: 'ref.coffee',
  pencilMarks: 'ref.spear',
  clipDrawer: 'ref.scissors',
  inkSpill: 'ref.umbrella',
  nestNoise: 'ref.enemy_spider',
  breadCrumbs: 'ref.toast',
};
