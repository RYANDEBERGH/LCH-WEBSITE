// Fetches map line geometry from OpenStreetMap (Overpass API) for the corridor map.
// Output: src/data/map-lines.json — simplified [lng,lat] polylines per layer. © OpenStreetMap contributors (ODbL).
import fs from 'node:fs';
const BBOX = '43.655,-79.37,43.80,-79.12'; // S,W,N,E
const q = `[out:json][timeout:90];
(
  way["highway"]["name"="Kingston Road"](${BBOX});
)->.kr;
(
  way["natural"="coastline"](${BBOX});
)->.coast;
(
  way["railway"="subway"](${BBOX});
)->.sub;
(
  way["railway"="rail"]["usage"="main"](${BBOX});
)->.rail;
(
  way["waterway"~"river|stream"]["name"~"Highland Creek|Don River|Bellamy Ravine|Gates Gully"](${BBOX});
)->.water;
(
  way["highway"]["name"="Doris McCarthy Trail"](${BBOX});
)->.dm;
(
  relation["route"="bus"](bw.kr);
)->.bus;
.kr out geom; .coast out geom; .sub out geom; .rail out geom; .water out geom; .dm out geom; .bus out tags;`;
const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'User-Agent': 'lch-website-map-builder/1.0', 'Content-Type': 'application/x-www-form-urlencoded' } });
if (!r.ok) { console.error('overpass', r.status, (await r.text()).slice(0, 300)); process.exit(1); }
const j = await r.json();
// Douglas–Peucker simplify
const simplify = (pts, eps) => {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let dmax = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / Math.hypot(dx, dy || 1e-12);
    if (d > dmax) { dmax = d; idx = i; }
  }
  return dmax > eps ? [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)] : [a, b];
};
const layer = (w) => {
  const t = w.tags || {};
  if (t.highway && t.name === 'Kingston Road') return 'kingston';
  if (t.natural === 'coastline') return 'coast';
  if (t.railway === 'subway') return 'subway';
  if (t.railway === 'rail') return 'rail';
  if (t.waterway) return 'water';
  if (t.name === 'Doris McCarthy Trail') return 'trail';
};
const out = { kingston: [], coast: [], subway: [], rail: [], water: [], trail: [], busRoutes: [] };
for (const e of j.elements) {
  if (e.type === 'relation') { out.busRoutes.push({ ref: e.tags.ref, name: e.tags.name, operator: e.tags.operator, network: e.tags.network }); continue; }
  const L = layer(e); if (!L || !e.geometry) continue;
  const pts = simplify(e.geometry.map((g) => [+g.lon.toFixed(5), +g.lat.toFixed(5)]), 0.00012);
  out[L].push(pts);
}
fs.writeFileSync('src/data/map-lines.json', JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])), (fs.statSync('src/data/map-lines.json').size / 1024).toFixed(0) + 'KB');
const seen = new Set();
for (const b of out.busRoutes) { const k = b.ref + b.network; if (!seen.has(k)) { seen.add(k); console.log('bus', b.ref, '|', b.name, '|', b.network); } }
