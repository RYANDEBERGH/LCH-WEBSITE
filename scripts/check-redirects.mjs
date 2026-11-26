#!/usr/bin/env node
// Checks that every URL from the old WordPress site still works on the new site.
//
//   node scripts/check-redirects.mjs https://lch-website.netlify.app
//   node scripts/check-redirects.mjs https://lchdevelopments.com
//
// For each old URL (with and without the trailing slash) it reports the status code of each hop,
// the final URL, and PASS when the URL ends in a 200 after at most one permanent redirect (301/308).
// A page served directly at the slash-less address also passes (its canonical tag points to the slash version).
// URLs listed as "404" in docs/redirect-map.csv (pages removed on purpose) PASS when they return 404.
// Exits with code 1 if any row fails, so it can gate a deploy.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const base = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(base)) {
  console.error('Usage: node scripts/check-redirects.mjs <base-url>   e.g. https://lchdevelopments.com');
  process.exit(2);
}

// Old URLs, expected targets and actions come from the approved redirect map
const csvPath = fileURLToPath(new URL('../docs/redirect-map.csv', import.meta.url));
const parseCsv = (text) => {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
};
const [header, ...data] = parseCsv(readFileSync(csvPath, 'utf8')).filter((r) => r.length > 1);
const col = (name) => header.indexOf(name);
const entries = data.map((r) => ({ old: r[col('old_url')], target: r[col('new_url')], action: r[col('action')] }));

const variants = (p) => {
  const bare = p.replace(/\/+$/, '') || '/';
  return bare === '/' ? ['/'] : [bare, bare + '/'];
};

async function trace(url, maxHops = 5) {
  const hops = [];
  let current = url;
  for (let i = 0; i <= maxHops; i++) {
    let res;
    try {
      res = await fetch(current, { redirect: 'manual', headers: { 'user-agent': 'lch-redirect-check/1.0' } });
    } catch (e) {
      hops.push({ status: 'ERR', url: current, error: e.cause?.code || e.message });
      return hops;
    }
    await res.arrayBuffer().catch(() => {}); // drain the body so the connection can be reused
    hops.push({ status: res.status, url: current });
    const loc = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc) { current = new URL(loc, current).href; continue; }
    return hops;
  }
  return hops;
}

const rows = [];
for (const e of entries) {
  for (const path of variants(e.old)) {
    const hops = await trace(base + path);
    const last = hops[hops.length - 1];
    const redirects = hops.slice(0, -1);
    const finalPath = last.url.startsWith(base) ? last.url.slice(base.length) || '/' : last.url;
    let pass, why = '';
    if (e.action === '404') {
      pass = last.status === 404 && redirects.length === 0;
      if (!pass) why = 'expected a 404';
    } else {
      const permanent = redirects.every((h) => h.status === 301 || h.status === 308);
      pass = last.status === 200 && redirects.length <= 1 && permanent;
      if (!pass) why = last.status !== 200 ? `ended in ${last.status}` : redirects.length > 1 ? `${redirects.length} redirects` : 'temporary redirect';
      const expected = e.target === '(none)' ? null : e.target;
      const norm = (x) => x.replace(/\/+$/, '') || '/';
      if (pass && expected && norm(finalPath) !== norm(expected)) { pass = false; why = `expected ${expected}`; }
    }
    rows.push({ path, chain: hops.map((h) => h.status).join(' → '), final: finalPath, pass, why });
  }
}

const w = Math.min(70, Math.max(...rows.map((r) => r.path.length)));
for (const r of rows) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.path.padEnd(w)}  ${r.chain.padEnd(15)}  ${r.final}${r.why ? '   ← ' + r.why : ''}`);
}
const failed = rows.filter((r) => !r.pass).length;
console.log(`\n${rows.length - failed}/${rows.length} passed against ${base}`);
process.exit(failed ? 1 : 0);
