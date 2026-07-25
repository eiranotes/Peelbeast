#!/usr/bin/env node
/**
 * Export the typed catalog to `public/assets/catalog.json`.
 *
 * `src/assets/assetCatalog.ts` stays the source of truth — it gets type checking
 * and IDE completion. This JSON mirror exists so external tooling (art pipeline
 * scripts, a future editor, anything not running TypeScript) can read the same
 * metadata without parsing TS.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSET_CATALOG } from '../src/assets/assetCatalog.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/assets/catalog.json');

const payload = {
  generatedBy: 'scripts/export-catalog.mjs',
  note: 'Mirror of src/assets/assetCatalog.ts. Edit the TypeScript file, not this one.',
  count: Object.keys(ASSET_CATALOG).length,
  assets: ASSET_CATALOG,
};

await fs.writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`wrote ${path.relative(ROOT, OUT)} (${payload.count} entries)`);
