#!/usr/bin/env node
/**
 * Catalog ↔ disk validation.
 *
 * Checks that every `file` and `fallbackFile` exists, that declared width/height
 * match the real image, and reports files on disk that no catalog entry claims.
 * Run it after replacing art; it is the fastest way to catch a typo'd path.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ASSET_CATALOG } from '../src/assets/assetCatalog.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

const errors = [];
const warnings = [];

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const claimed = new Set();

for (const [id, entry] of Object.entries(ASSET_CATALOG)) {
  for (const key of ['file', 'fallbackFile', 'referenceFile']) {
    const rel = entry[key];
    if (!rel) continue;
    const abs = path.join(PUBLIC, rel);
    claimed.add(path.relative(PUBLIC, abs));
    const exists = await fs.access(abs).then(() => true, () => false);
    if (!exists) {
      const level = key === 'file' ? errors : warnings;
      level.push(`${id}: ${key} "${rel}" does not exist`);
      continue;
    }
    if (key === 'file' && entry.category !== 'reference') {
      const meta = await sharp(abs).metadata();
      if (meta.width !== entry.width || meta.height !== entry.height) {
        errors.push(`${id}: declared ${entry.width}x${entry.height} but file is ${meta.width}x${meta.height}`);
      }
      if (!meta.hasAlpha && entry.category !== 'background') {
        warnings.push(`${id}: image has no alpha channel; it will render as an opaque rectangle`);
      }
    }
  }
  if (entry.category !== 'placeholder' && entry.category !== 'reference' && !entry.fallbackFile) {
    warnings.push(`${id}: no fallbackFile declared`);
  }
}

const onDisk = (await walk(path.join(PUBLIC, 'assets')))
  .map((p) => path.relative(PUBLIC, p))
  .filter((p) => /\.(png|webp|jpg|jpeg|avif)$/i.test(p));

for (const file of onDisk) {
  if (!claimed.has(file) && !file.includes('generated')) {
    warnings.push(`orphan: ${file} is on disk but not referenced by any catalog entry`);
  }
}

console.log(`catalog entries: ${Object.keys(ASSET_CATALOG).length}`);
console.log(`files on disk:   ${onDisk.length}`);
for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);

if (errors.length) {
  console.error(`\n${errors.length} error(s)`);
  process.exit(1);
}
console.log(`\nok — ${warnings.length} warning(s)`);
