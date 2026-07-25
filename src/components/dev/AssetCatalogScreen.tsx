import { useMemo, useState } from 'react';
import { ASSET_CATALOG } from '@/assets/assetCatalog';
import { getMissingAssets, validateCatalog } from '@/assets/assetLoader';
import type { AssetCategory, AssetEntry, AssetStatus, PartSlot } from '@/assets/assetTypes';
import { PARTS } from '@/game/data/parts';
import { createAssembly } from '@/game/systems/assemblySystem';
import { ENCOUNTERS } from '@/game/data/enemies';
import { STATUSES } from '@/game/data/statuses';
import { Panel, SectionTitle } from '../common/ui';
import { Sprite } from '../common/Sprite';
import { PeelbeastFigure } from '../common/PeelbeastFigure';

const CATEGORIES: Array<AssetCategory | 'all'> = [
  'all',
  'body',
  'art',
  'part',
  'enemy',
  'background',
  'prop',
  'ui',
  'icon',
  'effect',
  'placeholder',
  'reference',
];

const STATUS_TONE: Record<AssetStatus, string> = {
  production: 'ok',
  placeholder: 'warn',
  reference: 'info',
  deprecated: 'bad',
};

/**
 * `/dev/assets` — the catalog browser required for art hand-off.
 *
 * Beyond listing, it can retune a part's anchor/scale/rotation/z-index live
 * against the real body and copy the result as JSON to paste into
 * `assetCatalog.ts`. That is the intended workflow for swapping in final art.
 */
