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

/** Enemy id → the reference crop of that creature, for battle portraits. */
export const ENEMY_REF: Record<string, string> = {
  pencil_rat: 'ref.enemy_rat',
  tape_spider: 'ref.enemy_spider',
  scissor_crow: 'ref.enemy_crow',
};

/** Event id → a reference crop that suits it. */
export const EVENT_REF: Record<string, string> = {
  gluePool: 'ref.tape',
  pencilMarks: 'ref.pencilcup',
  clipDrawer: 'ref.boxshell',
  inkSpill: 'ref.stage',
  nestNoise: 'ref.enemy_spider',
  breadCrumbs: 'ref.toast',
};
