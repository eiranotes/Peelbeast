import { useGame } from '@/app/gameStore';
import { PARTS } from '@/game/data/parts';
import { RELICS } from '@/game/data/relics';
import { computeBuild } from '@/game/systems/assemblySystem';
import { currentRoute, isFinalNode } from '@/game/engine/rewardResolver';
import { EmptyNote, Panel, SectionTitle, StatBlock } from './ui';
import { PeelbeastFigure } from './PeelbeastFigure';
import { Sprite } from './Sprite';

/** Post-battle recap. Reached only on a win. */
export function RewardScreen() {
  const { run, summary, leaveNode } = useGame();
  if (!run || !summary) return <EmptyNote>표시할 결과가 없다.</EmptyNote>;

  const build = computeBuild(run.assembly, { relics: run.relics });
  const final = isFinalNode(run);

  return (
    <div className="screen reward" data-testid="reward-screen">
      <SectionTitle label="encounter clear" title={summary.encounterName} />
      <div className="reward__layout">
        <Panel className="reward__figure" tape>
          <PeelbeastFigure assembly={run.assembly} width={260} pose="win" />
        </Panel>

        <Panel className="reward__body">
          <StatBlock
            items={[
              { key: 'scrap', label: 'Scrap', value: run.scrap, delta: summary.scrapGained },
              { key: 'hp', label: 'HP', value: `${run.carry.hp}/${build.maxHp}` },
              { key: 'glue', label: 'Glue', value: `${run.carry.glue}/${build.maxGlue}` },
              { key: 'turns', label: '턴', value: summary.turns },
              { key: 'peel', label: '박리', value: summary.peelCount },
            ]}
          />

          <h3 className="workshop__sub">현재 로드아웃</h3>
          <ul className="reward__loadout">
            {(['head', 'hand', 'core', 'trinket'] as const).map((slot) => {
              const id = run.assembly.slots[slot];
              return (
                <li key={slot}>
                  <Sprite assetId={id ? PARTS[id].assetId : `ph.${slot}`} slotHint={slot} className="reward__loadout-art" decorative />
                  <div>
                    <strong>{slot}</strong>
                    <span>{id ? PARTS[id].name : '비어 있음'}</span>
                  </div>
                </li>
              );
            })}
          </ul>

          {run.relics.length > 0 && (
            <>
              <h3 className="workshop__sub">런 모드</h3>
              <ul className="passive-list">
                {run.relics.map((id) => (
                  <li key={id}>
                    <strong>{RELICS[id]?.name}</strong>
                    <span>{RELICS[id]?.desc}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="reward__note">
            남은 HP와 Glue는 다음 노드로 이어진다. 작업대에서 파츠를 바꾸면 최대치가 달라지므로 이월값도 함께 조정된다.
          </p>

          <button type="button" className="btn btn--primary" onClick={leaveNode} data-testid="reward-continue">
            {final ? '런 마무리' : '다음 노드로'}
          </button>
        </Panel>
      </div>
    </div>
  );
}

/** End of run — victory or defeat. */
export function ResultScreen() {
  const { run, summary, startRun, abandonRun } = useGame();
  if (!run) return <EmptyNote>표시할 런이 없다.</EmptyNote>;

  const won = run.status === 'won';
  const route = currentRoute(run);

  return (
    <div className="screen result" data-testid="result-screen">
      <SectionTitle label={won ? 'run complete' : 'run failed'} title={won ? '드래프트보드를 넘었다' : '여기서 끊겼다'} />

      <div className="result__layout">
        <Panel className="result__figure" tape>
          <PeelbeastFigure assembly={run.assembly} width={280} pose={won ? 'win' : 'lose'} />
        </Panel>

        <Panel className="result__body paper--ruled">
          <StatBlock
            items={[
              { key: 'route', label: '루트', value: route.name },
              { key: 'nodes', label: '진행', value: `${Math.min(run.nodeIndex + 1, route.nodes.length)}/${route.nodes.length}` },
              { key: 'wins', label: '전투 승리', value: run.battlesWon },
              { key: 'turns', label: '총 턴', value: run.turnsTaken },
              { key: 'scrap', label: 'Scrap', value: run.scrap },
            ]}
          />

          {summary && !won && <p className="result__note">마지막 전투: {summary.encounterName} · {summary.turns}턴 · 박리 {summary.peelCount}회</p>}

          <h3 className="workshop__sub">노드 기록</h3>
          <ol className="result__history">
            {run.history.map((h, i) => (
              <li key={i} className={`result__history-item is-${h.outcome}`}>
                <strong>
                  {h.index + 1}. {h.label}
                </strong>
                <span>{h.detail}</span>
              </li>
            ))}
            {run.history.length === 0 && <EmptyNote>기록이 없다.</EmptyNote>}
          </ol>

          <div className="result__actions">
            <button type="button" className="btn btn--primary" onClick={() => startRun(run.routeId)} data-testid="result-retry">
              같은 루트로 다시
            </button>
            <button type="button" className="btn" onClick={abandonRun} data-testid="result-title">
              타이틀로
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