export function AssetCatalogScreen() {
  const [category, setCategory] = useState<AssetCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [tuning, setTuning] = useState<Record<string, { anchorX: number; anchorY: number; scale: number; rotation: number; zIndex: number }>>({});
  const [copied, setCopied] = useState(false);

  const issues = useMemo(() => validateCatalog(), []);
  const missing = getMissingAssets();

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(ASSET_CATALOG)
      .filter((e) => category === 'all' || e.category === category)
      .filter((e) => !q || e.id.toLowerCase().includes(q) || e.displayName.toLowerCase().includes(q) || e.tags.some((t) => t.includes(q)))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [category, query]);

  const selectedEntry = selected ? ASSET_CATALOG[selected] : null;
  const tune = selected ? tuning[selected] : undefined;

  const previewAssembly = useMemo(() => {
    if (!selectedEntry || selectedEntry.category !== 'part' || !selectedEntry.slot) return null;
    const partId = Object.values(PARTS).find((p) => p.assetId === selectedEntry.id)?.id ?? null;
    return createAssembly({ [selectedEntry.slot]: partId });
  }, [selectedEntry]);

  return (
    <div className="screen dev" data-testid="asset-catalog-screen">
      <SectionTitle
        label="developer"
        title="Asset Catalog"
        aside={
          <div className="dev__summary">
            <span className="chip">{Object.keys(ASSET_CATALOG).length} assets</span>
            <span className={`chip ${issues.some((i) => i.level === 'error') ? 'chip--bad' : 'chip--ok'}`} data-testid="catalog-errors">
              {issues.filter((i) => i.level === 'error').length} errors
            </span>
            <span className="chip">{issues.filter((i) => i.level === 'warning').length} warnings</span>
            <span className="chip" data-testid="catalog-missing">{missing.length} missing at runtime</span>
          </div>
        }
      />

      <div className="dev__controls">
        <input
          type="search"
          className="dev__search"
          placeholder="id, 이름, 태그 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="asset-search"
        />
        <div className="dev__cats">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`btn btn--ghost${category === c ? ' is-active' : ''}`}
              onClick={() => setCategory(c)}
              data-testid={`asset-cat-${c}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {issues.length > 0 && (
        <Panel className="dev__issues">
          <div className="label">catalog validation</div>
          <ul>
            {issues.map((i, n) => (
              <li key={n} className={`dev__issue dev__issue--${i.level}`}>
                <code>{i.id}</code> {i.message}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="dev__layout">
        <div className="asset-grid" data-testid="asset-grid">
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`asset-tile${selected === entry.id ? ' is-selected' : ''}`}
              onClick={() => setSelected(entry.id)}
              data-testid={`asset-tile-${entry.id}`}
            >
              <div className="asset-tile__frame">
                <Sprite assetId={entry.id} className="asset-tile__img" />
              </div>
              <strong>{entry.displayName}</strong>
              <code>{entry.id}</code>
              <span className={`asset-tile__status is-${STATUS_TONE[entry.status]}`}>{entry.status}</span>
            </button>
          ))}
          {entries.length === 0 && <p className="empty-note">조건에 맞는 에셋이 없다.</p>}
        </div>

        <Panel className="asset-detail">
          {!selectedEntry && <p className="empty-note">에셋을 선택하면 메타데이터와 미리보기가 여기 표시된다.</p>}
          {selectedEntry && (
            <>
              <SectionTitle label={selectedEntry.category} title={selectedEntry.displayName} />

              <div className="asset-detail__previews">
                <figure>
                  <Sprite assetId={selectedEntry.id} className="asset-detail__img" />
                  <figcaption>current</figcaption>
                </figure>
                {selectedEntry.referenceFile && (
                  <figure>
                    <img src={selectedEntry.referenceFile} alt="reference" className="asset-detail__img" />
                    <figcaption>v0.8 reference</figcaption>
                  </figure>
                )}
              </div>

              <dl className="asset-detail__meta">
                <Meta k="id" v={selectedEntry.id} />
                <Meta k="file" v={selectedEntry.file} />
                <Meta k="fallback" v={selectedEntry.fallbackFile ?? '—'} />
                <Meta k="size" v={`${selectedEntry.width} × ${selectedEntry.height}`} />
                <Meta k="anchor" v={`${(tune?.anchorX ?? selectedEntry.anchorX).toFixed(2)}, ${(tune?.anchorY ?? selectedEntry.anchorY).toFixed(2)}`} />
                <Meta k="scale" v={String(tune?.scale ?? selectedEntry.scale)} />
                <Meta k="rotation" v={`${tune?.rotation ?? selectedEntry.rotation}°`} />
                <Meta k="zIndex" v={String(tune?.zIndex ?? selectedEntry.zIndex)} />
                <Meta k="slot" v={selectedEntry.slot ?? '—'} />
                <Meta k="animation" v={selectedEntry.animationProfile} />
                <Meta k="bodies" v={selectedEntry.bodyCompatibility?.join(', ') ?? 'any'} />
                <Meta k="tags" v={selectedEntry.tags.join(', ')} />
                <Meta k="status" v={selectedEntry.status} />
                <Meta k="license" v={selectedEntry.license} />
                <Meta k="source" v={selectedEntry.source} />
                <Meta k="used by" v={usedBy(selectedEntry.id).join(', ') || '—'} />
              </dl>

              {previewAssembly && selectedEntry.slot && (
                <div className="asset-detail__mount">
                  <div className="label">mounted preview</div>
                  <PeelbeastFigure
                    assembly={previewAssembly}
                    width={230}
                    showAnchors
                    overrides={tune ? { [selectedEntry.id]: tune } : undefined}
                  />

                  <div className="tuner" data-testid="asset-tuner">
                    <Slider
                      label="anchorX"
                      min={0}
                      max={1}
                      step={0.01}
                      value={tune?.anchorX ?? selectedEntry.anchorX}
                      onChange={(v) => setTuning((t) => ({ ...t, [selectedEntry.id]: { ...defaults(selectedEntry, t), anchorX: v } }))}
                    />
                    <Slider
                      label="anchorY"
                      min={0}
                      max={1}
                      step={0.01}
                      value={tune?.anchorY ?? selectedEntry.anchorY}
                      onChange={(v) => setTuning((t) => ({ ...t, [selectedEntry.id]: { ...defaults(selectedEntry, t), anchorY: v } }))}
                    />
                    <Slider
                      label="scale"
                      min={0.05}
                      max={1.2}
                      step={0.01}
                      value={tune?.scale ?? selectedEntry.scale}
                      onChange={(v) => setTuning((t) => ({ ...t, [selectedEntry.id]: { ...defaults(selectedEntry, t), scale: v } }))}
                    />
                    <Slider
                      label="rotation"
                      min={-45}
                      max={45}
                      step={1}
                      value={tune?.rotation ?? selectedEntry.rotation}
                      onChange={(v) => setTuning((t) => ({ ...t, [selectedEntry.id]: { ...defaults(selectedEntry, t), rotation: v } }))}
                    />
                    <Slider
                      label="zIndex"
                      min={0}
                      max={80}
                      step={1}
                      value={tune?.zIndex ?? selectedEntry.zIndex}
                      onChange={(v) => setTuning((t) => ({ ...t, [selectedEntry.id]: { ...defaults(selectedEntry, t), zIndex: v } }))}
                    />

                    <div className="tuner__actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          const payload = JSON.stringify(
                            { id: selectedEntry.id, ...(tune ?? defaults(selectedEntry, tuning)) },
                            null,
                            2,
                          );
                          navigator.clipboard?.writeText(payload).catch(() => undefined);
                          setCopied(true);
                          window.setTimeout(() => setCopied(false), 1400);
                        }}
                        data-testid="tuner-copy"
                      >
                        {copied ? '복사됨' : 'JSON 복사'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() =>
                          setTuning((t) => {
                            const next = { ...t };
                            delete next[selectedEntry.id];
                            return next;
                          })
                        }
                      >
                        되돌리기
                      </button>
                    </div>
                    <pre className="tuner__out">{JSON.stringify(tune ?? defaults(selectedEntry, tuning), null, 2)}</pre>
                  </div>
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

function defaults(entry: AssetEntry, tuning: Record<string, { anchorX: number; anchorY: number; scale: number; rotation: number; zIndex: number }>) {
  return (
    tuning[entry.id] ?? {
      anchorX: entry.anchorX,
      anchorY: entry.anchorY,
      scale: entry.scale,
      rotation: entry.rotation,
      zIndex: entry.zIndex,
    }
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="asset-detail__meta-row">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="tuner__row">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} data-testid={`tuner-${label}`} />
      <b>{value}</b>
    </label>
  );
}

/** Which game objects reference this asset id. */
function usedBy(assetId: string): string[] {
  const out: string[] = [];
  for (const p of Object.values(PARTS)) {
    if (p.assetId === assetId) out.push(`part ${p.id}`);
    if (p.active.iconAssetId === assetId) out.push(`skill ${p.active.id}`);
  }
  for (const e of Object.values(ENCOUNTERS)) {
    if (e.backgroundAssetId === assetId) out.push(`encounter ${e.id} bg`);
    for (const ph of e.phases) if (ph.assetId === assetId) out.push(`enemy ${ph.enemyId}`);
  }
  for (const s of Object.values(STATUSES)) {
    if (s.iconAssetId === assetId) out.push(`status ${s.id}`);
  }
  return out;
}

export type { PartSlot };
