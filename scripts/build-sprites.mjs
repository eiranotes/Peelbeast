#!/usr/bin/env node
/**
 * Rasterise the authored SVG sprites into `public/assets/**`.
 *
 * Pipeline position:
 *   sprite-sources.mjs  →  assets/source/sprites/*.svg  →  public/assets/<cat>/*.png
 *                                                       →  build-atlas.mjs
 *
 * The SVG files are written out as well as rasterised, so the SVG on disk is the
 * editable source of record. If you hand-edit an SVG and re-run this script it is
 * used as-is unless `--regen` is passed (which overwrites SVGs from the generator).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SPRITES } from './sprite-sources.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'assets/source/sprites');
const OUT_DIR = path.join(ROOT, 'public/assets');
const REGEN = process.argv.includes('--regen');

async function main() {
  await fs.mkdir(SRC_DIR, { recursive: true });
  const results = [];

  for (const [id, spec] of Object.entries(SPRITES)) {
    const svgPath = path.join(SRC_DIR, `${spec.dir.replace(/\//g, '_')}__${spec.file}.svg`);
    let svg = spec.svg;

    const exists = await fs.access(svgPath).then(() => true, () => false);
    if (exists && !REGEN) {
      svg = await fs.readFile(svgPath, 'utf8');
    } else {
      await fs.writeFile(svgPath, spec.svg, 'utf8');
    }

    const outDir = path.join(OUT_DIR, spec.dir);
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, `${spec.file}.png`);

    await sharp(Buffer.from(svg), { density: 384 })
      .resize({ width: spec.width, fit: 'inside', withoutEnlargement: false })
      .png({ compressionLevel: 9, palette: false })
      .toFile(outPath);

    const meta = await sharp(outPath).metadata();
    results.push({ id, file: path.relative(OUT_DIR, outPath), size: `${meta.width}x${meta.height}` });
  }

  results.sort((a, b) => a.id.localeCompare(b.id));
  console.log(`built ${results.length} sprites into public/assets/`);
  for (const r of results) console.log(`  ${r.id.padEnd(30)} ${r.size.padEnd(11)} ${r.file}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
