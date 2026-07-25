import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useGame, battlePeeledSet } from '@/app/gameStore';
import { ENCOUNTERS } from '@/game/data/enemies';
import { PARTS } from '@/game/data/parts';
import { BALANCE } from '@/game/data/balance';
import { intentsRevealed, skillViews, type CoreActionId } from '@/game/engine/battleEngine';
import { activeStatuses } from '@/game/engine/statusResolver';
import { describeEffects } from '@/game/engine/describe';
import { slotName } from '@/game/engine/peelResolver';
import type { FxEvent } from '@/game/state/battleState';
import type { PartSlot } from '@/game/data/types';
import { Bar, EmptyNote, StatusChip } from '../common/ui';
import { PeelbeastFigure, type FigurePose } from '../common/PeelbeastFigure';
import { Sprite } from '../common/Sprite';
import { IntentRail } from './IntentRail';
import { ENEMY_REF, RefPhoto } from '../common/RefPhoto';

const CORE_ACTIONS: Array<{ id: CoreActionId; name: string; icon: string; desc: string }> = [
  { id: 'attack', name: 'Peel Strike', icon: 'fx.slash', desc: '기본 공격. ATK와 Focus로 계산된다.' },
  { id: 'guard', name: 'Guard', icon: 'icon.status.block', desc: `Block ${BALANCE.core.guardBlock}. 박리 시도도 막는다.` },
  { id: 'repair', name: 'Repair', icon: 'fx.patch', desc: `HP +${BALANCE.core.repairHp}, Glue +${BALANCE.core.repairGlue}, 파츠 1개 복구.` },
  { id: 'press', name: 'Press', icon: 'icon.status.haste', desc: `쿨다운 −${BALANCE.core.pressCooldown}, Glue +${BALANCE.core.pressGlue}.` },
];

/** Phase enemy id, used to pick the matching reference portrait. */
function currentEnemyId(b: { encounterId: string; enemy: { phaseIndex: number } }): string {
  const enc = ENCOUNTERS[b.encounterId];
  return enc?.phases[Math.min(b.enemy.phaseIndex, enc.phases.length - 1)]?.enemyId ?? '';
}

interface FloatingNumber {
  id: number;
  target: 'player' | 'enemy';
  text: string;
  tone: 'damage' | 'block' | 'heal' | 'glue';
}

export function BattleScreen() {
  const { battle } = useGame();
  if (!battle) return <EmptyNote>진행 중인 전투가 없다.</EmptyNote>;
  return <BattleView key={battle.encounterId} />;
}

