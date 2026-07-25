/**
 * Module resolver hook so Node scripts can import the game engine directly.
 *
 * `src/**` uses bundler-style imports — extensionless (`./balance`) and aliased
 * (`@/game/...`) — which Vite and Vitest resolve but bare Node does not. Node's
 * built-in TypeScript stripping handles the syntax; this only handles the paths.
 *
 * Usage:  node --import ./scripts/lib/ts-resolve.mjs scripts/simulate.mjs
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./ts-resolve-hooks.mjs', import.meta.url);

export { pathToFileURL };
