import { useEffect } from 'react';
import { GameProvider, useGame } from './gameStore';
import { STANDALONE_SCREENS } from './routes';
import { TitleScreen } from '@/components/common/TitleScreen';
import { RouteScreen } from '@/components/route/RouteScreen';
import { AssemblyScreen } from '@/components/assembly/AssemblyScreen';
import { BattleScreen } from '@/components/battle/BattleScreen';
import { EventScreen } from '@/components/event/EventScreen';
import { ShopScreen } from '@/components/shop/ShopScreen';
import { RewardScreen, ResultScreen } from '@/components/common/OutcomeScreens';
import { AssetCatalogScreen } from '@/components/dev/AssetCatalogScreen';
import { DataDebugScreen } from '@/components/dev/DataDebugScreen';

import '@/styles/base.css';
import '@/styles/figure.css';
import '@/styles/game.css';
import '@/styles/dev.css';

export function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}

function Shell() {
  const { screen, go, run } = useGame();

  // A deep link to an in-run screen without a run falls back to the title so the
  // app never renders an empty frame.
  useEffect(() => {
    if (!run && !STANDALONE_SCREENS.includes(screen) && screen !== 'route') {
      go('title');
    }
  }, [run, screen, go]);

  return (
    <div className="app">
      <header className="app__bar">
        <span className="app__brand">PEELBEAST</span>
        {run && (
          <span className="chip">
            {run.status === 'active' ? `Node ${run.nodeIndex + 1}` : run.status === 'won' ? 'Run complete' : 'Run failed'} · Scrap {run.scrap}
          </span>
        )}
        <nav className="app__nav">
          <button type="button" className="btn btn--ghost" onClick={() => go('title')}>
            Title
          </button>
          {run && (
            <button type="button" className="btn btn--ghost" onClick={() => go('workshop')} data-testid="nav-workshop">
              Workshop
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={() => go('dev-assets')} data-testid="nav-assets">
            /dev/assets
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => go('dev-data')} data-testid="nav-data">
            /dev/data
          </button>
        </nav>
      </header>

      <main className="app__main">
        <ScreenBody />
      </main>
    </div>
  );
}

function ScreenBody() {
  const { screen } = useGame();
  switch (screen) {
    case 'title':
      return <TitleScreen />;
    case 'route':
      return <RouteScreen />;
    case 'workshop':
      return <AssemblyScreen />;
    case 'battle':
      return <BattleScreen />;
    case 'event':
      return <EventScreen />;
    case 'shop':
      return <ShopScreen />;
    case 'reward':
      return <RewardScreen />;
    case 'result':
      return <ResultScreen />;
    case 'dev-assets':
      return <AssetCatalogScreen />;
    case 'dev-data':
      return <DataDebugScreen />;
    default:
      return <TitleScreen />;
  }
}
