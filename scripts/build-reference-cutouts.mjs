#!/usr/bin/env node
/**
 * Recover usable sprites from the v0.8 reference sheet.
 *
 * The uploaded art is a set of screenshots: every creature is a paper sticker
 * with a white kiss-cut outline, sitting on a painted desk scene. The sheet has
 * no alpha, so the v0.8 build pasted opaque rectangles onto the character
 * (docs/analysis/CURRENT_REPOSITORY_AUDIT.md §5.3).
 *
 * This script flood-fills the painted background inward from the image border
 * and keeps the largest surviving blob, which recovers a real alpha cutout.
 *
 * WHAT THIS DOES AND DOES NOT RECOVER
 * -----------------------------------
 * It works when the subject is well separated from its background:
 *   hero_full  →  a clean toast-cat sticker, shipped as `art.hero_card`
 *
 * It does NOT work for the three enemies. Their crops are ~175x230 half-resolution
 * screenshots in which the creature's own palette (grey rat on a grey-green wall,
 * beige tape roll on beige paper, black feathers on brown desk) overlaps the
 * background's, so any tolerance that removes the background also eats the
 * subject, and any tolerance that preserves the subject keeps wedges of wall.
 * Tolerances from 19 to 46 were swept; every result was either fragmented or had
 * background attached. Those enemies therefore ship as hand-authored sprites
 * drawn against the reference (see scripts/sprite-sources.mjs), and the original
 * crops remain visible in /dev/assets as the art target, and framed in-game as
 * collage photographs.
 *
 *   node scripts/build-reference-cutouts.mjs [--debug]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REF = path.join(ROOT, 'public/assets/references');
const OUT = path.join(ROOT, 'public/assets');
const DEBUG = process.argv.includes('--debug');

/**
 * Per-sprite extraction settings.
 *  crop  — sub-rectangle of the reference crop holding just this subject
 *  tol   — how far a pixel may differ from its border seed and still count as
 *          background (per-channel average of an L1 RGB distance)
 *  scale — output upscale; the sheet is half the resolution its table claimed
 */
const JOBS = [
  {
    id: 'art.hero_card',
    src: 'hero_full',
    out: 'bodies/hero_card_ref.png',
    crop: { left: 20, top: 8, width: 360, height: 388 },
    tol: 26, scale: 2,
  },
];


/** Flood-fill the background inward from the image border. */
function cutBackground(data, W, H, C, { tol }) {
  const bg = new Uint8Array(W * H);

  const seeds = [];
  const sx = Math.max(1, Math.floor(W / 60));
  const sy = Math.max(1, Math.floor(H / 60));
  for (let x = 0; x < W; x += sx) seeds.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y += sy) seeds.push([0, y], [W - 1, y]);

  const stack = [];
  for (const [seedX, seedY] of seeds) {
    const si = (seedY * W + seedX) * C;
    const r = data[si], g = data[si + 1], b = data[si + 2];
    stack.push(seedY * W + seedX);
    while (stack.length) {
      const p = stack.pop();
      if (bg[p]) continue;
      const i = p * C;
      if (Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b) > tol * 3) continue;
      bg[p] = 1;
      const x = p % W, y = (p / W) | 0;
      if (x + 1 < W) stack.push(p + 1);
      if (x > 0) stack.push(p - 1);
      if (y + 1 < H) stack.push(p + W);
      if (y > 0) stack.push(p - W);
    }
  }
  return bg;
}

/** Keep only the largest connected non-background blob. */
function keepLargestBlob(bg, W, H) {
  const label = new Int32Array(W * H).fill(-1);
  let best = -1, bestN = 0, cur = 0;
  for (let p0 = 0; p0 < W * H; p0++) {
    if (bg[p0] || label[p0] >= 0) continue;
    let n = 0;
    const st = [p0];
    label[p0] = cur;
    while (st.length) {
      const p = st.pop();
      n++;
      const x = p % W, y = (p / W) | 0;
      const nb = [x + 1 < W ? p + 1 : -1, x > 0 ? p - 1 : -1, y + 1 < H ? p + W : -1, y > 0 ? p - W : -1];
      for (const q of nb) if (q >= 0 && !bg[q] && label[q] < 0) { label[q] = cur; st.push(q); }
    }
    if (n > bestN) { bestN = n; best = cur; }
    cur++;
  }
  for (let p = 0; p < W * H; p++) if (label[p] !== best) bg[p] = 1;
  return bestN;
}

/** Soften the alpha edge by one pixel so the cutout does not look chewed. */
function featherAlpha(data, W, H, C) {
  const alpha = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) alpha[p] = data[p * C + 3];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (alpha[p] === 0) continue;
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          sum += alpha[ny * W + nx];
          n++;
        }
      }
      data[p * C + 3] = Math.round(sum / n);
    }
  }
}

async function run(job) {
  const src = path.join(REF, `${job.src}.png`);
  const base = sharp(src).extract(job.crop).ensureAlpha();
  const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  const bg = cutBackground(data, W, H, C, job);
  const kept = keepLargestBlob(bg, W, H);
  for (let p = 0; p < W * H; p++) if (bg[p]) data[p * C + 3] = 0;
  featherAlpha(data, W, H, C);

  const coverage = kept / (W * H);
  const png = await sharp(data, { raw: { width: W, height: H, channels: C } }).png().toBuffer();
  const outPath = path.join(OUT, job.out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await sharp(png)
    .trim({ threshold: 6 })
    .resize({ width: Math.round(W * job.scale), kernel: 'lanczos3' })
    .sharpen({ sigma: 0.6 })
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  return { id: job.id, out: job.out, size: `${meta.width}x${meta.height}`, coverage: `${(coverage * 100).toFixed(0)}%` };
}

const rows = [];
for (const job of JOBS) {
  try {
    rows.push(await run(job));
  } catch (e) {
    console.error(`${job.id}: ${e.message}`);
    process.exitCode = 1;
  }
}
console.table(rows);

if (DEBUG) {
  // contact sheet on magenta so leftover background is obvious
  const CELL = 320;
  const comps = [];
  for (let i = 0; i < rows.length; i++) {
    const buf = await sharp(path.join(OUT, rows[i].out))
      .resize(CELL - 16, CELL - 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    comps.push({ input: buf, left: i * CELL + 8, top: 8 });
  }
  await sharp({ create: { width: rows.length * CELL, height: CELL, channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } } })
    .composite(comps)
    .png()
    .toFile('/tmp/cutouts.png');
  console.log('debug sheet: /tmp/cutouts.png');
}
