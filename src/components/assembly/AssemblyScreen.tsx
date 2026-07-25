import { useEffect, useMemo, useState } from 'react';
import { useGame } from '@/app/gameStore';
import { PARTS, partsForSlot } from '@/game/data/parts';
import { SYNERGIES } from '@/game/data/synergies';
import { RELICS } from '@/game/data/relics';
import { computeBuild, compatibility, createAssembly, diffBuilds } from '@/game/systems/assemblySystem';
import { describeEffects } from '@/game/engine/describe';
import { currentNode, currentRoute } from '@/game/engine/rewardResolver';
import type { BuildModifiers, PartSlot } from '@/game/data/types';
import { Panel, SectionTitle, StatBlock, EmptyNote } from '../common/ui';
import { PeelbeastFigure } from '../common/PeelbeastFigure';
import { Sprite } from '../common/Sprite';
import { RouteBoard, nodeTitle } from '../route/RouteScreen';

const SLOTS: PartSlot[] = ['head', 'hand', 'core', 'trinket'];
const SLOT_LABEL: Record<PartSlot, string> = { head: 'Head', hand: 'Hand', core: 'Core', trinket: 'Trinket' };

/**
 * The workbench. A dedicated screen, not a battle sidebar — in v0.8 the
 * assembly UI sat next to the fight and swapping a part silently restarted the
 * encounter.
 */
export function AssemblyScreen() {
  const { run } = useGame();
  if (!run) return <EmptyNote>진행 중인 런이 없다. 타이틀에서 새 런을 시작하라.</EmptyNote>;
  return <Workshop run={run} />;
}

