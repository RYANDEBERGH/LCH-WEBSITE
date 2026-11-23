// Builds the base map for the "Where we build" section from OpenFreeMap vector tiles
// (OpenStreetMap data, OpenMapTiles schema). Output: src/data/map-geo.json — SVG paths already projected
// (Web Mercator) into a 1000-unit-wide frame, plus the projection so pins and landmarks line up.
//   NODE_USE_ENV_PROXY=1 node scripts/build-map-tiles.mjs
// Data © OpenStreetMap contributors · © OpenMapTiles · OpenFreeMap.
import fs from 'node:fs';
import path from 'node:path';
import Pbf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';

const Z = 13;
const BBOX = { w: -79.372, e: -79.112, s: 43.646, n: 43.80 };
const W = 1000;
const UA = 'lch-website-map-builder/1.0';
const CACHE = 'scripts/.tilecache';
fs.mkdirSync(CACHE, { recursive: true });

const lon2x = (lon) => ((lon + 180) / 360) * 2 ** Z;
const lat2y = (lat) => ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** Z;
const X0 = lon2x(BBOX.w), Y0 = lat2y(BBOX.n);
const S = W / (lon2x(BBOX.e) - X0);
const H = Math.round((lat2y(BBOX.s) - Y0) * S);

const index = await (await fetch('https://tiles.openfreemap.org/planet', { headers: { 'User-Agent': UA } })).json();
const tileUrl = index.tiles[0];
async function tile(x, y) {
  const f = path.join(CACHE, `${Z}-${x}-${y}.pbf`);
  if (!fs.existsSync(f)) {
    const r = await fetch(tileUrl.replace('{z}', Z).replace('{x}', x).replace('{y}', y), { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error(`tile ${x},${y}: ${r.status}`);
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  }
  return new VectorTile(new Pbf(fs.readFileSync(f)));
}

// Douglas–Peucker in SVG units
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const a = pts[0], b = pts[pts.length - 1];
  let dmax = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / (Math.hypot(dx, dy) || 1e-9);
    if (d > dmax) { dmax = d; idx = i; }
  }
  return dmax > eps ? [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)] : [a, b];
}
// Closed rings start and end on the same point, which Douglas–Peucker can't handle directly:
// split the ring at its farthest point from the start and simplify each half.
function simplifyRing(r, eps) {
  const pts = r.length > 1 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] ? r.slice(0, -1) : r;
  if (pts.length < 4) return pts;
  let far = 1, dmax = 0;
  for (let i = 1; i < pts.length; i++) { const dd = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (dd > dmax) { dmax = dd; far = i; } }
  return [...simplify(pts.slice(0, far + 1), eps).slice(0, -1), ...simplify([...pts.slice(far), pts[0]], eps).slice(0, -1)];
}
const area = (r) => Math.abs(r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
const fmt = (n) => (Math.round(n * 10) / 10).toString();
const inView = (pts, pad = 40) => pts.some(([x, y]) => x > -pad && x < W + pad && y > -pad && y < H + pad);
const d = (pts, close, int = false) => 'M' + pts.map(([x, y]) => (int ? `${Math.round(x)} ${Math.round(y)}` : `${fmt(x)} ${fmt(y)}`)).join('L') + (close ? 'Z' : '');

const layers = {};
const add = (k, s) => { (layers[k] ??= []).push(s); };
const names = {}; // road name -> [{pts,len}]
const places = [];
const stations = [];

const xs = [Math.floor(lon2x(BBOX.w)), Math.floor(lon2x(BBOX.e))];
const ys = [Math.floor(lat2y(BBOX.n)), Math.floor(lat2y(BBOX.s))];
for (let tx = xs[0]; tx <= xs[1]; tx++) for (let ty = ys[0]; ty <= ys[1]; ty++) {
  const t = await tile(tx, ty);
  const proj = (ext) => (p) => [((tx + p.x / ext) - X0) * S, ((ty + p.y / ext) - Y0) * S];
  const each = (name, fn) => { const L = t.layers[name]; if (!L) return; for (let i = 0; i < L.length; i++) { const f = L.feature(i); fn(f, f.loadGeometry().map((r) => r.map(proj(L.extent)))); } };

  each('water', (f, rings) => { if (f.properties.class === 'swimming_pool') return; for (const r of rings) if (area(r) > 4 && inView(r)) add('water', d(simplifyRing(r, 0.4), true)); });
  each('park', (f, rings) => { for (const r of rings) if (area(r) > 12 && inView(r)) add('park', d(simplifyRing(r, 0.8), true)); });
  each('landcover', (f, rings) => {
    const c = f.properties.class, sc = f.properties.subclass;
    if (c === 'wood' || sc === 'park' || sc === 'golf_course' || sc === 'cemetery') for (const r of rings) if (area(r) > 12 && inView(r)) add(c === 'wood' ? 'wood' : 'park', d(simplifyRing(r, 0.8), true));
  });
  each('waterway', (f, lines) => {
    if (f.properties.brunnel === 'tunnel') return;
    const k = f.properties.class === 'river' ? 'river' : 'stream';
    for (const l of lines) if (inView(l)) add(k, d(simplify(l, 0.4)));
  });
  each('transportation', (f, lines) => {
    const { class: c, subclass: sc, brunnel } = f.properties;
    let k = null;
    if (c === 'motorway' || c === 'trunk') k = 'motorway';
    else if (c === 'primary') k = 'primary';
    else if (c === 'secondary') k = 'secondary';
    else if (c === 'tertiary') k = 'tertiary';
    else if (c === 'minor') k = 'minor';
    else if (c === 'rail' && sc === 'rail') k = 'rail';
    else if (c === 'transit' && sc === 'subway') k = 'subway';
    else if (c === 'transit' && sc === 'light_rail') k = brunnel === 'tunnel' ? 'lrtTunnel' : 'lrt';
    if (!k) return;
    for (const l of lines) if (inView(l, 5)) add(k, k === 'minor' ? d(simplify(l, 1.0), false, true) : d(simplify(l, 0.35)));
  });
  each('transportation_name', (f, lines) => {
    const nm = f.properties.name; if (!nm) return;
    for (const l of lines) {
      const s = simplify(l, 0.35);
      if (!inView(s, 0)) continue;
      const len = s.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - s[i - 1][0], p[1] - s[i - 1][1]) : 0), 0);
      (names[nm] ??= []).push({ pts: s, len, cls: f.properties.class });
    }
  });
  each('place', (f, pts) => { const p = pts[0][0]; if (inView([p], 0)) places.push({ name: f.properties.name, class: f.properties.class, rank: f.properties.rank, x: +fmt(p[0]), y: +fmt(p[1]) }); });
  each('poi', (f, pts) => {
    const { class: c, subclass: sc, name } = f.properties; const p = pts[0][0];
    if (c === 'railway' && inView([p], 0)) stations.push({ name, subclass: sc, x: +fmt(p[0]), y: +fmt(p[1]) });
  });
}

