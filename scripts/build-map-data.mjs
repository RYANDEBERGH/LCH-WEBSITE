// Builds the base geography for the "Where we build" map from OpenStreetMap (Nominatim).
// Output: src/data/map-geo.json (lake, Kingston Road, rail lines, creeks — already simplified).
// Data © OpenStreetMap contributors, ODbL. Re-run only if you want to redraw the base map:
//   NODE_USE_ENV_PROXY=1 node scripts/build-map-data.mjs
// Project pins come from each project's lat/lng; landmarks come from src/data/map.json (both editable in /admin).
import fs from 'node:fs';
const UA = 'lch-website-map-builder/1.0';
const CACHE = 'scripts/.geocache.json';
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const BBOX = { w: -79.368, e: -79.115, s: 43.648, n: 43.797 };

async function nom(q, extra = {}) {
  const key = q + JSON.stringify(extra);
  if (cache[key] !== undefined) return cache[key];
  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q, format: 'jsonv2', limit: '1', countrycodes: 'ca', ...extra });
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  const j = r.ok ? await r.json() : [];
  await new Promise((res) => setTimeout(res, 1100));
  cache[key] = j[0] ?? null;
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  return cache[key];
}
const pt = async (q) => { const h = await nom(q); if (!h) console.warn('  not found:', q); return h ? [+(+h.lon).toFixed(5), +(+h.lat).toFixed(5)] : null; };
const line = async (qs) => (await Promise.all(qs.map(pt))).filter(Boolean);

function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let dmax = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / (Math.hypot(dx, dy) || 1e-12);
    if (d > dmax) { dmax = d; idx = i; }
  }
  return dmax > eps ? [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)] : [a, b];
}
const inBox = ([x, y], pad = 0.03) => x > BBOX.w - pad && x < BBOX.e + pad && y > BBOX.s - pad && y < BBOX.n + pad;

// Lake Ontario: take the longest run of the shoreline ring that falls inside the map, then close it off the bottom edge.
const lakeHit = await nom('Lake Ontario', { polygon_geojson: '1', polygon_threshold: '0.0004' });
const ring = lakeHit.geojson.coordinates[0];
let best = [], cur = [];
for (const p of [...ring, ...ring]) { if (inBox(p)) cur.push(p); else { if (cur.length > best.length) best = cur; cur = []; } if (best.length >= ring.length) break; }
if (cur.length > best.length) best = cur;
const lake = simplify(best, 0.0002);

// Kingston Road: traced through street addresses (numbers rise eastward)
// Only exact house-number matches are kept (Nominatim falls back to a generic point on the road otherwise).
const krNums = [150, 300, 500, 700, 900, 1100, 1300, 1500, 1700, 1900, 2050, 2201, 2340, 2500, 2700, 2900, 3100, 3301, 3500, 3700, 3900, 4100, 4300, 4500, 4630, 4700, 4800, 4900, 5000, 5100, 5200, 5400];
const kingston = [[-79.3135, 43.6693]]; // Kingston Road begins at Queen Street East
for (const num of krNums) {
  const h = await nom(`${num} Kingston Road, Toronto`);
  if (h && new RegExp(`^(.*, )?${num}, Kingston Road`).test(h.display_name)) kingston.push([+(+h.lon).toFixed(5), +(+h.lat).toFixed(5)]);
}

const subway = await line(['Broadview station, Toronto', 'Chester station, Toronto', 'Pape station, Toronto', 'Donlands station, Toronto', 'Greenwood station, Toronto', 'Coxwell station, Toronto', 'Woodbine station, Toronto', 'Main Street station, Toronto', 'Victoria Park station, Toronto', 'Warden station, Toronto', 'Kennedy station, Toronto']);

const creekHit = (await (async () => {
  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q: 'Highland Creek', format: 'jsonv2', limit: '5', countrycodes: 'ca', polygon_geojson: '1', polygon_threshold: '0.0003' });
  if (cache.__creek) return cache.__creek;
  const j = await (await fetch(url, { headers: { 'User-Agent': UA } })).json();
  await new Promise((r) => setTimeout(r, 1100));
  cache.__creek = j.find((h) => h.category === 'waterway') ?? null; fs.writeFileSync(CACHE, JSON.stringify(cache));
  return cache.__creek;
})());
const water = [];
if (creekHit) { const g = creekHit.geojson; const lines = g.type === 'LineString' ? [g.coordinates] : g.coordinates; for (const l of lines) water.push(simplify(l.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]), 0.0002)); }

const out = {
  bbox: BBOX,
  attribution: '© OpenStreetMap contributors',
  lake: lake.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]),
  kingston,
  subway,
  water,
};
fs.writeFileSync('src/data/map-geo.json', JSON.stringify(out));
console.log({ lake: out.lake.length, kingston: kingston.length - 1 + '/' + krNums.length, subway: subway.length, water: water.map((w) => w.length) }, (fs.statSync('src/data/map-geo.json').size / 1024).toFixed(1) + 'KB');
