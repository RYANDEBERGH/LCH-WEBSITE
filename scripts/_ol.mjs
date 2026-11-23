const UA = 'lch-website-map-builder/1.0';
for (const q of ['Ontario Line', 'Ontario Line, Toronto', 'Gerrard-Carlaw station', 'Riverside-Leslieville station', 'East Harbour station', 'Cosburn station', 'Pape station Ontario Line', 'Thorncliffe Park station', 'Flemingdon Park station', 'Science Centre station', 'Corktown station', 'Moss Park station']) {
  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q, format: 'jsonv2', limit: '4', countrycodes: 'ca', polygon_geojson: '1', polygon_threshold: '0.0001' });
  const j = await (await fetch(url, { headers: { 'User-Agent': UA } })).json();
  for (const h of j) { const g = h.geojson; const n = JSON.stringify(g.coordinates).match(/\[-?\d/g)?.length; console.log(q.padEnd(30), '|', h.category + '/' + h.type, '|', g.type, n, '|', (+h.lat).toFixed(5), (+h.lon).toFixed(5), '|', h.display_name.slice(0, 80)); }
  if (!j.length) console.log(q.padEnd(30), '| not found');
  await new Promise((r) => setTimeout(r, 1100));
}
