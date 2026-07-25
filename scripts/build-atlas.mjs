#!/usr/bin/env node
/**
 * Atlas generation.
 *
 * The v0.8 build shipped a hand-maintained `assets/atlas.webp` whose coordinate
 * table lived inline in `index.html`; the two drifted apart and a third of the
 * regions ended up pointing at empty space. Here the atlas is a BUILD ARTIFACT:
 * source images and the logical catalog come first, and this script derives the
 * sheet plus its coordinate JSON. Nobody edits a packed sheet by hand.
 *
 * Output:
 *   public/assets/generated/atlas.webp
 *   public/assets/generated/atlas.json   { size, sprites: { <assetId>: {...} } }
 *
 * The runtime does not require the atlas — individual PNGs are the default and
 * keep hot-swapping art trivial. The atlas exists for a future packed build and
 * as a check that every catalog entry resolves to a real image.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ASSET_CATALOG } from '../src/assets/assetCatalog.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT_DIR = path.join(PUBLIC, 'assets/generated');
const PADDING = 2;
const MAX_WIDTH = 2048;

/** Backgrounds are huge and never batched with sprites; skip them. */
const SKIP_CATEGORIES = new Set(['background', 'reference']);

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const inputs = [];
  for (const entry of Object.values(ASSET_CATALOG)) {
    if (SKIP_CATEGORIES.has(entry.category)) continue;
    const abs = path.join(PUBLIC, entry.file);
    const exists = await fs.access(abs).then(() => true, () => false);
    if (!exists) {
      console.error(`missing source for ${entry.id}: ${entry.file}`);
      process.exitCode = 1;
      continue;
    }
    const buf = await fs.readFile(abs);
    const meta = await sharp(buf).metadata();
    inputs.push({
      id: entry.id,
      file: entry.file,
      buf,
      width: meta.width,
      height: meta.height,
      hash: crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12),
    });
  }

  // shelf packing, tallest first — good enough for a few dozen sprites
  inputs.sort((a, b) => b.height - a.height || b.width - a.width);

  let x = PADDING;
  let y = PADDING;
  let shelfHeight = 0;
  let sheetWidth = 0;
  const placed = [];

  for (const item of inputs) {
    if (x + item.width + PADDING > MAX_WIDTH) {
      x = PADDING;
      y += shelfHeight + PADDING;
      shelfHeight = 0;
    }
    placed.push({ ...item, x, y });
    x += item.width + PADDING;
    shelfHeight = Math.max(shelfHeight, item.height);
    sheetWidth = Math.max(sheetWidth, x);
  }
  const sheetHeight = y + shelfHeight + PADDING;

  await sharp({
    create: { width: sheetWidth, height: sheetHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(placed.map((p) => ({ input: p.buf, left: p.x, top: p.y })))
    .webp({ quality: 92, alphaQuality: 100, effort: 5 })
    .toFile(path.join(OUT_DIR, 'atlas.webp'));

  const manifest = {
    generatedBy: 'scripts/build-atlas.mjs',
    note: 'Generated artifact. Do not edit by hand — edit the source images and re-run `npm run assets:atlas`.',
    size: { w: sheetWidth, h: sheetHeight },
    sprites: Object.fromEntries(
      placed
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((p) => [p.id, { x: p.x, y: p.y, w: p.width, h: p.height, source: p.file, hash: p.hash }]),
    ),
  };
  await fs.writeFile(path.join(OUT_DIR, 'atlas.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const bytes = (await fs.stat(path.join(OUT_DIR, 'atlas.webp'))).size;
  console.log(`packed ${placed.length} sprites into ${sheetWidth}x${sheetHeight} (${(bytes / 1024).toFixed(1)} KB)`);
  console.log('wrote public/assets/generated/atlas.webp + atlas.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