function BattleView() {
  const { battle, act, useSkill, enemyThinking } = useGame();
  const [playerPose, setPlayerPose] = useState<FigurePose>('idle');
  const [enemyShake, setEnemyShake] = useState(false);
  const [hitStop, setHitStop] = useState(false);
  const [floats, setFloats] = useState<FloatingNumber[]>([]);
  const [logOpen, setLogOpen] = useState(true);
  const floatId = useRef(0);
  const consumed = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const [figureWidth, setFigureWidth] = useState(300);

  /**
   * Size the beast from the stage rather than a fixed pixel width. The stage
   * itself flexes with viewport height, so at 1280x720 the character shrinks
   * instead of being clipped by the stage's overflow.
   */
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const usable = el.clientHeight - 74; // floor strip + breathing room
      const byHeight = usable / (940 / 800); // body aspect ratio
      const byWidth = el.clientWidth * 0.3;
      setFigureWidth(Math.max(170, Math.min(300, byHeight, byWidth)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const b = battle!;
  const encounter = ENCOUNTERS[b.encounterId];
  const peeled = useMemo(() => battlePeeledSet(b), [b]);
  const revealed = useMemo(() => intentsRevealed(b), [b]);
  const skills = useMemo(() => skillViews(b), [b]);
  const playerStatuses = activeStatuses(b, 'player');
  const enemyStatuses = activeStatuses(b, 'enemy');

  /**
   * Turn engine fx events into motion. The engine says what happened; this is
   * the only place that decides how it looks.
   */
  useEffect(() => {
    const events = b.fx;
    if (events.length === 0) return;
    // fx arrays are replaced wholesale each action, so a length check is enough
    if (consumed.current === events.length && events.length === 0) return;
    consumed.current = events.length;

    const newFloats: FloatingNumber[] = [];
    let pose: FigurePose | null = null;
    let shake = false;

    for (const fx of events as FxEvent[]) {
      switch (fx.type) {
        case 'playerAttack':
          pose = fx.animation === 'guard' ? 'guard' : fx.animation === 'repair' || fx.animation === 'tape' || fx.animation === 'patch' ? 'repair' : 'attack';
          break;
        case 'hit':
          if (fx.amount > 0) {
            newFloats.push({ id: floatId.current++, target: fx.target, text: `-${fx.amount}`, tone: 'damage' });
            if (fx.target === 'enemy') shake = true;
            else pose = 'hit';
          } else if (fx.blocked > 0) {
            newFloats.push({ id: floatId.current++, target: fx.target, text: `막음 ${fx.blocked}`, tone: 'block' });
          }
          break;
        case 'heal':
          if (fx.amount > 0) newFloats.push({ id: floatId.current++, target: 'player', text: `+${fx.amount}`, tone: 'heal' });
          break;
        case 'glue':
          newFloats.push({ id: floatId.current++, target: 'player', text: `Glue ${fx.amount > 0 ? '+' : ''}${fx.amount}`, tone: 'glue' });
          break;
        case 'block':
          if (fx.amount > 0) newFloats.push({ id: floatId.current++, target: fx.target, text: `+${fx.amount} Block`, tone: 'block' });
          break;
        case 'outcome':
          pose = fx.outcome === 'won' ? 'win' : 'lose';
          break;
        default:
          break;
      }
    }

    if (newFloats.length) {
      setFloats((f) => [...f, ...newFloats]);
      window.setTimeout(() => {
        setFloats((f) => f.filter((x) => !newFloats.some((n) => n.id === x.id)));
      }, 1100);
    }
    if (shake) {
      setEnemyShake(true);
      setHitStop(true);
      window.setTimeout(() => setHitStop(false), BALANCE.feel.hitStop);
      window.setTimeout(() => setEnemyShake(false), 420);
    }
    if (pose) {
      setPlayerPose(pose);
      if (pose !== 'win' && pose !== 'lose') window.setTimeout(() => setPlayerPose('idle'), 460);
    }
  }, [b.fx, b]);

  const playerTurn = b.side === 'player' && b.outcome === 'ongoing';

  return (
    <div className={`screen battle${hitStop ? ' is-hitstop' : ''}`} data-testid="battle-screen">
      {/* ── top bar: the two combatants' vitals ───────────────────────────── */}
      <div className="battle__top">
        <div className="combatant combatant--player paper">
          <div className="combatant__head">
            <strong>Peelbeast</strong>
            <span className="label">
              ATK {b.player.atk} · SPD {b.player.spd} · 박리저항 {b.player.peelResist}
            </span>
          </div>
          <Bar value={b.player.hp} max={b.player.maxHp} variant="hp" label="HP" />
          <Bar value={b.player.glue} max={b.player.maxGlue} variant="glue" label="Glue" />
          {b.player.block > 0 && (
            <div className="combatant__block" data-testid="player-block">
              <Sprite assetId="icon.status.block" className="combatant__block-icon" decorative />
              Block {b.player.block}
            </div>
          )}
          <div className="status-rail">
            {playerStatuses.map((s) => (
              <StatusChip key={s.id} status={s.id} value={s.value} size="sm" />
            ))}
          </div>
        </div>

        <div className={`battle__turn${playerTurn ? '' : ' is-enemy'}`} data-testid="turn-pill">
          <span className="label">turn {b.turn}</span>
          <strong>{b.outcome !== 'ongoing' ? (b.outcome === 'won' ? 'CLEAR' : 'DOWN') : playerTurn ? 'YOUR TURN' : 'ENEMY TURN'}</strong>
          {enemyThinking && <span className="battle__thinking">…</span>}
          <div className="battle__ink">
            <Bar value={b.ink} max={b.inkMax} variant="ink" label="Ink Tide" compact />
          </div>
        </div>

        <div className="combatant combatant--enemy paper">
          <div className="combatant__head">
            <RefPhoto assetId={ENEMY_REF[currentEnemyId(b)] ?? ''} className="combatant__portrait" tilt={3} />
            <strong>{b.enemy.name}</strong>
            <span className="label">
              {b.enemy.subtitle}
              {encounter.phases.length > 1 && ` · phase ${b.enemy.phaseIndex + 1}/${encounter.phases.length}`}
            </span>
          </div>
          <Bar value={b.enemy.hp} max={b.enemy.maxHp} variant="enemy" label="HP" />
          {b.enemy.block > 0 && (
            <div className="combatant__block">
              <Sprite assetId="icon.status.block" className="combatant__block-icon" decorative />
              Block {b.enemy.block}
            </div>
          )}
          {b.enemy.fury > 0 && <div className="combatant__fury">Fury {b.enemy.fury} — 모든 피해 +{b.enemy.fury}</div>}
          <div className="status-rail">
            {enemyStatuses.map((s) => (
              <StatusChip key={s.id} status={s.id} value={s.value} size="sm" />
            ))}
          </div>
        </div>
      </div>

      {/* ── stage: the characters own the screen ──────────────────────────── */}
      <div className="battle__stage" ref={stageRef}>
        <Sprite assetId={encounter.backgroundAssetId} className="battle__bg" decorative />
        <Sprite assetId="prop.pencil_cup" className="battle__prop battle__prop--left" decorative />
        <Sprite assetId="prop.torn_note" className="battle__prop battle__prop--right" decorative />

        <div className="battle__actors">
          <div className="battle__actor battle__actor--player">
            <PeelbeastFigure assembly={b.assembly} peeled={peeled} width={figureWidth} pose={playerPose} />
            {floats
              .filter((f) => f.target === 'player')
              .map((f, i) => (
                <span key={f.id} className={`float float--${f.tone}`} style={{ ['--i' as string]: i }}>
                  {f.text}
                </span>
              ))}
          </div>

          <div className={`battle__actor battle__actor--enemy${enemyShake ? ' is-shaking' : ''}`}>
            <Sprite
              assetId={b.enemy.assetId}
              className="battle__enemy-sprite"
              alt={b.enemy.name}
              style={{ maxHeight: figureWidth * 1.1 }}
            />
            {floats
              .filter((f) => f.target === 'enemy')
              .map((f, i) => (
                <span key={f.id} className={`float float--${f.tone}`} style={{ ['--i' as string]: i }}>
                  {f.text}
                </span>
              ))}
          </div>
        </div>

        {/* peeled parts really do end up on the desk */}
        <div className="battle__floor" data-testid="floor-parts">
          {b.player.floor.map((f) => (
            <div
              key={f.key}
              className="floor-part"
              style={{ left: `${f.x * 100}%`, transform: `rotate(${f.rotation}deg)` }}
              title={`${slotName(f.slot)} — ${PARTS[f.partId]?.name ?? f.partId}`}
            >
              <Sprite assetId={PARTS[f.partId]?.assetId ?? 'ph.generic'} slotHint={f.slot} className="floor-part__img" />
              <span className="floor-part__tag">{slotName(f.slot)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── intents ───────────────────────────────────────────────────────── */}
      <div className="battle__intents">
        <IntentRail battle={b} revealed={revealed} />
        {!revealed && <p className="intent-note">표시된 피해는 추정치다. Eye Sticker를 장착하거나 Insight를 얻으면 정확한 수치가 공개된다.</p>}
      </div>

      {/* ── actions ───────────────────────────────────────────────────────── */}
      <div className="action-bar" data-testid="action-bar">
        {CORE_ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="action action--core"
            disabled={!playerTurn}
            onClick={() => act(a.id)}
            data-testid={`action-${a.id}`}
          >
            <Sprite assetId={a.icon} className="action__icon" decorative />
            <strong>{a.name}</strong>
            <span>{a.desc}</span>
          </button>
        ))}

        {skills.map((s) => (
          <button
            key={s.slot}
            type="button"
            className={`action action--skill${s.peeled ? ' is-peeled' : ''}`}
            disabled={!s.availability.enabled}
            onClick={() => useSkill(s.slot)}
            data-testid={`skill-${s.slot}`}
            title={s.skill ? describeEffects(s.skill.effects).join(' · ') : undefined}
          >
            <Sprite assetId={s.skill?.iconAssetId ?? `ph.${s.slot}`} className="action__icon" decorative />
            <strong>{s.skill?.name ?? `${slotName(s.slot)} 없음`}</strong>
            <span>{s.skill ? describeEffects(s.skill.effects).join(' · ') : '이 슬롯은 비어 있다.'}</span>
            <em className="action__state">
              {s.peeled ? '박리됨' : s.availability.enabled ? `${slotName(s.slot)} · Glue ${s.skill?.glueCost ?? 0}` : s.availability.reason}
            </em>
          </button>
        ))}
      </div>

      {/* ── side panel: peel state + log ──────────────────────────────────── */}
      <aside className={`battle__side${logOpen ? '' : ' is-collapsed'}`}>
        <button type="button" className="battle__side-toggle btn btn--ghost" onClick={() => setLogOpen((v) => !v)}>
          {logOpen ? '패널 접기' : '패널 펼치기'}
        </button>
        {logOpen && (
          <>
            <div className="peel-status" data-testid="peel-status">
              <div className="label">part integrity</div>
              {(['head', 'hand', 'core', 'trinket'] as PartSlot[]).map((slot) => {
                const rt = b.player.slots[slot];
                const part = rt.partId ? PARTS[rt.partId] : null;
                return (
                  <div key={slot} className={`peel-status__row${rt.peeled ? ' is-peeled' : ''}`} data-testid={`peel-${slot}`}>
                    <Sprite assetId={part?.assetId ?? `ph.${slot}`} slotHint={slot} className="peel-status__art" decorative />
                    <div>
                      <strong>{slotName(slot)}</strong>
                      <span>{part?.name ?? '비어 있음'}</span>
                    </div>
                    <span className={`peel-status__state${rt.peeled ? ' is-off' : ''}`}>
                      {!part ? '—' : rt.peeled ? 'PEELED' : rt.cooldown > 0 ? `CD ${rt.cooldown}` : 'OK'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="battle-log" data-testid="battle-log">
              <div className="label">log</div>
              <ul>
                {b.log.map((entry) => (
                  <li key={entry.id} className={`battle-log__entry battle-log__entry--${entry.tone}`}>
                    <strong>{entry.who}</strong>
                    <span>{entry.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
