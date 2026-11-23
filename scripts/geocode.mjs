// Looks up coordinates with OpenStreetMap Nominatim (1 request/second, per their usage policy).
// Usage: node scripts/geocode.mjs "query" "query" ...  → prints JSON
const UA = 'lch-website-map-builder/1.0';
const out = [];
for (const q of process.argv.slice(2)) {
  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q, format: 'jsonv2', limit: '1', countrycodes: 'ca', addressdetails: '1' });
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  const j = r.ok ? await r.json() : [];
  const h = j[0];
  out.push(h ? { q, lat: +(+h.lat).toFixed(5), lng: +(+h.lon).toFixed(5), type: `${h.category}/${h.type}`, name: h.display_name.split(',').slice(0, 4).join(',') } : { q, error: r.status });
  await new Promise((res) => setTimeout(res, 1100));
}
console.log(JSON.stringify(out, null, 1));
