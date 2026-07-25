import { useGame } from '@/app/gameStore';
import { SHOPS } from '@/game/data/shops';
import { PARTS } from '@/game/data/parts';
import { RELICS } from '@/game/data/relics';
import { canAfford, currentNode, describeShopItem, shopItemCost, shopOfferItems } from '@/game/engine/rewardResolver';
import { computeBuild } from '@/game/systems/assemblySystem';
import { EmptyNote, Panel, SectionTitle } from '../common/ui';
import { Sprite } from '../common/Sprite';
import { PeelbeastFigure } from '../common/PeelbeastFigure';
import { effectLabel } from '../event/EventScreen';
import { RefPhoto } from '../common/RefPhoto';

const KIND_LABEL = { relic: '리릭', part: '파츠', service: '서비스' } as const;

/** Relics have no art of their own yet, so their type picks a readable glyph. */
const RELIC_ICON: Record<string, string> = {
  offense: 'fx.slash',
  defense: 'icon.status.block',
  sustain: 'fx.patch',
  tempo: 'icon.status.haste',
  resource: 'icon.status.glue',
  control: 'icon.status.ink',
  repair: 'icon.status.peel',
  speed: 'icon.status.drift',
};

export function ShopScreen() {
  const { run, buy, leaveNode } = useGame();
  if (!run) return <EmptyNote>진행 중인 런이 없다.</EmptyNote>;

  const node = currentNode(run);
  const shopId = node?.shopId ?? 'bench';
  const shop = SHOPS[shopId];
  if (!shop) return <EmptyNote>이 노드에는 상점이 없다.</EmptyNote>;

  const offers = shopOfferItems(run, shopId);
  const build = computeBuild(run.assembly, { relics: run.relics });

  return (
    <div className="screen shop" data-testid="shop-screen">
      <SectionTitle
        label="shop"
        title={shop.name}
        aside={
          <div className="shop__wallet">
            <span className="chip" data-testid="shop-scrap">Scrap {run.scrap}</span>
            {run.shopDiscount > 0 && <span className="chip">할인 −{run.shopDiscount}</span>}
            <span className="chip">HP {run.carry.hp}/{build.maxHp}</span>
            <span className="chip">Glue {run.carry.glue}/{build.maxGlue}</span>
            <button type="button" className="btn btn--primary" onClick={leaveNode} data-testid="shop-leave">
              상점 나가기
            </button>
          </div>
        }
      />

      <div className="shop__layout">
        <Panel className="shop__counter" tape>
          <Sprite assetId={shop.artAssetId} className="shop__counter-art" decorative />
          <p>{shop.desc}</p>
          <div className="shop__preview">
            <PeelbeastFigure assembly={run.assembly} width={220} />
          </div>
          <RefPhoto assetId="ref.stage" caption="desk, as drawn" tilt={2} className="shop__photo" />
        </Panel>

        <div className="shop__grid">
          {offers.map((item) => {
            const { name, desc } = describeShopItem(item);
            const cost = shopItemCost(run, item);
            const bought = run.shopPurchased.includes(item.id);
            const affordable = canAfford(run, shopId, item.id);
            const part = item.kind === 'part' ? PARTS[item.ref] : null;
            const relic = item.kind === 'relic' ? RELICS[item.ref] : null;
            const art = part?.assetId ?? (relic ? (RELIC_ICON[relic.type] ?? 'ui.tag') : 'fx.patch');
            return (
              <button
                key={item.id}
                type="button"
                className={`shop-card shop-card--${item.kind}${bought ? ' is-bought' : ''}`}
                disabled={!affordable}
                onClick={() => buy(shopId, item.id)}
                data-testid={`shop-item-${item.id}`}
              >
                <Sprite assetId={art} slotHint={part?.slot} className="shop-card__art" decorative />
                <div className="shop-card__head">
                  <strong>{name}</strong>
                  <span className="shop-card__cost">{cost}</span>
                </div>
                <span className="shop-card__kind">{KIND_LABEL[item.kind]}</span>
                <span className="shop-card__desc">{desc}</span>
                {item.effects && <em className="shop-card__effects">{item.effects.map(effectLabel).join(' · ')}</em>}
                {part && <em className="shop-card__effects">{part.slot} 슬롯에 즉시 장착된다</em>}
                <span className="shop-card__state">{bought ? '구매함' : affordable ? '구매' : 'Scrap 부족'}</span>
              </button>
            );
          })}
          {offers.length === 0 && <EmptyNote>남은 물건이 없다.</EmptyNote>}
        </div>
      </div>
    </div>
  );
}
