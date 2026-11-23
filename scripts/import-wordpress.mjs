// One-time import of news posts + images from the old WordPress site.
// Usage: node scripts/import-wordpress.mjs <saved-html-dir>
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import TurndownService from 'turndown';

const SRC = 'https://lchdevelopments.com';
const htmlDir = process.argv[2];
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const uploads = path.join(root, 'public/uploads');
const newsDir = path.join(root, 'src/content/news');
await fs.mkdir(uploads, { recursive: true });
await fs.mkdir(newsDir, { recursive: true });

export function localName(url) {
  let base = decodeURIComponent(url.split('?')[0].split('/').pop());
  let ext = path.extname(base).toLowerCase();
  let stem = base.slice(0, -ext.length)
    .replace(/-e\d{10,}$/,'').replace(/-scaled$/,'').replace(/-\d+x\d+$/,'')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return stem + (ext === '.png' ? '.png' : '.jpg');
}

const done = new Map();
async function getImage(url) {
  if (url.startsWith('//')) url = 'https:' + url;
  const name = localName(url);
  if (done.has(name)) return done.get(name);
  const out = path.join(uploads, name);
  const pub = '/uploads/' + name;
  done.set(name, pub);
  try { await fs.access(out); return pub; } catch {}
  const res = await fetch(url);
  if (!res.ok) { console.warn('skip', res.status, url); done.set(name, null); return null; }
  const buf = Buffer.from(await res.arrayBuffer());
  let img = sharp(buf).rotate().resize({ width: 2400, withoutEnlargement: true });
  img = name.endsWith('.png') ? img.png({ compressionLevel: 9, palette: true, quality: 85 }) : img.jpeg({ quality: 80, mozjpeg: true });
  await fs.writeFile(out, await img.toBuffer());
  return pub;
}

// 1) every image referenced on the saved pages
const urls = new Set();
for (const f of await fs.readdir(htmlDir)) {
  if (!f.endsWith('.html')) continue;
  const s = await fs.readFile(path.join(htmlDir, f), 'utf8');
  for (const m of s.matchAll(/https:\/\/lchdevelopments\.com\/wp-content\/uploads\/[^"')\s]+\.(?:jpe?g|png)/gi)) urls.add(m[0]);
}
// skip WordPress's auto-generated thumbnail sizes when the original is also present
for (const u of [...urls]) if (/-\d+x\d+\.(png|jpe?g)$/i.test(u)) urls.delete(u);
let n = 0;
for (const u of urls) { await getImage(u); n++; }
console.log('page images:', n);

// 2) news posts
const cats = Object.fromEntries((await (await fetch(`${SRC}/wp-json/wp/v2/categories?per_page=100`)).json()).map(c => [c.id, c.name]));
const posts = await (await fetch(`${SRC}/wp-json/wp/v2/posts?per_page=100&_embed=1`)).json();
const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
const decode = s => s.replace(/&#8211;/g,'–').replace(/&#8217;/g,'’').replace(/&#8216;/g,'‘').replace(/&#8220;/g,'“').replace(/&#8221;/g,'”').replace(/&#038;|&amp;/g,'&').replace(/&nbsp;| /g,' ').replace(/<[^>]+>/g,'').replace(/\[&hellip;\]|&hellip;/g,'…').trim();
const q = s => JSON.stringify(s);
for (const p of posts) {
  let html = p.content.rendered;
  for (const m of [...html.matchAll(/https:\/\/lchdevelopments\.com\/wp-content\/uploads\/[^"'\s)]+\.(?:jpe?g|png)/gi)]) {
    const local = await getImage(m[0].replace(/-\d+x\d+(\.\w+)$/, '$1'));
    if (local) html = html.split(m[0]).join(local);
  }
  html = html.replace(/\s(srcset|sizes)="[^"]*"/g, '');
  const body = td.turndown(html).trim();
  const fm = p._embedded?.['wp:featuredmedia']?.[0]?.source_url;
  const image = fm ? await getImage(fm) : null;
  const ext = [...p.content.rendered.matchAll(/href="(https?:\/\/(?!lchdevelopments)[^"]+)"[^>]*>\s*(?:Read More|Read more|View Article|Read the full)/gi)].map(m=>m[1]).pop();
  const category = (p.categories.map(c => cats[c]).filter(c => c && c !== 'Blog')[0]) || 'Other';
  const lines = ['---',
    `title: ${q(decode(p.title.rendered))}`,
    `date: ${p.date.slice(0,10)}`,
    `category: ${q(category)}`,
    image ? `image: ${q(image)}` : null,
    `excerpt: ${q(decode(p.excerpt.rendered).replace(/\s*Read More\s*…?$/i,'').slice(0, 220))}`,
    ext ? `sourceUrl: ${q(ext)}` : null,
    '---', '', body, ''].filter(l => l !== null);
  await fs.writeFile(path.join(newsDir, p.slug + '.md'), lines.join('\n'));
}
console.log('posts:', posts.length, 'images total:', done.size);
