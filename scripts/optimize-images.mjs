// Generates responsive WebP versions of everything in public/uploads into public/_img.
// Runs automatically before `npm run dev` and `npm run build`. Already-generated files are skipped.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const WIDTHS = [480, 960, 1600, 2400];
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = path.join(root, 'public/uploads');
const out = path.join(root, 'public/_img');

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(jpe?g|png|webp|avif)$/i.test(e.name)) yield p;
  }
}

let made = 0;
for await (const file of walk(src)) {
  const rel = path.relative(src, file).replace(/\.[^.]+$/, '');
  const srcStat = await fs.stat(file);
  for (const w of WIDTHS) {
    const dest = path.join(out, `${rel}-${w}.webp`);
    try { if ((await fs.stat(dest)).mtimeMs >= srcStat.mtimeMs) continue; } catch {}
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await sharp(file).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(dest);
    made++;
  }
}
console.log(`[images] ${made} responsive image(s) generated`);
