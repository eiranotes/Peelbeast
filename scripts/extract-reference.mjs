#!/usr/bin/env node
/**
 * Slice the legacy v0.8 atlas into individual reference crops.
 *
 * The v0.8 build shipped a single `assets/atlas.webp` whose coordinate table
 * lived inline in `index.html`. That table declared a 2048x2999 coordinate space
 * while the shipped file is 1024x1500, and roughly a third of the regions point
 * at empty parts of the sheet (see docs/analysis/CURRENT_REPOSITORY_AUDIT.md §5).
 *
 * These crops are NOT game assets. They are the art direction reference that the
 * hand-authored sprites in `sprite-sources.mjs` are drawn against, and they are
 * shown side-by-side with the live asset in the /dev/assets screen.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ATLAS = path.join(ROOT, 'assets/source/reference/legacy-atlas-v0.8.webp');
const OUT = path.join(ROOT, 'public/assets/references');

/** Coordinate table lifted verbatim from the v0.8 `index.html` inline literal. */
const DECLARED = { w: 2048, h: 2999 };
const REGIONS = {
  stage_bg_base: { x: 0, y: 0, w: 1152, h: 1180 },
  hero_full: { x: 1156, y: 0, w: 790, h: 800 },
  prop_tornpaper_right: { x: 0, y: 1184, w: 254, h: 566 },
  part_umbrella: { x: 258, y: 1184, w: 425, h: 535 },
  part_spear: { x: 687, y: 1184, w: 245, h: 510 },
  prop_hold_card: { x: 936, y: 1184, w: 380, h: 510 },
  part_scissors: { x: 1320, y: 1184, w: 410, h: 480 },
  enemy_pencil_rat: { x: 0, y: 1754, w: 350, h: 460 },
  enemy_tape_spider: { x: 354, y: 1754, w: 415, h: 445 },
  prop_pencilcup_left: { x: 773, y: 1754, w: 125, h: 410 },
  enemy_scissor_crow: { x: 902, y: 1754, w: 377, h: 380 },
  icon_bomb: { x: 1283, y: 1754, w: 340, h: 360 },
  part_bomb: { x: 1627, y: 1754, w: 340, h: 360 },
  icon_toast: { x: 0, y: 2218, w: 430, h: 350 },
  part_toast: { x: 434, y: 2218, w: 430, h: 350 },
  icon_box_shell: { x: 868, y: 2218, w: 226, h: 280 },
  icon_eye_sticker: { x: 1098, y: 2218, w: 182, h: 280 },
  icon_spear: { x: 1284, y: 2218, w: 206, h: 280 },
  icon_tape_roll: { x: 1494, y: 2218, w: 199, h: 280 },
  part_coffee: { x: 1697, y: 2218, w: 265, h: 250 },
  icon_mug: { x: 0, y: 2572, w: 235, h: 245 },
  icon_patch: { x: 239, y: 2572, w: 250, h: 245 },
  icon_umbrella: { x: 493, y: 2572, w: 225, h: 245 },
  part_box_shell: { x: 722, y: 2572, w: 210, h: 230 },
  part_ribbon: { x: 936, y: 2572, w: 265, h: 200 },
  icon_ghost: { x: 1205, y: 2572, w: 184, h: 190 },
  icon_ribbon_red: { x: 1393, y: 2572, w: 186, h: 190 },
  icon_scissors_red: { x: 1583, y: 2572, w: 195, h: 190 },
  part_eye_sticker: { x: 1782, y: 2572, w: 173, h: 183 },
  part_ghost_charm: { x: 0, y: 2821, w: 178, h: 178 },
  part_patchbread: { x: 182, y: 2821, w: 275, h: 175 },
  part_tape_roll: { x: 461, y: 2821, w: 175, h: 175 },
};

/** Mean luma + share of near-black pixels, used to flag dead atlas regions. */
async function inspect(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  let dark = 0, sum = 0;
  const n = info.width * info.height;
  for (let i = 0; i < data.length; i += info.channels) {
    const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
    sum += l;
    if (l < 18) dark++;
  }
  return { meanLuma: +(sum / n).toFixed(1), darkRatio: +(dark / n).toFixed(3) };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const meta = await sharp(ATLAS).metadata();
  const sx = meta.width / DECLARED.w;
  const sy = meta.height / DECLARED.h;

  const report = {
    atlas: { file: path.relative(ROOT, ATLAS), actual: `${meta.width}x${meta.height}`, declared: `${DECLARED.w}x${DECLARED.h}`, hasAlpha: !!meta.hasAlpha },
    regions: {},
  };

  for (const [name, r] of Object.entries(REGIONS)) {
    const left = Math.round(r.x * sx);
    const top = Math.round(r.y * sy);
    const width = Math.min(Math.round(r.w * sx), meta.width - left);
    const height = Math.min(Math.round(r.h * sy), meta.height - top);
    const out = path.join(OUT, `${name}.png`);
    await sharp(ATLAS).extract({ left, top, width, height }).png({ compressionLevel: 9 }).toFile(out);
    const stats = await inspect(out);
    report.regions[name] = {
      file: `references/${name}.png`,
      declared: `${r.w}x${r.h}`,
      extracted: `${width}x${height}`,
      ...stats,
      verdict: stats.darkRatio > 0.85 ? 'empty' : stats.darkRatio > 0.25 ? 'partial' : 'ok',
    };
  }

  await fs.writeFile(path.join(ROOT, 'assets/source/reference/legacy-atlas-report.json'), JSON.stringify(report, null, 2));

  const bad = Object.entries(report.regions).filter(([, v]) => v.verdict !== 'ok');
  console.log(`extracted ${Object.keys(REGIONS).length} reference crops to public/assets/references/`);
  console.log(`atlas actual ${report.atlas.actual}, declared ${report.atlas.declared}, alpha=${report.atlas.hasAlpha}`);
  console.log(`${bad.length} regions empty/partial: ${bad.map(([k]) => k).join(', ')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
