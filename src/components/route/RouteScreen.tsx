import { useGame } from '@/app/gameStore';
import { ROUTES } from '@/game/data/routes';
import { ENCOUNTERS } from '@/game/data/enemies';
import { EVENTS } from '@/game/data/events';
import { SHOPS } from '@/game/data/shops';
import { Panel, SectionTitle } from '../common/ui';
import { Sprite } from '../common/Sprite';
import type { RouteDef, RouteNodeDef } from '@/game/data/types';

const RISK_LABEL = { low: '낮음', medium: '보통', high: '높음' } as const;
const SCRAP_LABEL = { low: '적음', medium: '보통', high: '많음' } as const;
const RECOVERY_LABEL = { scarce: '희박', normal: '보통', generous: '넉넉' } as const;

const NODE_ART: Record<string, string> = {
  combat: 'enemy.pencil_rat',
  elite: 'enemy.scissor_crow',
  boss: 'enemy.tape_spider',
  event: 'prop.torn_note',
  shop: 'prop.tape_dispenser',
};

export function nodeTitle(node: RouteNodeDef): string {
  if (node.encounterId) return ENCOUNTERS[node.encounterId]?.name ?? node.label;
  if (node.eventId) return EVENTS[node.eventId]?.title ?? node.label;
  if (node.shopId) return SHOPS[node.shopId]?.name ?? node.label;
  return node.label;
}

export function nodeSummary(node: RouteNodeDef): string {
  if (node.encounterId) return ENCOUNTERS[node.encounterId]?.summary ?? '';
  if (node.eventId) return EVENTS[node.eventId]?.text ?? '';
  if (node.shopId) return SHOPS[node.shopId]?.desc ?? '';
  return '';
}

/** Route picker, shown before a run starts. */
export function RouteScreen() {
  const { startRun, go } = useGame();

  return (
    <div className="screen route-pick">
      <SectionTitle label="choose your run" title="Route Select" aside={<button type="button" className="btn btn--ghost" onClick={() => go('title')}>Back</button>} />
      <div className="route-pick__grid">
        {Object.values(ROUTES).map((route) => (
          <RouteCard key={route.id} route={route} onPick={() => startRun(route.id)} />
        ))}
      </div>
    </div>
  );
}

function RouteCard({ route, onPick }: { route: RouteDef; onPick: () => void }) {
  return (
    <Panel className="route-card" tape>
      <div className="label">{route.nodes.length} nodes</div>
      <h3>{route.name}</h3>
      <p className="route-card__desc">{route.desc}</p>

      <dl className="route-card__profile">
        <div>
          <dt>위험도</dt>
          <dd className={`risk risk--${route.profile.risk}`}>{RISK_LABEL[route.profile.risk]}</dd>
        </div>
        <div>
          <dt>Scrap</dt>
          <dd>{SCRAP_LABEL[route.profile.scrap]}</dd>
        </div>
        <div>
          <dt>회복 기회</dt>
          <dd>{RECOVERY_LABEL[route.profile.recovery]}</dd>
        </div>
      </dl>
      <p className="route-card__notes">{route.profile.notes}</p>

      <ol className="route-card__nodes">
        {route.nodes.map((node, i) => (
          <li key={i} className={`route-dot route-dot--${node.type}`}>
            <Sprite assetId={NODE_ART[node.type] ?? 'ui.tag'} className="route-dot__art" decorative />
            <span>{node.label}</span>
          </li>
        ))}
      </ol>

      <button type="button" className="btn btn--primary" onClick={onPick} data-testid={`pick-route-${route.id}`}>
        {route.name} 시작
      </button>
    </Panel>
  );
}

/** Compact route progress board, embedded in the workshop. */
export function RouteBoard({ routeId, nodeIndex }: { routeId: string; nodeIndex: number }) {
  const route = ROUTES[routeId];
  if (!route) return null;
  return (
    <ol className="route-board">
      {route.nodes.map((node, i) => {
        const state = i < nodeIndex ? 'done' : i === nodeIndex ? 'current' : 'ahead';
        return (
          <li key={i} className={`route-board__node route-board__node--${node.type} is-${state}`}>
            <Sprite assetId={NODE_ART[node.type] ?? 'ui.tag'} className="route-board__art" decorative />
            <div className="route-board__text">
              <strong>
                {i + 1}. {nodeTitle(node)}
              </strong>
              <span>{nodeSummary(node)}</span>
            </div>
            <span className="route-board__tag">{node.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