function Workshop({ run }: { run: NonNullable<ReturnType<typeof useGame>['run']> }) {
  const { equip, enterCurrentNode, go } = useGame();
  const [activeSlot, setActiveSlot] = useState<PartSlot>('head');
  const [preview, setPreview] = useState<string | null>(null);
  // Touch devices have no hover, so the before/after comparison was unreachable
  // on a phone. There, the first tap previews and the second commits.
  const [coarsePointer, setCoarsePointer] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(hover: none), (pointer: coarse)');
    const sync = () => setCoarsePointer(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const build = useMemo(() => computeBuild(run.assembly, { relics: run.relics }), [run.assembly, run.relics]);

  const previewAssembly = useMemo(() => {
    if (!preview) return null;
    const part = PARTS[preview];
    if (!part) return null;
    return createAssembly({ ...run.assembly.slots, [part.slot]: part.id }, run.assembly.bodyId);
  }, [preview, run.assembly]);

  const previewBuild = useMemo(
    () => (previewAssembly ? computeBuild(previewAssembly, { relics: run.relics }) : null),
    [previewAssembly, run.relics],
  );
  const delta = previewBuild ? diffBuilds(build, previewBuild) : null;

  const shownAssembly = previewAssembly ?? run.assembly;
  const shownBuild = previewBuild ?? build;
  const node = currentNode(run);

  return (
    <div className="screen workshop">
      <SectionTitle
        label="assembly workshop"
        title="작업대"
        aside={
          <div className="workshop__head-actions">
            <span className="chip">Scrap {run.scrap}</span>
            <span className="chip">
              Node {run.nodeIndex + 1}/{currentRoute(run).nodes.length} · {node ? nodeTitle(node) : '—'}
            </span>
            <button type="button" className="btn btn--ghost" onClick={() => go('title')}>
              Title
            </button>
            <button type="button" className="btn btn--primary" onClick={enterCurrentNode} data-testid="enter-node">
              {node ? `${node.label} 진입` : '결과 보기'}
            </button>
          </div>
        }
      />

      <div className="workshop__grid">
        {/* ── bench: the beast itself ─────────────────────────────────────── */}
        <Panel className="workshop__bench" tape>
          <Sprite assetId="bg.desk" className="workshop__bench-bg" decorative />
          <div className="workshop__bench-inner">
            <PeelbeastFigure
              assembly={shownAssembly}
              width={330}
              emphasis={preview ? PARTS[preview]?.slot : activeSlot}
              onSlotClick={(slot) => {
                setActiveSlot(slot);
                setPreview(null);
              }}
            />
          </div>
          <div className="workshop__bench-props">
            <Sprite assetId="prop.pencil_cup" className="workshop__prop workshop__prop--left" decorative />
            <Sprite assetId="prop.clip_pile" className="workshop__prop workshop__prop--right" decorative />
          </div>
          {preview && (
            <div className="workshop__preview-flag">
              미리보기 — {PARTS[preview]?.name}
              {coarsePointer && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    const part = PARTS[preview];
                    if (part) equip(part.slot, part.id);
                    setPreview(null);
                  }}
                  data-testid="preview-confirm"
                >
                  장착
                </button>
              )}
              <button type="button" className="btn btn--ghost" onClick={() => setPreview(null)}>
                취소
              </button>
            </div>
          )}
        </Panel>

        {/* ── readout ─────────────────────────────────────────────────────── */}
        <Panel className="workshop__readout">
          <SectionTitle label="readout" title="빌드 요약" />
          <StatBlock
            items={[
              { key: 'hp', label: 'HP', value: shownBuild.maxHp, delta: delta?.maxHp },
              { key: 'glue', label: 'Glue', value: shownBuild.maxGlue, delta: delta?.maxGlue },
              { key: 'atk', label: 'ATK', value: shownBuild.atk, delta: delta?.atk },
              { key: 'spd', label: 'SPD', value: shownBuild.spd, delta: delta?.spd },
              { key: 'peel', label: '박리저항', value: shownBuild.peelResist, delta: delta?.peelResist },
            ]}
          />

          {delta && (delta.gainedSkills.length > 0 || delta.lostSkills.length > 0 || delta.gainedSynergies.length > 0 || delta.lostSynergies.length > 0) && (
            <div className="workshop__delta">
              {delta.lostSkills.map((s) => (
                <span key={`ls-${s}`} className="tag tag--down">− {s}</span>
              ))}
              {delta.gainedSkills.map((s) => (
                <span key={`gs-${s}`} className="tag tag--up">+ {s}</span>
              ))}
              {delta.lostSynergies.map((s) => (
                <span key={`lsy-${s}`} className="tag tag--down">− 시너지 {s}</span>
              ))}
              {delta.gainedSynergies.map((s) => (
                <span key={`gsy-${s}`} className="tag tag--up">+ 시너지 {s}</span>
              ))}
            </div>
          )}

          <h3 className="workshop__sub">액티브 스킬</h3>
          <ul className="skill-list">
            {shownBuild.skills.map((s) => (
              <li key={s.slot} className="skill-list__item">
                <Sprite assetId={s.skill.iconAssetId} className="skill-list__icon" decorative />
                <div>
                  <strong>{s.skill.name}</strong>
                  <span className="skill-list__meta">
                    {SLOT_LABEL[s.slot]} · {s.partName} · CD {s.skill.cooldown} · Glue {s.skill.glueCost}
                  </span>
                  <span className="skill-list__effects">{describeEffects(s.skill.effects).join(' · ')}</span>
                </div>
              </li>
            ))}
            {shownBuild.skills.length === 0 && <EmptyNote>장착된 파츠가 없다.</EmptyNote>}
          </ul>

          <h3 className="workshop__sub">패시브</h3>
          <ul className="passive-list">
            {shownBuild.passives.map((p) => (
              <li key={p.slot}>
                <strong>{p.title}</strong>
                <span>{p.desc}</span>
              </li>
            ))}
          </ul>

          <h3 className="workshop__sub">시너지</h3>
          <ul className="synergy-list">
            {shownBuild.activeSynergies.map((s) => (
              <li key={s.id} className="is-active">
                <strong>{s.name}</strong>
                <span>{s.desc}</span>
              </li>
            ))}
            {Object.values(SYNERGIES)
              .filter((s) => !shownBuild.activeSynergies.some((a) => a.id === s.id))
              .map((s) => (
                <li key={s.id} className="is-dormant">
                  <strong>{s.name}</strong>
                  <span>
                    {s.requires.map((r) => PARTS[r]?.name ?? r).join(' + ')} 필요 — {s.desc}
                  </span>
                </li>
              ))}
          </ul>

          {run.relics.length > 0 && (
            <>
              <h3 className="workshop__sub">런 모드</h3>
              <ul className="passive-list">
                {run.relics.map((id) => (
                  <li key={id}>
                    <strong>{RELICS[id]?.name ?? id}</strong>
                    <span>{RELICS[id]?.desc}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        {/* ── part catalogue ──────────────────────────────────────────────── */}
        <Panel className="workshop__catalogue">
          <SectionTitle label="parts" title="파츠 서랍" />
          <div className="slot-tabs" role="tablist">
            {SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                role="tab"
                aria-selected={activeSlot === slot}
                className={`slot-tab${activeSlot === slot ? ' is-active' : ''}`}
                onClick={() => {
                  setActiveSlot(slot);
                  setPreview(null);
                }}
                data-testid={`slot-tab-${slot}`}
              >
                <span>{SLOT_LABEL[slot]}</span>
                <em>{run.assembly.slots[slot] ? PARTS[run.assembly.slots[slot]!]?.name : '비어 있음'}</em>
              </button>
            ))}
          </div>

          <div className="part-grid">
            {partsForSlot(activeSlot).map((part) => {
              const equipped = run.assembly.slots[activeSlot] === part.id;
              const compat = compatibility(run.assembly, part.id);
              return (
                <button
                  key={part.id}
                  type="button"
                  className={`part-card${equipped ? ' is-equipped' : ''}${compat.ok ? '' : ' is-blocked'}`}
                  onMouseEnter={() => !coarsePointer && !equipped && setPreview(part.id)}
                  onMouseLeave={() => !coarsePointer && setPreview(null)}
                  onFocus={() => !coarsePointer && !equipped && setPreview(part.id)}
                  onBlur={() => !coarsePointer && setPreview(null)}
                  onClick={() => {
                    if (!compat.ok) return;
                    if (coarsePointer && !equipped && preview !== part.id) {
                      setPreview(part.id);
                      return;
                    }
                    equip(activeSlot, equipped ? null : part.id);
                    setPreview(null);
                  }}
                  data-testid={`part-${part.id}`}
                  disabled={!compat.ok}
                >
                  <Sprite assetId={part.assetId} slotHint={part.slot} className="part-card__art" />
                  <strong>{part.name}</strong>
                  <span className="part-card__desc">{part.desc}</span>
                  <span className="part-card__stats">
                    {statLine(part.stats)}
                  </span>
                  <span className="part-card__state">
                    {equipped
                      ? '장착 중 · 눌러서 해제'
                      : !compat.ok
                        ? compat.reason
                        : coarsePointer
                          ? preview === part.id
                            ? '한 번 더 눌러 장착'
                            : '눌러서 미리보기'
                          : '클릭해서 장착'}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* ── route ───────────────────────────────────────────────────────── */}
        <Panel className="workshop__route">
          <SectionTitle label="run" title="경로" />
          <RouteBoard routeId={run.routeId} nodeIndex={run.nodeIndex} />
        </Panel>
      </div>
    </div>
  );
}

function statLine(stats: BuildModifiers): string {
  const parts: string[] = [];
  const map: Record<string, string> = { hp: 'HP', glue: 'Glue', atk: 'ATK', spd: 'SPD', peelResist: '박리저항', cooldownStart: 'CD시작' };
  for (const [k, v] of Object.entries(stats)) {
    if (!v) continue;
    parts.push(`${map[k] ?? k} ${v > 0 ? '+' : ''}${v}`);
  }
  return parts.length ? parts.join('  ') : '스탯 변화 없음';
}
