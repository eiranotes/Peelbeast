/**
 * PEELBEAST sprite authoring.
 *
 * Running `npm run assets:sprites` writes every sprite here to a standalone SVG
 * in `assets/source/sprites/` and rasterises it into `public/assets/<category>/`.
 *
 * Silhouettes, palette and staging follow the v0.8 reference sheet
 * (see docs/10_REFERENCE_IMAGE_MAPPING.md). These are hand-authored PLACEHOLDER
 * production assets: they are real images with real alpha, sized and anchored for
 * the game, and every one of them can be swapped for final art by dropping a new
 * file in and editing `src/assets/assetCatalog.ts`.
 */

import { PALETTE as P, spriteDoc, flatDoc, paint, shade, circle, ellipse, line, tape } from './lib/paper.mjs';

/** helper: a limb drawn as ink stroke + fill stroke (cheap tapered tube) */
const limb = (d, fill = P.fur, w = 26) =>
  `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="${w + 7}" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

const stitch = (x1, y1, x2, y2, n = 5, color = P.inkSoft) => {
  let out = '';
  for (let i = 0; i < n; i++) {
    const t0 = i / n + 0.02, t1 = (i + 0.6) / n;
    out += line(x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0, x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1, { stroke: color, w: 3 });
  }
  return out;
};

// ─────────────────────────────────────────────────────────────────────────────
// BODY
// ─────────────────────────────────────────────────────────────────────────────

const bodyCat = () => {
  // Chunky front-facing stance from the reference card: wide planted feet, one
  // arm tucked, the other raised so the HAND slot part reads as "held".
  const torso = 'M112 258 C 104 322, 112 388, 138 416 C 168 448, 232 448, 262 416 C 288 388, 296 322, 288 258 C 278 196, 250 176, 200 176 C 150 176, 122 196, 112 258 Z';
  const belly = 'M158 268 C 146 320, 150 380, 172 412 C 192 430, 208 430, 228 412 C 250 380, 254 320, 242 268 C 222 246, 178 246, 158 268 Z';
  return spriteDoc({
    width: 400, height: 470, seed: 4, radius: 8, wobble: 6,
    body: `
    <!-- tail, behind everything and clearly clear of the tucked arm -->
    ${limb('M128 404 C 74 400, 40 358, 48 312 C 54 278, 84 268, 96 288', P.furDark, 22)}
    <!-- raised arm holding the HAND slot -->
    ${limb('M280 296 C 306 284, 324 268, 334 252', P.fur, 28)}
    <!-- tucked arm -->
    ${limb('M124 292 C 112 320, 112 344, 120 362', P.fur, 26)}
    <!-- torso -->
    ${paint(torso, P.fur, { w: 4 })}
    ${paint(belly, P.belly, { w: 3, stroke: P.inkSoft })}
    ${shade('M256 210 C 282 262, 286 372, 258 418 C 284 388, 296 322, 288 258 C 282 226, 272 208, 256 196 Z', '#2a3a4a', 0.2)}
    <!-- paws -->
    ${ellipse(342, 242, 27, 24, P.belly, { w: 3.5, rotate: -18 })}
    ${ellipse(114, 372, 25, 22, P.belly, { w: 3.5, rotate: 12 })}
    <!-- feet -->
    ${ellipse(158, 430, 40, 24, P.belly, { w: 3.5, rotate: -4 })}
    ${ellipse(244, 430, 40, 24, P.belly, { w: 3.5, rotate: 4 })}
    ${line(148, 420, 147, 438, { stroke: P.inkSoft, w: 2.4 })}
    ${line(160, 419, 160, 440, { stroke: P.inkSoft, w: 2.4 })}
    ${line(172, 420, 173, 438, { stroke: P.inkSoft, w: 2.4 })}
    ${line(232, 420, 231, 438, { stroke: P.inkSoft, w: 2.4 })}
    ${line(244, 419, 244, 440, { stroke: P.inkSoft, w: 2.4 })}
    ${line(256, 420, 257, 438, { stroke: P.inkSoft, w: 2.4 })}
    <!-- shoulders + neck stub: the HEAD slot mounts on top of this -->
    ${paint('M172 168 C 172 152, 228 152, 228 168 L 226 200 L 174 200 Z', P.furDark, { w: 3.5 })}
    ${shade('M174 160 L 226 160 L 226 178 L 174 178 Z', '#000', 0.16)}
  `,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// HEAD PARTS
// ─────────────────────────────────────────────────────────────────────────────

const toastHelm = () => {
  const slice = 'M28 96 C 28 52, 50 26, 84 22 C 96 6, 152 6, 164 22 C 198 26, 220 52, 220 96 L 220 182 C 220 202, 206 212, 184 212 L 64 212 C 42 212, 28 202, 28 182 Z';
  const inner = 'M50 100 C 50 66, 66 48, 92 44 C 102 32, 146 32, 156 44 C 182 48, 198 66, 198 100 L 198 178 C 198 190, 190 194, 176 194 L 72 194 C 58 194, 50 190, 50 178 Z';
  return spriteDoc({
    width: 248, height: 232, seed: 6, radius: 7, wobble: 5,
    body: `
    ${paint(slice, P.crust, { w: 4 })}
    ${paint(inner, P.bread, { w: 3, stroke: P.crustDark })}
    <!-- cat face painted on the toast -->
    ${paint('M74 104 C 74 92, 88 88, 96 96 C 104 88, 118 92, 118 104 C 118 118, 96 130, 96 130 C 96 130, 74 118, 74 104 Z', P.fur, { w: 0, stroke: 'none', opacity: 0.0 })}
    ${ellipse(96, 122, 26, 24, P.fur, { w: 0, stroke: 'none' })}
    ${ellipse(152, 122, 26, 24, P.fur, { w: 0, stroke: 'none' })}
    ${circle(96, 118, 9, P.ink, { stroke: 'none' })}
    ${circle(152, 118, 9, P.ink, { stroke: 'none' })}
    ${circle(99, 114, 3.2, '#fff', { stroke: 'none' })}
    ${circle(155, 114, 3.2, '#fff', { stroke: 'none' })}
    ${paint('M118 146 L 130 146 L 124 154 Z', P.red, { w: 2, stroke: P.redDark })}
    ${line(112, 160, 88, 154, { stroke: P.inkSoft, w: 2.6 })}
    ${line(112, 164, 90, 168, { stroke: P.inkSoft, w: 2.6 })}
    ${line(136, 160, 160, 154, { stroke: P.inkSoft, w: 2.6 })}
    ${line(136, 164, 158, 168, { stroke: P.inkSoft, w: 2.6 })}
    ${shade('M50 178 L 198 178 L 198 190 C 198 192, 190 194, 176 194 L 72 194 C 58 194, 50 190, 50 178 Z', '#8a6b3a', 0.18)}
  `,
  });
};

const boxShell = () => spriteDoc({
  width: 236, height: 224, seed: 9, radius: 7, wobble: 5,
  body: `
    ${paint('M32 84 L 118 44 L 204 84 L 204 186 L 118 214 L 32 186 Z', '#c39a68', { w: 4 })}
    ${paint('M32 84 L 118 118 L 204 84 L 118 44 Z', '#d9b382', { w: 3.5 })}
    ${paint('M118 118 L 204 84 L 204 186 L 118 214 Z', '#a87f52', { w: 3.5 })}
    <!-- open flaps -->
    ${paint('M32 84 L 76 62 L 118 82 L 74 104 Z', '#e0bd8d', { w: 3 })}
    ${paint('M204 84 L 160 62 L 118 82 L 162 104 Z', '#e0bd8d', { w: 3 })}
    ${tape(96, 96, 44, 78, 4)}
    ${line(46, 108, 46, 176, { stroke: P.crustDark, w: 2.4, opacity: 0.5 })}
    ${line(190, 108, 190, 176, { stroke: P.crustDark, w: 2.4, opacity: 0.5 })}
    ${stitch(40, 96, 110, 128, 4, P.crustDark)}
  `,
});

const ghostHood = () => spriteDoc({
  width: 212, height: 234, seed: 12, radius: 7, wobble: 7,
  body: `
    ${paint('M30 128 C 30 62, 74 22, 106 22 C 138 22, 182 62, 182 128 L 182 196 L 162 178 L 142 202 L 120 178 L 98 202 L 76 178 L 54 200 L 30 178 Z', P.white, { w: 4 })}
    ${circle(84, 116, 12, P.ink, { stroke: 'none' })}
    ${circle(130, 116, 12, P.ink, { stroke: 'none' })}
    ${ellipse(107, 152, 11, 14, P.ink, { stroke: 'none' })}
    ${shade('M148 60 C 176 88, 182 140, 182 196 L 162 178 L 148 196 Z', '#5b6a80', 0.16)}
    ${circle(64, 140, 8, P.red, { stroke: 'none', opacity: 0.28 })}
    ${circle(150, 140, 8, P.red, { stroke: 'none', opacity: 0.28 })}
  `,
});

// ─────────────────────────────────────────────────────────────────────────────
// HAND PARTS
// ─────────────────────────────────────────────────────────────────────────────

const scissors = () => spriteDoc({
  width: 246, height: 262, seed: 15, radius: 6, wobble: 4,
  body: `
    <!-- blades -->
    ${paint('M128 132 L 196 24 L 216 40 L 148 146 Z', P.metal, { w: 3.5 })}
    ${paint('M118 132 L 52 24 L 32 40 L 100 146 Z', P.metal, { w: 3.5 })}
    ${shade('M128 132 L 196 24 L 204 32 L 138 138 Z', '#fff', 0.4)}
    <!-- pivot -->
    ${circle(124, 146, 11, P.metalDark, { w: 3 })}
    ${circle(124, 146, 4, P.ink, { stroke: 'none' })}
    <!-- handles -->
    ${paint('M118 158 C 96 182, 78 190, 70 214 C 62 238, 88 250, 104 234 C 118 220, 118 190, 124 168 Z', P.red, { w: 4 })}
    ${paint('M130 158 C 152 182, 170 190, 178 214 C 186 238, 160 250, 144 234 C 130 220, 130 190, 124 168 Z', P.red, { w: 4 })}
    ${ellipse(88, 220, 15, 13, 'none', { w: 4, stroke: P.redDark, rotate: -20 })}
    ${ellipse(160, 220, 15, 13, 'none', { w: 4, stroke: P.redDark, rotate: 20 })}
    <!-- reference red ribbon knotted on the pivot -->
    ${paint('M124 154 C 108 168, 92 168, 86 182 C 100 186, 116 178, 124 168 Z', P.redDark, { w: 3 })}
    ${paint('M124 154 C 140 168, 156 168, 162 182 C 148 186, 132 178, 124 168 Z', P.redDark, { w: 3 })}
  `,
});

const pencilSpear = () => spriteDoc({
  width: 144, height: 312, seed: 18, radius: 6, wobble: 4,
  body: `
    ${paint('M60 42 L 84 42 L 90 262 L 54 262 Z', '#d9a94e', { w: 3.5 })}
    ${shade('M74 42 L 84 42 L 90 262 L 78 262 Z', '#000', 0.14)}
    <!-- sharpened tip -->
    ${paint('M60 42 L 72 6 L 84 42 Z', '#e8d2ac', { w: 3.5 })}
    ${paint('M66 20 L 72 6 L 78 20 Z', P.ink, { w: 2, stroke: P.ink })}
    <!-- lashing -->
    ${tape(48, 56, 48, 20, -3, '#cbbb90')}
    ${tape(46, 96, 52, 18, 4, '#cbbb90')}
    <!-- ferrule + eraser butt -->
    ${paint('M54 262 L 90 262 L 92 286 L 52 286 Z', P.metalDark, { w: 3 })}
    ${paint('M52 286 L 92 286 L 94 306 C 94 310, 50 310, 50 306 Z', '#e2857a', { w: 3 })}
    ${line(58, 268, 86, 268, { stroke: P.ink, w: 2, opacity: 0.5 })}
    ${line(58, 276, 86, 276, { stroke: P.ink, w: 2, opacity: 0.5 })}
  `,
});

const umbrellaHook = () => spriteDoc({
  width: 262, height: 274, seed: 21, radius: 7, wobble: 5,
  body: `
    ${paint('M22 132 C 22 60, 78 22, 130 22 C 182 22, 238 60, 238 132 C 214 116, 202 138, 178 138 C 154 138, 152 116, 130 116 C 108 116, 106 138, 82 138 C 58 138, 46 116, 22 132 Z', P.red, { w: 4 })}
    ${paint('M82 138 C 58 138, 46 116, 22 132 C 22 60, 78 22, 130 22 L 130 116 C 108 116, 106 138, 82 138 Z', P.blue, { w: 3.5 })}
    ${paint('M130 22 C 156 22, 178 32, 194 48 C 190 96, 186 124, 178 138 C 154 138, 152 116, 130 116 Z', P.paperLight, { w: 3.5, stroke: P.blueDark })}
    ${circle(130, 26, 8, P.gold, { w: 3 })}
    ${line(130, 34, 130, 214, { stroke: P.ink, w: 11 })}
    ${line(130, 34, 130, 214, { stroke: '#a8814d', w: 6 })}
    ${paint('M130 214 C 130 246, 96 254, 84 236 C 78 226, 88 216, 98 222', 'none', { w: 12, stroke: P.ink })}
    ${paint('M130 214 C 130 246, 96 254, 84 236 C 78 226, 88 216, 98 222', 'none', { w: 7, stroke: '#a8814d' })}
    ${circle(60, 78, 10, P.paperLight, { w: 2.5, stroke: P.redDark })}
  `,
});

// ─────────────────────────────────────────────────────────────────────────────
// CORE PARTS
// ─────────────────────────────────────────────────────────────────────────────

const bombBelly = () => spriteDoc({
  width: 214, height: 214, seed: 24, radius: 7, wobble: 5,
  body: `
    ${circle(104, 128, 72, P.black, { w: 4 })}
    ${shade('M62 74 A 72 72 0 0 1 150 96 A 60 60 0 0 0 62 74 Z', '#fff', 0.22)}
    ${circle(78, 100, 15, '#fff', { stroke: 'none', opacity: 0.18 })}
    ${paint('M92 60 L 122 60 L 118 40 L 96 40 Z', P.blackSoft, { w: 3.5 })}
    ${paint('M108 40 C 128 22, 150 30, 152 12', 'none', { w: 7, stroke: '#a88a5c' })}
    ${paint('M152 12 l 6 -6 l 4 8 l 8 -2 l -4 10 l 8 4 l -12 4 l 0 8 l -10 -6 l -8 6 l 0 -10 Z', P.gold, { w: 2.5, stroke: P.red })}
    ${tape(44, 116, 130, 26, -8)}
  `,
});

const coffeeCup = () => spriteDoc({
  width: 224, height: 194, seed: 27, radius: 7, wobble: 5,
  body: `
    ${paint('M40 52 L 156 52 L 144 158 C 142 172, 54 172, 52 158 Z', P.paperLight, { w: 4 })}
    ${paint('M156 70 C 196 66, 204 122, 158 128', 'none', { w: 13, stroke: P.ink })}
    ${paint('M156 70 C 192 68, 198 120, 158 124', 'none', { w: 8, stroke: P.paperLight })}
    ${ellipse(98, 54, 58, 14, '#5a3d24', { w: 3.5 })}
    ${ellipse(98, 54, 48, 9, '#7a5230', { stroke: 'none' })}
    ${ellipse(98, 116, 22, 24, '#6b4526', { w: 3 })}
    ${line(98, 96, 98, 136, { stroke: P.paperLight, w: 4 })}
    ${shade('M132 60 L 144 60 L 134 158 C 132 166, 118 168, 116 166 Z', '#000', 0.1)}
    <!-- steam -->
    ${paint('M74 34 C 84 22, 66 16, 76 4', 'none', { w: 4, stroke: '#c9b48c', opacity: 0.85 })}
    ${paint('M118 34 C 128 22, 110 16, 120 4', 'none', { w: 4, stroke: '#c9b48c', opacity: 0.85 })}
  `,
});

const tapeRoll = () => spriteDoc({
  width: 216, height: 202, seed: 30, radius: 7, wobble: 5,
  body: `
    ${ellipse(104, 104, 82, 78, '#e6d4a8', { w: 4 })}
    ${ellipse(104, 104, 34, 32, '#b79a68', { w: 4 })}
    ${ellipse(104, 104, 34, 32, '#8d7448', { w: 0, stroke: 'none', opacity: 0.5 })}
    ${paint('M104 26 A 78 78 0 0 1 178 92', 'none', { w: 6, stroke: '#fff', opacity: 0.45 })}
    ${shade('M104 182 A 78 78 0 0 0 182 104 A 84 84 0 0 1 104 182 Z', '#000', 0.14)}
    <!-- peeled tape tongue -->
    ${paint('M182 100 C 202 110, 208 140, 190 168 L 166 158 C 182 138, 178 118, 168 108 Z', '#f0e2bd', { w: 3, stroke: P.crustDark })}
    ${line(176, 116, 190, 152, { stroke: '#c8b184', w: 2.4 })}
  `,
});

// ─────────────────────────────────────────────────────────────────────────────
// TRINKET PARTS
// ─────────────────────────────────────────────────────────────────────────────

const ribbonKnot = () => spriteDoc({
  width: 234, height: 162, seed: 33, radius: 6, wobble: 5,
  body: `
    ${paint('M112 66 C 84 34, 34 30, 24 56 C 14 82, 48 100, 108 84 Z', P.red, { w: 4 })}
    ${paint('M122 66 C 150 34, 200 30, 210 56 C 220 82, 186 100, 126 84 Z', P.red, { w: 4 })}
    ${paint('M108 84 C 96 110, 78 130, 62 140 L 92 146 C 104 126, 112 106, 116 90 Z', P.redDark, { w: 3.5 })}
    ${paint('M126 84 C 138 110, 156 130, 172 140 L 142 146 C 130 126, 122 106, 118 90 Z', P.redDark, { w: 3.5 })}
    ${ellipse(117, 76, 18, 16, '#c96a4e', { w: 4 })}
    ${shade('M24 56 C 34 30, 84 34, 112 66 L 106 72 C 78 46, 38 44, 28 62 Z', '#fff', 0.3)}
  `,
});

const eyeSticker = () => spriteDoc({
  width: 172, height: 172, seed: 36, radius: 8, wobble: 6,
  body: `
    ${circle(86, 86, 66, P.paperLight, { w: 4 })}
    ${ellipse(86, 86, 54, 40, '#fff', { w: 3.5, stroke: P.inkSoft })}
    ${circle(92, 86, 26, P.blue, { w: 3.5 })}
    ${circle(92, 86, 12, P.ink, { stroke: 'none' })}
    ${circle(84, 78, 6, '#fff', { stroke: 'none' })}
    ${paint('M32 86 C 50 56, 122 56, 140 86', 'none', { w: 4, stroke: P.ink })}
    ${paint('M32 86 C 50 116, 122 116, 140 86', 'none', { w: 4, stroke: P.ink })}
    ${line(86, 20, 86, 6, { stroke: P.gold, w: 4 })}
    ${line(126, 34, 136, 24, { stroke: P.gold, w: 4 })}
    ${line(46, 34, 36, 24, { stroke: P.gold, w: 4 })}
  `,
});

const breadPatch = () => spriteDoc({
  width: 224, height: 156, seed: 39, radius: 7, wobble: 6,
  body: `
    ${paint('M20 62 C 20 34, 42 20, 66 22 C 84 6, 140 6, 158 22 C 186 20, 206 36, 204 64 L 200 116 C 198 136, 178 144, 150 142 L 66 140 C 38 138, 22 128, 20 108 Z', P.crust, { w: 4 })}
    ${paint('M40 66 C 40 46, 56 38, 74 40 C 88 28, 134 28, 148 40 C 170 38, 186 48, 184 66 L 180 110 C 178 124, 164 128, 144 126 L 70 124 C 50 122, 42 116, 42 104 Z', P.bread, { w: 3, stroke: P.crustDark })}
    ${circle(78, 74, 6, '#e0c98f', { stroke: 'none' })}
    ${circle(118, 92, 8, '#e0c98f', { stroke: 'none' })}
    ${circle(150, 68, 5, '#e0c98f', { stroke: 'none' })}
    ${stitch(30, 96, 196, 90, 8)}
    ${line(96, 34, 96, 128, { stroke: P.crustDark, w: 2.4, opacity: 0.35 })}
  `,
});

// ─────────────────────────────────────────────────────────────────────────────
// ENEMIES
// ─────────────────────────────────────────────────────────────────────────────

const pencilRat = () => spriteDoc({
  width: 330, height: 340, seed: 42, radius: 8, wobble: 6,
  body: `
    ${limb('M96 250 C 44 268, 22 226, 40 196 C 52 176, 78 180, 82 198', '#d9b7ae', 16)}
    ${paint('M84 148 C 84 96, 132 66, 176 66 C 220 66, 262 96, 262 148 C 262 214, 226 262, 172 262 C 118 262, 84 214, 84 148 Z', '#a8adaa', { w: 4 })}
    ${paint('M112 96 C 96 68, 108 46, 132 50 C 152 54, 156 78, 146 94 Z', '#c9b9b4', { w: 3.5 })}
    ${paint('M214 96 C 230 68, 218 46, 194 50 C 174 54, 170 78, 180 94 Z', '#c9b9b4', { w: 3.5 })}
    ${paint('M124 176 C 124 152, 152 138, 176 138 C 200 138, 226 152, 226 176 C 226 210, 202 230, 174 230 C 146 230, 124 210, 124 176 Z', '#cdd2ce', { w: 3.5 })}
    ${circle(146, 140, 11, P.ink, { stroke: 'none' })}
    ${circle(206, 140, 11, P.ink, { stroke: 'none' })}
    ${circle(150, 136, 3.6, '#fff', { stroke: 'none' })}
    ${circle(210, 136, 3.6, '#fff', { stroke: 'none' })}
    ${ellipse(176, 186, 12, 9, '#d2857e', { w: 3 })}
    ${line(164, 192, 128, 184, { stroke: P.inkSoft, w: 2.6 })}
    ${line(164, 198, 130, 206, { stroke: P.inkSoft, w: 2.6 })}
    ${line(188, 192, 224, 184, { stroke: P.inkSoft, w: 2.6 })}
    ${line(188, 198, 222, 206, { stroke: P.inkSoft, w: 2.6 })}
    ${paint('M166 198 L 160 226 L 172 226 Z', P.paperLight, { w: 2.5 })}
    ${paint('M186 198 L 192 226 L 180 226 Z', P.paperLight, { w: 2.5 })}
    <!-- stolen note clipped to its chest -->
    ${paint('M132 226 L 216 232 L 210 296 L 126 290 Z', P.paper, { w: 3.5 })}
    ${line(146, 248, 200, 252, { stroke: P.inkSoft, w: 3, opacity: 0.7 })}
    ${line(146, 264, 190, 268, { stroke: P.inkSoft, w: 3, opacity: 0.7 })}
    ${paint('M156 214 L 190 216 L 190 236 L 156 234 Z', P.blackSoft, { w: 3 })}
  `,
});

const tapeSpider = () => spriteDoc({
  width: 366, height: 300, seed: 45, radius: 8, wobble: 6,
  body: `
    ${limb('M118 176 C 76 176, 52 208, 40 246', P.metalDark, 12)}
    ${limb('M120 158 C 74 142, 44 152, 22 174', P.metalDark, 12)}
    ${limb('M248 176 C 290 176, 314 208, 326 246', P.metalDark, 12)}
    ${limb('M246 158 C 292 142, 322 152, 344 174', P.metalDark, 12)}
    ${limb('M150 200 C 138 236, 146 262, 164 280', P.metalDark, 12)}
    ${limb('M216 200 C 228 236, 220 262, 202 280', P.metalDark, 12)}
    ${ellipse(183, 152, 92, 84, '#e6d4a8', { w: 4 })}
    ${ellipse(183, 152, 36, 34, '#b79a68', { w: 4 })}
    ${ellipse(183, 152, 36, 34, '#8d7448', { stroke: 'none', opacity: 0.45 })}
    ${paint('M183 68 A 84 84 0 0 1 262 116', 'none', { w: 6, stroke: '#fff', opacity: 0.4 })}
    ${circle(148, 122, 13, P.paperLight, { w: 3 })}
    ${circle(218, 122, 13, P.paperLight, { w: 3 })}
    ${circle(148, 124, 6, P.ink, { stroke: 'none' })}
    ${circle(218, 124, 6, P.ink, { stroke: 'none' })}
    ${circle(130, 146, 7, P.paperLight, { w: 2.5 })}
    ${circle(236, 146, 7, P.paperLight, { w: 2.5 })}
    ${paint('M166 194 C 174 202, 192 202, 200 194', 'none', { w: 3.5, stroke: P.ink })}
    <!-- ink sacs -->
    ${circle(96, 232, 12, P.purple, { w: 3, opacity: 0.85 })}
    ${circle(272, 232, 12, P.purple, { w: 3, opacity: 0.85 })}
  `,
});

const scissorCrow = () => spriteDoc({
  width: 342, height: 322, seed: 48, radius: 8, wobble: 7,
  body: `
    ${paint('M56 168 C 20 130, 34 78, 76 84 C 60 46, 104 22, 130 52 C 150 22, 196 30, 196 68 C 232 60, 252 100, 224 128 Z', '#4a4d55', { w: 4 })}
    ${paint('M92 150 C 92 96, 140 66, 186 66 C 236 66, 272 106, 268 164 C 264 226, 220 268, 170 268 C 118 268, 92 214, 92 150 Z', '#3f434b', { w: 4 })}
    ${paint('M264 176 C 300 178, 322 214, 314 258 C 290 240, 268 236, 254 240 Z', '#33363d', { w: 3.5 })}
    ${paint('M104 196 C 76 208, 62 244, 74 278 C 96 254, 118 246, 132 248 Z', '#33363d', { w: 3.5 })}
    ${circle(146, 128, 15, P.paperLight, { w: 3.5 })}
    ${circle(212, 128, 15, P.paperLight, { w: 3.5 })}
    ${circle(148, 130, 7, P.ink, { stroke: 'none' })}
    ${circle(214, 130, 7, P.ink, { stroke: 'none' })}
    <!-- scissor beak -->
    ${paint('M180 158 L 262 132 L 268 148 L 186 174 Z', P.metal, { w: 3 })}
    ${paint('M180 168 L 260 194 L 254 210 L 174 182 Z', P.metal, { w: 3 })}
    ${circle(180, 170, 8, P.metalDark, { w: 3 })}
    ${ellipse(150, 176, 13, 11, 'none', { w: 4, stroke: P.red, rotate: -18 })}
    <!-- patched wound -->
    ${paint('M116 208 L 154 200 L 158 220 L 120 228 Z', P.paperLight, { w: 3, stroke: P.crustDark })}
    ${line(122, 206, 152, 222, { stroke: P.redDark, w: 3 })}
    ${line(152, 204, 124, 224, { stroke: P.redDark, w: 3 })}
    ${limb('M166 264 L 160 296', P.gold, 8)}
    ${limb('M198 264 L 204 296', P.gold, 8)}
    ${paint('M144 300 L 176 296 L 160 288 Z', P.gold, { w: 2.5 })}
    ${paint('M188 300 L 220 296 L 204 288 Z', P.gold, { w: 2.5 })}
  `,
});

const clipMoth = () => spriteDoc({
  width: 320, height: 262, seed: 51, radius: 8, wobble: 6,
  body: `
    ${paint('M152 128 C 108 60, 40 44, 20 78 C 2 110, 52 148, 146 148 Z', P.paper, { w: 4 })}
    ${paint('M168 128 C 212 60, 280 44, 300 78 C 318 110, 268 148, 174 148 Z', P.paper, { w: 4 })}
    ${paint('M148 148 C 96 158, 62 190, 76 216 C 92 240, 140 216, 152 172 Z', P.paperDark, { w: 3.5 })}
    ${paint('M172 148 C 224 158, 258 190, 244 216 C 228 240, 180 216, 168 172 Z', P.paperDark, { w: 3.5 })}
    ${circle(74, 92, 16, P.purple, { w: 3, opacity: 0.7 })}
    ${circle(246, 92, 16, P.purple, { w: 3, opacity: 0.7 })}
    ${ellipse(160, 152, 22, 62, P.metalDark, { w: 4 })}
    ${ellipse(160, 152, 11, 48, P.metal, { w: 0, stroke: 'none', opacity: 0.5 })}
    ${circle(148, 104, 10, P.ink, { stroke: 'none' })}
    ${circle(172, 104, 10, P.ink, { stroke: 'none' })}
    ${paint('M146 92 C 130 62, 112 50, 100 48', 'none', { w: 4, stroke: P.ink })}
    ${paint('M174 92 C 190 62, 208 50, 220 48', 'none', { w: 4, stroke: P.ink })}
    ${circle(100, 48, 6, P.ink, { stroke: 'none' })}
    ${circle(220, 48, 6, P.ink, { stroke: 'none' })}
  `,
});

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

const pencilCup = () => spriteDoc({
  width: 168, height: 288, seed: 54, radius: 6, wobble: 4,
  body: `
    ${paint('M56 78 L 70 60 L 82 84 L 78 168 L 62 168 Z', '#d9a94e', { w: 3 })}
    ${paint('M92 66 L 106 44 L 118 70 L 112 168 L 96 168 Z', P.blue, { w: 3 })}
    ${paint('M36 96 L 48 76 L 60 100 L 58 168 L 42 168 Z', P.green, { w: 3 })}
    ${paint('M26 160 L 142 160 L 132 264 C 130 274, 38 274, 36 264 Z', '#b98a56', { w: 4 })}
    ${ellipse(84, 160, 58, 16, '#cfa26a', { w: 3.5 })}
    ${shade('M112 166 L 132 164 L 124 264 C 122 270, 106 272, 104 270 Z', '#000', 0.14)}
  `,
});

const tornNote = () => spriteDoc({
  width: 236, height: 274, seed: 57, radius: 6, wobble: 8,
  body: `
    ${paint('M24 26 L 208 18 L 216 218 L 190 238 L 158 216 L 122 240 L 88 214 L 52 236 L 20 212 Z', P.paperLight, { w: 3.5 })}
    ${line(48, 74, 186, 70, { stroke: '#9fb0c4', w: 3, opacity: 0.7 })}
    ${line(48, 108, 186, 104, { stroke: '#9fb0c4', w: 3, opacity: 0.7 })}
    ${line(48, 142, 160, 138, { stroke: '#9fb0c4', w: 3, opacity: 0.7 })}
    ${line(48, 176, 174, 172, { stroke: '#9fb0c4', w: 3, opacity: 0.7 })}
    ${line(38, 30, 38, 220, { stroke: '#d2867a', w: 2.6, opacity: 0.8 })}
    ${paint('M132 40 C 152 24, 176 40, 158 56 C 148 66, 132 58, 132 40 Z', 'none', { w: 3, stroke: P.inkSoft, opacity: 0.5 })}
  `,
});

const clipPile = () => spriteDoc({
  width: 244, height: 156, seed: 60, radius: 6, wobble: 4,
  body: `
    ${paint('M30 96 C 30 60, 84 58, 84 92 L 84 118 C 84 132, 64 132, 64 118 L 64 78', 'none', { w: 9, stroke: P.metalDark })}
    ${paint('M104 112 C 104 70, 166 68, 166 108 L 166 132 C 166 144, 146 144, 146 132 L 146 92', 'none', { w: 9, stroke: '#a9b3bb' })}
    ${paint('M176 84 C 176 52, 224 50, 224 82 L 224 106 C 224 118, 206 118, 206 106 L 206 70', 'none', { w: 9, stroke: P.metalDark })}
    ${paint('M42 128 L 96 124', 'none', { w: 8, stroke: '#c3ccd2' })}
  `,
});

const tapeDispenser = () => spriteDoc({
  width: 256, height: 190, seed: 63, radius: 6, wobble: 4,
  body: `
    ${paint('M20 148 L 40 74 C 44 56, 200 56, 210 78 L 234 148 C 236 160, 20 160, 20 148 Z', P.green, { w: 4 })}
    ${ellipse(120, 100, 52, 48, '#e6d4a8', { w: 3.5 })}
    ${ellipse(120, 100, 20, 19, P.greenDark, { w: 3 })}
    ${paint('M228 130 L 250 138 L 244 152 L 222 146 Z', P.metalDark, { w: 3 })}
    ${shade('M180 70 L 210 78 L 234 148 L 200 150 Z', '#000', 0.14)}
  `,
});

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUNDS  (flat: no sticker backing)
// ─────────────────────────────────────────────────────────────────────────────

const deskBg = ({ paperFill = '#f3e7cb', deskA = '#966944', deskB = '#6d4a2e', line = '#b9c6d6', accent = P.green } = {}) => {
  let rules = '';
  for (let y = 210; y < 820; y += 46) {
    rules += `<line x1="200" y1="${y}" x2="1400" y2="${y}" stroke="${line}" stroke-width="2.5" opacity="0.5"/>`;
  }
  let rings = '';
  for (let x = 250; x < 1360; x += 96) {
    rings += `<circle cx="${x}" cy="152" r="11" fill="#c9b58c" stroke="${P.inkSoft}" stroke-width="2.5" opacity="0.9"/>`;
    rings += `<rect x="${x - 6}" y="118" width="12" height="40" rx="6" fill="#b9bfc4" stroke="${P.inkSoft}" stroke-width="2"/>`;
  }
  return flatDoc({
    width: 1600, height: 900,
    body: `
    <rect width="1600" height="900" fill="${deskB}"/>
    <rect width="1600" height="900" fill="url(#deskGrad)"/>
    <g opacity="0.16">
      ${Array.from({ length: 26 }, (_, i) => `<path d="M0 ${i * 36} Q 800 ${i * 36 + 12} 1600 ${i * 36}" stroke="${deskA}" stroke-width="6" fill="none"/>`).join('')}
    </g>
    <g transform="rotate(-1 800 500)">
      <rect x="176" y="104" width="1248" height="760" rx="18" fill="#00000022"/>
      <rect x="168" y="96" width="1248" height="760" rx="18" fill="${paperFill}" stroke="#d8c69f" stroke-width="4"/>
      ${rules}
      <line x1="286" y1="180" x2="286" y2="820" stroke="#d8917f" stroke-width="3" opacity="0.65"/>
      ${rings}
    </g>
    <g opacity="0.5">
      <path d="M60 820 Q 300 780 520 826" stroke="${accent}" stroke-width="10" fill="none" opacity="0.35"/>
    </g>
    <rect x="1300" y="60" width="150" height="46" rx="6" fill="${accent}" opacity="0.85" transform="rotate(9 1375 83)"/>
    <rect x="120" y="52" width="120" height="40" rx="5" fill="#e3d3ae" opacity="0.9" transform="rotate(-7 180 72)"/>
    <defs>
      <linearGradient id="deskGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${deskA}"/>
        <stop offset="100%" stop-color="${deskB}"/>
      </linearGradient>
    </defs>
  `,
  });
};

const nestBg = () => {
  const base = deskBg({ paperFill: '#e9d9b6', deskA: '#7d5136', deskB: '#4f3320', line: '#c3b092', accent: P.purple });
  // add tape webbing over the page for the boss arena
  const web = `
    <g opacity="0.5" stroke="#efe4c8" stroke-width="5" fill="none" stroke-linecap="round">
      <path d="M1420 120 C 1180 260, 1120 420, 1180 640"/>
      <path d="M1600 300 C 1360 340, 1240 470, 1250 700"/>
      <path d="M1440 130 C 1300 220, 1260 300, 1250 700" opacity="0.6"/>
      <path d="M1180 260 C 1280 300, 1380 300, 1560 280" opacity="0.6"/>
      <path d="M1140 440 C 1260 480, 1400 470, 1580 450" opacity="0.6"/>
      <path d="M180 140 C 300 220, 330 300, 300 420" opacity="0.5"/>
    </g>`;
  return base.replace('</svg>', `${web}\n</svg>`);
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS ICONS
// ─────────────────────────────────────────────────────────────────────────────

const chip = (inner, tint) => spriteDoc({
  width: 96, height: 96, seed: 66, radius: 5, wobble: 4, shadow: 0.22,
  body: `${paint('M12 20 C 12 12, 20 8, 30 9 L 70 8 C 82 8, 88 16, 88 26 L 87 70 C 87 82, 80 88, 68 88 L 26 87 C 16 87, 10 80, 10 70 Z', tint, { w: 3.5 })}${inner}`,
});

const statusIcons = {
  focus: chip(`${circle(49, 48, 21, 'none', { w: 5, stroke: P.ink })}${circle(49, 48, 8, P.red, { stroke: 'none' })}${line(49, 16, 49, 26, { stroke: P.ink, w: 4 })}${line(49, 70, 49, 80, { stroke: P.ink, w: 4 })}${line(17, 48, 27, 48, { stroke: P.ink, w: 4 })}${line(71, 48, 81, 48, { stroke: P.ink, w: 4 })}`, '#f6e2b8'),
  drift: chip(`${paint('M20 40 C 34 26, 50 54, 64 40 C 72 32, 78 36, 80 42', 'none', { w: 6, stroke: P.blue })}${paint('M20 62 C 34 48, 50 76, 64 62 C 72 54, 78 58, 80 64', 'none', { w: 6, stroke: P.blue, opacity: 0.55 })}`, '#dfe8f2'),
  bind: chip(`${paint('M28 30 L 70 66', 'none', { w: 7, stroke: '#8d7448' })}${paint('M70 30 L 28 66', 'none', { w: 7, stroke: '#8d7448' })}${circle(49, 48, 10, '#e6d4a8', { w: 3.5 })}`, '#ece0c2'),
  haste: chip(`${paint('M56 12 L 30 52 L 48 52 L 40 84 L 68 42 L 50 42 Z', P.gold, { w: 3.5 })}`, '#f7ecc6'),
  pinned: chip(`${paint('M40 14 L 58 14 L 54 46 L 66 58 L 34 58 L 44 46 Z', P.metal, { w: 3.5 })}${line(49, 58, 49, 84, { stroke: P.ink, w: 5 })}`, '#e5e8ea'),
  fragile: chip(`${paint('M28 16 L 70 16 L 62 46 L 70 82 L 28 82 L 36 46 Z', '#e6dcc4', { w: 3.5 })}${paint('M48 16 L 40 46 L 56 52 L 46 82', 'none', { w: 4, stroke: P.redDark })}`, '#f4dcd4'),
  frazzle: chip(`${paint('M18 68 C 26 40, 34 74, 42 34 C 50 70, 58 30, 66 66 C 72 46, 76 60, 82 52', 'none', { w: 5, stroke: P.purple })}`, '#ebe1f4'),
  ink: chip(`${paint('M49 12 C 70 44, 80 56, 80 66 C 80 80, 66 88, 49 88 C 32 88, 18 80, 18 66 C 18 56, 28 44, 49 12 Z', P.purple, { w: 3.5 })}${circle(38, 62, 7, '#fff', { stroke: 'none', opacity: 0.4 })}`, '#e2d9ef'),
  block: chip(`${paint('M49 12 L 82 26 L 82 54 C 82 74, 66 84, 49 88 C 32 84, 16 74, 16 54 L 16 26 Z', P.blue, { w: 3.5 })}${paint('M34 50 L 45 62 L 66 36', 'none', { w: 6, stroke: '#fff' })}`, '#dce6f2'),
  glue: chip(`${paint('M36 12 L 62 12 L 60 30 L 72 48 L 72 82 C 72 86, 26 86, 26 82 L 26 48 L 38 30 Z', '#e8dcb4', { w: 3.5 })}${paint('M32 56 L 66 56 L 66 82 C 66 84, 32 84, 32 82 Z', P.green, { w: 3 })}`, '#e7efdc'),
  peel: chip(`${paint('M20 22 L 62 18 L 66 60 L 24 64 Z', P.paperLight, { w: 3.5 })}${paint('M62 18 C 78 34, 84 52, 76 74 C 70 60, 62 52, 52 50 Z', '#e4d6b4', { w: 3.5 })}`, '#f3e6d0'),
};

// ─────────────────────────────────────────────────────────────────────────────
// EFFECTS
// ─────────────────────────────────────────────────────────────────────────────

const effects = {
  scrap: spriteDoc({ width: 92, height: 76, seed: 69, radius: 4, wobble: 6, shadow: 0.2, body: paint('M8 22 L 44 8 L 84 20 L 72 62 L 30 68 Z', P.paperLight, { w: 3 }) }),
  slash: flatDoc({ width: 320, height: 200, body: `${paint('M14 172 C 96 128, 200 66, 306 20 L 288 62 C 190 108, 100 152, 30 190 Z', P.red, { w: 4, stroke: P.redDark })}${paint('M44 164 C 122 124, 208 80, 292 44', 'none', { w: 7, stroke: '#ffe9d8', opacity: 0.8 })}` }),
  spark: flatDoc({ width: 180, height: 180, body: `${paint('M90 6 L 106 68 L 174 90 L 106 112 L 90 174 L 74 112 L 6 90 L 74 68 Z', P.gold, { w: 0, stroke: 'none' })}${circle(90, 90, 22, '#fff8e0', { stroke: 'none', opacity: 0.9 })}` }),
  impact: flatDoc({ width: 220, height: 220, body: `${paint('M110 8 L 132 74 L 200 44 L 158 104 L 214 138 L 146 142 L 158 210 L 108 160 L 62 208 L 72 140 L 6 146 L 60 104 L 18 46 L 86 74 Z', '#fff3d4', { w: 5, stroke: P.red })}` }),
  patch: spriteDoc({ width: 160, height: 100, seed: 72, radius: 5, wobble: 5, shadow: 0.22, body: `${paint('M8 26 L 150 12 L 154 74 L 12 88 Z', '#e9dcbb', { w: 3 })}${stitch(20, 50, 142, 42, 7)}` }),
};

// ─────────────────────────────────────────────────────────────────────────────
// UI DECORATION
// ─────────────────────────────────────────────────────────────────────────────

const ui = {
  clip: spriteDoc({ width: 120, height: 190, seed: 75, radius: 4, wobble: 3, shadow: 0.28, body: `${paint('M32 172 L 32 56 C 32 24, 88 24, 88 56 L 88 150 C 88 168, 58 168, 58 150 L 58 66', 'none', { w: 12, stroke: P.metalDark })}${paint('M32 172 L 32 56 C 32 24, 88 24, 88 56 L 88 150 C 88 168, 58 168, 58 150 L 58 66', 'none', { w: 5, stroke: '#dfe5e9' })}` }),
  tapeStrip: spriteDoc({ width: 240, height: 90, seed: 78, radius: 4, wobble: 6, shadow: 0.18, body: `${paint('M8 22 L 232 12 L 236 70 L 12 80 Z', '#efe2c0', { w: 2, stroke: '#cbb98f' })}${line(20, 30, 20, 72, { stroke: '#d8c69f', w: 3 })}${line(220, 20, 220, 62, { stroke: '#d8c69f', w: 3 })}` }),
  tag: spriteDoc({ width: 260, height: 130, seed: 81, radius: 5, wobble: 5, shadow: 0.24, body: `${paint('M14 40 L 66 10 L 246 16 L 240 116 L 60 120 Z', '#e8d9b4', { w: 3.5 })}${circle(50, 44, 10, P.paperLight, { w: 3 })}` }),
};

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDERS — deliberately obvious "art missing" markers
// ─────────────────────────────────────────────────────────────────────────────

const placeholder = (label, w = 200, h = 200) => spriteDoc({
  width: w, height: h, seed: 84, radius: 6, wobble: 7, shadow: 0.22,
  body: `
    ${paint(`M10 26 L ${w - 22} 12 L ${w - 10} ${h - 24} L 22 ${h - 10} Z`, '#e9dcbb', { w: 3.5, stroke: P.inkSoft })}
    ${line(24, 34, w - 26, h - 34, { stroke: P.crustDark, w: 3, opacity: 0.45 })}
    ${line(w - 26, 34, 24, h - 34, { stroke: P.crustDark, w: 3, opacity: 0.45 })}
    <text x="${w / 2}" y="${h / 2 + 8}" font-family="monospace" font-size="${Math.round(w / 9)}" font-weight="bold" text-anchor="middle" fill="${P.inkSoft}">${label}</text>
  `,
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY — id → { category, svg, raster width }
// ─────────────────────────────────────────────────────────────────────────────

export const SPRITES = {
  // bodies
  'body.cat': { dir: 'bodies', file: 'cat', svg: bodyCat(), width: 800 },

  // head
  'part.head.toast_helm': { dir: 'parts/head', file: 'toast_helm', svg: toastHelm(), width: 496 },
  'part.head.box_shell': { dir: 'parts/head', file: 'box_shell', svg: boxShell(), width: 472 },
  'part.head.ghost_hood': { dir: 'parts/head', file: 'ghost_hood', svg: ghostHood(), width: 424 },

  // hand
  'part.hand.scissors': { dir: 'parts/hand', file: 'scissors', svg: scissors(), width: 492 },
  'part.hand.pencil_spear': { dir: 'parts/hand', file: 'pencil_spear', svg: pencilSpear(), width: 288 },
  'part.hand.umbrella_hook': { dir: 'parts/hand', file: 'umbrella_hook', svg: umbrellaHook(), width: 524 },

  // core
  'part.core.bomb_belly': { dir: 'parts/core', file: 'bomb_belly', svg: bombBelly(), width: 428 },
  'part.core.coffee_cup': { dir: 'parts/core', file: 'coffee_cup', svg: coffeeCup(), width: 448 },
  'part.core.tape_roll': { dir: 'parts/core', file: 'tape_roll', svg: tapeRoll(), width: 432 },

  // trinket
  'part.trinket.ribbon_knot': { dir: 'parts/trinket', file: 'ribbon_knot', svg: ribbonKnot(), width: 468 },
  'part.trinket.eye_sticker': { dir: 'parts/trinket', file: 'eye_sticker', svg: eyeSticker(), width: 344 },
  'part.trinket.bread_patch': { dir: 'parts/trinket', file: 'bread_patch', svg: breadPatch(), width: 448 },

  // enemies
  'enemy.pencil_rat': { dir: 'enemies', file: 'pencil_rat', svg: pencilRat(), width: 660 },
  'enemy.tape_spider': { dir: 'enemies', file: 'tape_spider', svg: tapeSpider(), width: 732 },
  'enemy.scissor_crow': { dir: 'enemies', file: 'scissor_crow', svg: scissorCrow(), width: 684 },
  'enemy.clip_moth': { dir: 'enemies', file: 'clip_moth', svg: clipMoth(), width: 640 },

  // props
  'prop.pencil_cup': { dir: 'props', file: 'pencil_cup', svg: pencilCup(), width: 336 },
  'prop.torn_note': { dir: 'props', file: 'torn_note', svg: tornNote(), width: 472 },
  'prop.clip_pile': { dir: 'props', file: 'clip_pile', svg: clipPile(), width: 488 },
  'prop.tape_dispenser': { dir: 'props', file: 'tape_dispenser', svg: tapeDispenser(), width: 512 },

  // backgrounds
  'bg.desk': { dir: 'backgrounds', file: 'desk', svg: deskBg(), width: 1600 },
  'bg.nest': { dir: 'backgrounds', file: 'nest', svg: nestBg(), width: 1600 },

  // ui
  'ui.clip': { dir: 'ui', file: 'clip', svg: ui.clip, width: 240 },
  'ui.tape_strip': { dir: 'ui', file: 'tape_strip', svg: ui.tapeStrip, width: 480 },
  'ui.tag': { dir: 'ui', file: 'tag', svg: ui.tag, width: 520 },

  // status icons
  ...Object.fromEntries(
    Object.entries(statusIcons).map(([k, svg]) => [`icon.status.${k}`, { dir: 'ui', file: `status_${k}`, svg, width: 192 }]),
  ),

  // effects
  ...Object.fromEntries(
    Object.entries(effects).map(([k, svg]) => [`fx.${k}`, { dir: 'effects', file: k, svg, width: k === 'scrap' ? 184 : 360 }]),
  ),

  // placeholders
  'ph.head': { dir: 'placeholders', file: 'head', svg: placeholder('HEAD', 240, 220), width: 480 },
  'ph.hand': { dir: 'placeholders', file: 'hand', svg: placeholder('HAND', 220, 260), width: 440 },
  'ph.core': { dir: 'placeholders', file: 'core', svg: placeholder('CORE', 210, 200), width: 420 },
  'ph.trinket': { dir: 'placeholders', file: 'trinket', svg: placeholder('TRINKET', 230, 150), width: 460 },
  'ph.body': { dir: 'placeholders', file: 'body', svg: placeholder('BODY', 400, 470), width: 800 },
  'ph.enemy': { dir: 'placeholders', file: 'enemy', svg: placeholder('ENEMY', 320, 320), width: 640 },
  'ph.generic': { dir: 'placeholders', file: 'generic', svg: placeholder('MISSING', 200, 200), width: 400 },
};
