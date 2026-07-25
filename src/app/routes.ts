/**
 * Hash routing.
 *
 * Hash rather than history API so the built bundle works from `file://`, from a
 * GitHub Pages subpath and from `vite preview` with no server rewrite rules.
 */

export type ScreenId =
  | 'title'
  | 'route'
  | 'workshop'
  | 'battle'
  | 'event'
  | 'shop'
  | 'reward'
  | 'result'
  | 'dev-assets'
  | 'dev-data';

const PATHS: Record<ScreenId, string> = {
  title: '/',
  route: '/route',
  workshop: '/workshop',
  battle: '/battle',
  event: '/event',
  shop: '/shop',
  reward: '/reward',
  result: '/result',
  'dev-assets': '/dev/assets',
  'dev-data': '/dev/data',
};

const BY_PATH = Object.fromEntries(Object.entries(PATHS).map(([k, v]) => [v, k as ScreenId])) as Record<string, ScreenId>;

export function pathFor(screen: ScreenId): string {
  return `#${PATHS[screen]}`;
}

export function screenFromHash(hash: string): ScreenId | null {
  const path = hash.replace(/^#/, '') || '/';
  return BY_PATH[path] ?? null;
}

export function navigate(screen: ScreenId): void {
  const target = pathFor(screen);
  if (window.location.hash !== target) window.location.hash = target;
}

/** Screens reachable directly by URL without a live run. */
export const STANDALONE_SCREENS: ScreenId[] = ['title', 'dev-assets', 'dev-data'];
