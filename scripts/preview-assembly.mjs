#!/usr/bin/env node
/**
 * Composite body + parts using the REAL catalog anchors, so anchoring can be
 * checked without launching a browser. Writes a contact sheet of several builds.
 *
 *   node scripts/preview-assembly.mjs [out.png]
 *
 * This is the same maths as `computePartLayout` in src/assets/assetLoader.ts.
 * Keeping a headless preview means anchor regressions show up in one command.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ASSET_CATALOG } from '../src/assets/assetCatalog.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT = process.argv[2] ?? path.join(ROOT, 'docs/screenshots/assembly-preview.png');

const SLOTS = ['core', 'head', 'trinket', 'hand'];

async function renderBuild(build, bodyWidth) {
  const body = ASSET_CATALOG['body.cat'];
  const bodyHeight = Math.round(bodyWidth * (body.height / body.width));
  const pad = Math.round(bodyWidth * 0.5);
  const W = bodyWidth + pad * 2;
  const H = bodyHeight + pad;

  const layers = [
    {
      input: await sharp(path.join(PUBLIC, body.file)).resize(bodyWidth, bodyHeight).png().toBuffer(),
      left: pad,
      top: 0,
      z: body.zIndex,
    },
  ];

  for (const slot of SLOTS) {
    const id = build[slot];
    if (!id) continue;
    const part = ASSET_CATALOG[id];
    if (!part) throw new Error(`unknown asset ${id}`);
    const attach = body.attach[slot];
    const width = Math.max(1, Math.round(bodyWidth * part.scale));
    const height = Math.max(1, Math.round(width * (part.height / part.width)));
    const left = Math.round(attach.x * bodyWidth - part.anchorX * width);
    const top = Math.round(attach.y * bodyHeight - part.anchorY * height);

    let img = sharp(path.join(PUBLIC, part.file)).resize(width, height);
    if (part.rotation) {
      img = img.rotate(part.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
    }
    const buf = await img.png().toBuffer();
    const meta = await sharp(buf).metadata();
    // sharp rotates about the centre and grows the canvas; re-centre the result
    const dx = Math.round((meta.width - width) / 2);
    const dy = Math.round((meta.height - height) / 2);
    layers.push({ input: buf, left: pad + left - dx, top: top - dy, z: part.zIndex });
  }

  layers.sort((a, b) => a.z - b.z);
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers.map(({ input, left, top }) => ({ input, left, top })))
    .png()
    .toBuffer();
}

const BUILDS = [
  { head: 'part.head.toast_helm', hand: 'part.hand.scissors', core: 'part.core.bomb_belly', trinket: 'part.trinket.ribbon_knot' },
  { head: 'part.head.box_shell', hand: 'part.hand.umbrella_hook', core: 'part.core.tape_roll', trinket: 'part.trinket.bread_patch' },
  { head: 'part.head.ghost_hood', hand: 'part.hand.pencil_spear', core: 'part.core.coffee_cup', trinket: 'part.trinket.eye_sticker' },
  { head: 'part.head.toast_helm', core: 'part.core.coffee_cup' }, // hand + trinket peeled
  {}, // bare body
];

const W = 420;
const tiles = await Promise.all(BUILDS.map((b) => renderBuild(b, W)));
const meta = await sharp(tiles[0]).metadata();
const cols = tiles.length;
const sheet = sharp({
  create: { width: meta.width * cols, height: meta.height, channels: 4, background: { r: 152, g: 112, b: 76, alpha: 1 } },
}).composite(tiles.map((input, i) => ({ input, left: i * meta.width, top: 0 })));

await sheet.png().toFile(OUT);
console.log(`wrote ${path.relative(ROOT, OUT)} (${cols} builds, body width ${W}px)`);
