import { useState } from 'react';
import { useGame } from '@/app/gameStore';
import { EVENTS } from '@/game/data/events';
import { RELICS } from '@/game/data/relics';
import { currentNode, eventOptionAvailable } from '@/game/engine/rewardResolver';
import { STATUSES } from '@/game/data/statuses';
import type { RunEffect } from '@/game/data/types';
import { EmptyNote, Panel, SectionTitle } from '../common/ui';
import { Sprite } from '../common/Sprite';
import { EVENT_REF, RefPhoto } from '../common/RefPhoto';

export function EventScreen() {
  const { run, resolveEvent, leaveNode, enterCurrentNode } = useGame();
  const [chosen, setChosen] = useState<string | null>(null);

  if (!run) return <EmptyNote>진행 중인 런이 없다.</EmptyNote>;
  const node = currentNode(run);
  const event = node?.eventId ? EVENTS[node.eventId] : null;
  if (!event) return <EmptyNote>이 노드에는 이벤트가 없다.</EmptyNote>;

  const forcedFight = !!run.pendingEncounterId;

  return (
    <div className="screen event" data-testid="event-screen">
      <SectionTitle label="event" title={event.title} aside={<span className="chip">Scrap {run.scrap}</span>} />

      <div className="event__layout">
        <Panel className="event__art" tape>
          <Sprite assetId={event.artAssetId} className="event__art-img" decorative />
          {/* original reference art, pinned to the page like a photograph */}
          <RefPhoto assetId={EVENT_REF[event.id] ?? ''} caption="reference" tilt={-3} className="event__art-photo" />
        </Panel>

        <Panel className="event__body paper--ruled">
          <p className="event__text">{event.text}</p>

          <div className="event__options">
            {event.options.map((opt) => {
              const available = eventOptionAvailable(run, event.id, opt.id);
              const isChosen = chosen === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`event-option${isChosen ? ' is-chosen' : ''}`}
                  disabled={!!chosen || !available}
                  onClick={() => {
                    resolveEvent(event.id, opt.id);
                    setChosen(opt.id);
                  }}
                  data-testid={`event-option-${opt.id}`}
                >
                  <strong>{opt.title}</strong>
                  <span>{opt.desc}</span>
                  <em className="event-option__effects">{opt.effects.map(effectLabel).join(' · ')}</em>
                  {!available && <em className="event-option__blocked">조건 미충족</em>}
                </button>
              );
            })}
          </div>

          {chosen && (
            <div className="event__resolved" data-testid="event-resolved">
              <strong>{event.options.find((o) => o.id === chosen)?.title}</strong>
              <span>선택이 런에 반영되었다.</span>
            </div>
          )}

          <div className="event__actions">
            {forcedFight ? (
              <button type="button" className="btn btn--primary" onClick={enterCurrentNode} data-testid="event-fight">
                전투 시작
              </button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={leaveNode} data-testid="event-continue">
                {chosen ? '다음 노드로' : '그냥 지나친다'}
              </button>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function effectLabel(e: RunEffect): string {
  switch (e.kind) {
    case 'scrap':
      return `Scrap ${e.amount >= 0 ? '+' : ''}${e.amount}`;
    case 'hp':
      return `HP ${e.amount >= 0 ? '+' : ''}${e.amount}`;
    case 'glue':
      return `Glue ${e.amount >= 0 ? '+' : ''}${e.amount}`;
    case 'relic':
      return `${RELICS[e.relicId]?.name ?? e.relicId} 획득`;
    case 'randomRelic':
      return '무작위 리릭 1개';
    case 'startBlock':
      return `다음 전투 Block +${e.amount}`;
    case 'startStatus':
      return `다음 전투 ${STATUSES[e.status].name} ${e.amount}`;
    case 'damagePart':
      return e.slot === 'random' ? '무작위 파츠 손상' : `${e.slot} 파츠 손상`;
    case 'repairAllParts':
      return '파츠 전부 정비';
    case 'shopDiscount':
      return `상점 ${e.amount} 할인`;
    case 'forceEncounter':
      return '즉시 전투';
  }
}
