/**
 * Resolution hooks loaded by `ts-resolve.mjs`.
 *
 *   `@/game/data/balance`  →  <root>/src/game/data/balance.ts
 *   `./balance`            →  ./balance.ts  (then ./balance/index.ts)
 *
 * Only paths are rewritten. Node strips the TypeScript itself.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'src');
const EXTS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

function firstExisting(base) {
  for (const ext of EXTS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // alias
  if (specifier.startsWith('@/')) {
    const base = path.join(SRC, specifier.slice(2));
    const hit = fs.existsSync(base) && fs.statSync(base).isFile() ? base : firstExisting(base);
    if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
  }

  // relative, missing extension
  if (specifier.startsWith('.') && !path.extname(specifier) && context.parentURL) {
    const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    const hit = firstExisting(base);
    if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
