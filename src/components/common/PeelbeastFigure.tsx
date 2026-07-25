import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Sprite } from './Sprite';
import { getAssetEntry, computePartLayout } from '@/assets/assetLoader';
import type { AssetEntry, PartSlot } from '@/assets/assetTypes';
import { PARTS } from '@/game/data/parts';
import type { AssemblyState } from '@/game/systems/assemblySystem';
import { BALANCE } from '@/game/data/balance';

const SLOT_ORDER: PartSlot[] = ['core', 'head', 'trinket', 'hand'];

export type FigurePose = 'idle' | 'attack' | 'hit' | 'guard' | 'repair' | 'win' | 'lose';

interface PeelbeastFigureProps {
  assembly: AssemblyState;
  /** Slots currently peeled off. Their layers are removed from the figure. */
  peeled?: ReadonlySet<PartSlot>;
  /** Rendered width of the BODY in px; every part scales from this. */
  width: number;
  pose?: FigurePose;
  /** Per-part transform overrides, used by the /dev/assets tuner. */
  overrides?: Partial<Record<string, Partial<Pick<AssetEntry, 'anchorX' | 'anchorY' | 'scale' | 'rotation' | 'zIndex'>>>>;
  /** Draw attach points and anchor crosshairs. */
  showAnchors?: boolean;
  className?: string;
  onSlotClick?: (slot: PartSlot) => void;
  /** Highlight one slot (workshop hover). */
  emphasis?: PartSlot | null;
}

/**
 * Renders the assembled beast: body image plus one image layer per attached
 * part, positioned entirely from catalog anchors.
 *
 * A slot that is peeled is genuinely absent from the DOM after its fall
 * animation, so "the part disappears when unequipped" is a structural property
 * rather than an opacity trick.
 */
export function PeelbeastFigure({
  assembly,
  peeled,
  width,
  pose = 'idle',
  overrides,
  showAnchors,
  className,
  onSlotClick,
  emphasis,
}: PeelbeastFigureProps) {
  const body = getAssetEntry(assembly.bodyId) ?? getAssetEntry('ph.body')!;
  const height = width * (body.height / body.width);

  // Parts that just peeled keep rendering briefly so the fall can be seen.
  const [falling, setFalling] = useState<Array<{ slot: PartSlot; partId: string; token: number }>>([]);
  const prevPeeled = useRef<Set<PartSlot>>(new Set(peeled ?? []));
  const token = useRef(0);

  useEffect(() => {
    const now = new Set(peeled ?? []);
    const added: PartSlot[] = [];
    for (const slot of now) if (!prevPeeled.current.has(slot)) added.push(slot);
    // A slot reattached before its fall finished must drop the falling clone,
    // otherwise the layer briefly renders twice.
    const reattached = [...prevPeeled.current].filter((s) => !now.has(s));
    if (reattached.length > 0) {
      setFalling((f) => f.filter((x) => !reattached.includes(x.slot)));
    }
    prevPeeled.current = now;
    if (added.length === 0) return;

    const entries = added
      .map((slot) => ({ slot, partId: assembly.slots[slot] }))
      .filter((e): e is { slot: PartSlot; partId: string } => !!e.partId)
      .map((e) => ({ ...e, token: token.current++ }));
    if (entries.length === 0) return;

    setFalling((f) => [...f, ...entries]);
    const timer = window.setTimeout(() => {
      setFalling((f) => f.filter((x) => !entries.some((e) => e.token === x.token)));
    }, BALANCE.feel.peelFall);
    return () => window.clearTimeout(timer);
  }, [peeled, assembly.slots]);

  const layers = SLOT_ORDER.map((slot) => {
    const partId = assembly.slots[slot];
    if (!partId) return null;
    if (peeled?.has(slot)) return null;
    return renderPart({ slot, partId, body, width, overrides, showAnchors, onSlotClick, emphasis, falling: false, key: `${slot}-${partId}` });
  }).filter(Boolean);

  const fallingLayers = falling.map((f) =>
    renderPart({
      slot: f.slot,
      partId: f.partId,
      body,
      width,
      overrides,
      showAnchors: false,
      onSlotClick: undefined,
      emphasis: null,
      falling: true,
      key: `fall-${f.token}`,
    }),
  );

  return (
    <div
      className={['figure', `figure--${pose}`, className].filter(Boolean).join(' ')}
      style={{ width, height }}
      data-testid="peelbeast-figure"
    >
      <div className="figure__shadow" style={{ width: width * 0.62 }} />
      <Sprite
        assetId={assembly.bodyId}
        className="figure__body"
        style={{ width, height, zIndex: body.zIndex }}
        alt="Peelbeast 몸체"
      />
      {layers}
      {fallingLayers}
      {showAnchors && (
        <>
          {SLOT_ORDER.map((slot) => {
            const attach = body.attach?.[slot];
            if (!attach) return null;
            return (
              <span
                key={`attach-${slot}`}
                className="figure__attach"
                style={{ left: attach.x * width, top: attach.y * height }}
                data-slot={slot}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

function renderPart({
  slot,
  partId,
  body,
  width,
  overrides,
  showAnchors,
  onSlotClick,
  emphasis,
  falling,
  key,
}: {
  slot: PartSlot;
  partId: string;
  body: AssetEntry;
  width: number;
  overrides?: PeelbeastFigureProps['overrides'];
  showAnchors?: boolean;
  onSlotClick?: (slot: PartSlot) => void;
  emphasis?: PartSlot | null;
  falling: boolean;
  key: string;
}) {
  const part = PARTS[partId];
  const assetId = part?.assetId ?? partId;
  const entry = getAssetEntry(assetId);
  const fallbackEntry = getAssetEntry(`ph.${slot}`)!;
  const layout = computePartLayout(body, entry ?? fallbackEntry, slot, width, overrides?.[assetId]);

  const style: CSSProperties = {
    left: layout.left,
    top: layout.top,
    width: layout.width,
    height: layout.height,
    zIndex: layout.zIndex,
    transformOrigin: `${layout.originX}% ${layout.originY}%`,
    ['--part-rotation' as string]: `${layout.rotation}deg`,
  };

  const classes = [
    'figure__part',
    `figure__part--${slot}`,
    `figure__part--anim-${entry?.animationProfile ?? 'static'}`,
    falling ? 'figure__part--falling' : '',
    emphasis === slot ? 'is-emphasised' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <Sprite assetId={assetId} slotHint={slot} alt={part?.name ?? slot} className="figure__part-img" />
      {showAnchors && <span className="figure__anchor" style={{ left: `${layout.originX}%`, top: `${layout.originY}%` }} />}
    </>
  );

  return onSlotClick && !falling ? (
    <button key={key} type="button" className={`${classes} figure__part--interactive`} style={style} onClick={() => onSlotClick(slot)} data-slot={slot} data-part-id={partId}>
      {content}
    </button>
  ) : (
    <div key={key} className={classes} style={style} data-slot={slot} data-part-id={partId} aria-hidden={falling || undefined}>
      {content}
    </div>
  );
}
