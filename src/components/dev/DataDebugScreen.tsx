import { useMemo, useState } from 'react';
import { useGame } from '@/app/gameStore';
import { validateContent } from '@/game/data/validate';
import { PARTS } from '@/game/data/parts';
import { SYNERGIES } from '@/game/data/synergies';
import { INTENTS } from '@/game/data/intents';
import { ENCOUNTERS } from '@/game/data/enemies';
import { RELICS } from '@/game/data/relics';
import { EVENTS } from '@/game/data/events';
import { ROUTES } from '@/game/data/routes';
import { STATUSES } from '@/game/data/statuses';
import { BALANCE } from '@/game/data/balance';
import { describeEffects } from '@/game/engine/describe';
import { Panel, SectionTitle } from '../common/ui';

type Tab = 'validation' | 'parts' | 'intents' | 'encounters' | 'run' | 'balance';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'validation', label: 'Validation' },
  { id: 'parts', label: 'Parts & Synergies' },
  { id: 'intents', label: 'Intents' },
  { id: 'encounters', label: 'Encounters & Routes' },
  { id: 'run', label: 'Live Run State' },
  { id: 'balance', label: 'Balance' },
];

/** `/dev/data` — content integrity and live state inspection. */
export function DataDebugScreen() {
  const { run, battle } = useGame();
  const [tab, setTab] = useState<Tab>('validation');
  const issues = useMemo(() => validateContent(), []);
  const errors = issues.filter((i) => i.level === 'error');

  return (
    <div className="screen dev" data-testid="data-debug-screen">
      <SectionTitle
        label="developer"
        title="Game Data Debug"
        aside={
          <div className="dev__summary">
            <span className={`chip ${errors.length ? 'chip--bad' : 'chip--ok'}`} data-testid="content-errors">
              {errors.length} content errors
            </span>
            <span className="chip">{issues.length - errors.length} warnings</span>
          </div>
        }
      />

      <div className="dev__cats">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`btn btn--ghost${tab === t.id ? ' is-active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <Panel className="dev__panel">
        {tab === 'validation' && (
          <ul className="dev__issues-list">
            {issues.map((i, n) => (
              <li key={n} className={`dev__issue dev__issue--${i.level}`}>
                <code>{i.where}</code> {i.message}
              </li>
            ))}
            {issues.length === 0 && <p className="empty-note">문제 없음. 모든 참조가 유효하다.</p>}
          </ul>
        )}

        {tab === 'parts' && (
          <>
            <table className="dev__table">
              <thead>
                <tr>
                  <th>id</th>
                  <th>slot</th>
                  <th>stats</th>
                  <th>active</th>
                  <th>effects</th>
                  <th>passive rules</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(PARTS).map((p) => (
                  <tr key={p.id}>
                    <td><code>{p.id}</code></td>
                    <td>{p.slot}</td>
                    <td>{JSON.stringify(p.stats)}</td>
                    <td>{p.active.name} (CD {p.active.cooldown}/Glue {p.active.glueCost})</td>
                    <td>{describeEffects(p.active.effects).join(' · ')}</td>
                    <td>{(p.passive.rules ?? []).map((r) => r.kind).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="workshop__sub">Synergies</h3>
            <table className="dev__table">
              <thead>
                <tr>
                  <th>id</th>
                  <th>requires</th>
                  <th>modifiers</th>
                  <th>rules</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(SYNERGIES).map((s) => (
                  <tr key={s.id}>
                    <td><code>{s.id}</code></td>
                    <td>{s.requires.map((r) => PARTS[r]?.name ?? r).join(' + ')}</td>
                    <td>{JSON.stringify(s.modifiers ?? {})}</td>
                    <td>{(s.rules ?? []).map((r) => r.kind).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === 'intents' && (
          <table className="dev__table">
            <thead>
              <tr>
                <th>id</th>
                <th>category</th>
                <th>generated text</th>
                <th>blockable</th>
                <th>piercing</th>
                <th>used by</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(INTENTS).map((i) => (
                <tr key={i.id}>
                  <td><code>{i.id}</code></td>
                  <td>{i.category}</td>
                  <td>{describeEffects(i.effects).join(' · ')}</td>
                  <td>{i.blockable ? 'yes' : 'no'}</td>
                  <td>{i.piercing ? 'yes' : 'no'}</td>
                  <td>
                    {Object.values(ENCOUNTERS)
                      .filter((e) => e.phases.some((p) => p.moves.includes(i.id) || p.desperation?.moveId === i.id))
                      .map((e) => e.id)
                      .join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'encounters' && (
          <>
            <table className="dev__table">
              <thead>
                <tr>
                  <th>id</th>
                  <th>kind</th>
                  <th>phases</th>
                  <th>hp</th>
                  <th>scrap</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(ENCOUNTERS).map((e) => (
                  <tr key={e.id}>
                    <td><code>{e.id}</code></td>
                    <td>{e.kind}</td>
                    <td>{e.phases.map((p) => p.name).join(' → ')}</td>
                    <td>{e.phases.map((p) => p.maxHp).join(' / ')}</td>
                    <td>{e.scrapReward}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="workshop__sub">Routes</h3>
            <table className="dev__table">
              <thead>
                <tr>
                  <th>id</th>
                  <th>nodes</th>
                  <th>risk</th>
                  <th>scrap</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(ROUTES).map((r) => (
                  <tr key={r.id}>
                    <td><code>{r.id}</code></td>
                    <td>{r.nodes.map((n) => n.type).join(' → ')}</td>
                    <td>{r.profile.risk}</td>
                    <td>{r.profile.scrap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="workshop__sub">Statuses / Relics / Events</h3>
            <p className="dev__counts">
              statuses {Object.keys(STATUSES).length} · relics {Object.keys(RELICS).length} · events {Object.keys(EVENTS).length} ·
              intents {Object.keys(INTENTS).length} · parts {Object.keys(PARTS).length}
            </p>
          </>
        )}

        {tab === 'run' && (
          <div className="dev__json">
            <h3 className="workshop__sub">RunState</h3>
            <pre data-testid="debug-run">{run ? JSON.stringify(run, null, 2) : '없음'}</pre>
            <h3 className="workshop__sub">BattleState</h3>
            <pre data-testid="debug-battle">{battle ? JSON.stringify({ ...battle, log: battle.log.slice(0, 6) }, null, 2) : '없음'}</pre>
          </div>
        )}

        {tab === 'balance' && (
          <div className="dev__json">
            <pre>{JSON.stringify(BALANCE, null, 2)}</pre>
          </div>
        )}
      </Panel>
    </div>
  );
}
