import { useGame } from '@/app/gameStore';
import { Sprite } from './Sprite';
import { PeelbeastFigure } from './PeelbeastFigure';
import { createAssembly } from '@/game/systems/assemblySystem';
import { DEFAULT_LOADOUT } from '@/game/data/parts';

const SHOWCASE = createAssembly(DEFAULT_LOADOUT);

export function TitleScreen() {
  const { go, continueRun, hasSave } = useGame();

  return (
    <div className="screen title">
      <Sprite assetId="bg.desk" className="title__bg" decorative />
      <div className="title__inner">
        <div className="title__figure">
          <PeelbeastFigure assembly={SHOWCASE} width={310} pose="idle" />
          {/* the original painted sticker the assembly system was built from,
              recovered from the v0.8 sheet with its background removed */}
          <Sprite assetId="art.hero_card" className="title__origin" alt="원본 스티커 아트" />
          <span className="title__origin-tag">original art</span>
        </div>

        <div className="paper title__card">
          <span className="tape-strip tape-strip--tl" />
          <div className="label">paper-craft roguelike</div>
          <h1 className="title__word">PEELBEAST</h1>
          <p className="title__tag">
            머리·손·코어·장신구를 붙여 짐승을 만든다. 전투에서 깎이는 건 체력만이 아니다 —
            <b> 붙여둔 파츠가 실제로 벗겨지고, 빌드가 무너진다.</b>
          </p>

          <div className="title__actions">
            <button type="button" className="btn btn--primary" onClick={() => go('route')} data-testid="new-run">
              New Run
            </button>
            <button type="button" className="btn" onClick={continueRun} disabled={!hasSave} data-testid="continue-run">
              Continue
            </button>
          </div>

          <div className="title__dev">
            <button type="button" className="btn btn--ghost" onClick={() => go('dev-assets')}>
              Asset Catalog
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => go('dev-data')}>
              Data Debug
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