// Kingston Road, highlighted from the named-road geometry
const krPieces = (names['Kingston Road'] ?? []).map((n) => n.pts);
// Join small gaps where the named-road data splits Kingston Road into pieces (ends within 10 units)
const ends = krPieces.flatMap((p) => [p[0], p[p.length - 1]]);
const joins = [];
for (let i = 0; i < ends.length; i++) for (let j = i + 1; j < ends.length; j++) {
  if ((i >> 1) === (j >> 1)) continue;
  const g = Math.hypot(ends[i][0] - ends[j][0], ends[i][1] - ends[j][1]);
  if (g > 0.05 && g < 10) joins.push([ends[i], ends[j]]);
}
const kingston = [...krPieces.map((p) => d(p)), ...joins.map((j) => d(j))];
// Labels: longest piece of each major road; oriented to read left-to-right
const LABEL_CLASSES = new Set(['motorway', 'trunk', 'primary', 'secondary']);
const roadLabels = Object.entries(names)
  .filter(([nm, parts]) => nm !== 'Kingston Road' && parts.some((p) => LABEL_CLASSES.has(p.cls)))
  .map(([nm, parts]) => {
    const best = parts.filter((p) => LABEL_CLASSES.has(p.cls)).sort((a, b) => b.len - a.len)[0];
    let pts = best.pts;
    if (pts[0][0] > pts[pts.length - 1][0]) pts = pts.slice().reverse();
    return { name: nm, d: d(pts), len: Math.round(best.len) };
  })
  .filter((l) => l.len > 70)
  .sort((a, b) => b.len - a.len);

const out = {
  attribution: 'Map data © OpenStreetMap contributors · © OpenMapTiles · OpenFreeMap',
  proj: { z: Z, x0: X0, y0: Y0, s: S, w: W, h: H },
  layers: Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.join('')])),
  kingston,
  roadLabels,
  places: places.filter((p) => ['suburb', 'neighbourhood', 'quarter'].includes(p.class)),
  stations,
};
fs.writeFileSync('src/data/map-geo.json', JSON.stringify(out));
console.log('size', (fs.statSync('src/data/map-geo.json').size / 1024).toFixed(0) + 'KB', 'frame', W, 'x', H);
console.log(Object.fromEntries(Object.entries(out.layers).map(([k, v]) => [k, (v.length / 1024).toFixed(0) + 'KB'])));
console.log('kingston pieces', kingston.length, '| labels', roadLabels.map((l) => l.name).join(', '));
console.log('places', out.places.map((p) => `${p.name}(${p.class})`).join(', '));
console.log('stations', stations.map((s) => `${s.name}/${s.subclass}`).join(', '));
