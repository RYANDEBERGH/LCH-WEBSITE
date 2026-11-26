# Launch checklist: lchdevelopments.com → Netlify

Nothing ships until `node scripts/check-redirects.mjs <url>` passes every row.

## Before launch day
- [ ] **Pay the lchdevelopments.com renewal at TMD Hosting** (expires 2026-12-01). Turn on auto-renew.
- [ ] Review the new site at the Netlify address (desktop and phone).
- [ ] Privacy & Terms: confirm info@lch.to as the privacy contact; quick legal read.
- [ ] Netlify → Forms → form notifications: send contact and partnership submissions to the right inbox.
- [ ] Take a full backup of the WordPress site (cPanel → Backuply, or TMD support). Keep it at least 3 months.

## Launch day (about 15 minutes)
1. Netlify → Domain management → **Add a domain** → `lchdevelopments.com` (and `www`). Netlify shows the exact records to use.
2. TMD cPanel → Zone Editor → lchdevelopments.com, change only:
   - `lchdevelopments.com` **A** record: 198.38.90.118 → the address Netlify gives
   - `www.lchdevelopments.com` **CNAME**: lchdevelopments.com → `lch-website.netlify.app`
   - Leave every other record alone (MX, TXT incl. `google-site-verification`, staging, cPanel records).
3. Netlify: make the site **public** (it is private while in review). HTTPS is issued automatically.
4. Run `node scripts/check-redirects.mjs https://lchdevelopments.com`. Every row must PASS.
5. Rollback if needed: set the A record back to 198.38.90.118 and the www CNAME back to lchdevelopments.com (TTL is 15 minutes).

## After launch
- [ ] Google Search Console (already verified via the TXT record): submit `https://lchdevelopments.com/sitemap-index.xml`; watch Pages → Not found for a few weeks.
- [ ] lch.to forwarding: confirm it is **permanent (301)** to `https://lchdevelopments.com/` (cPanel → Domains → Redirects, or Register.TO). Do not touch lch.to's Microsoft 365 email records.
- [ ] Keep the TMD hosting account: it also serves the lch.to forward and other company sites.
- [ ] Decap CMS at /admin: connect GitHub login (Netlify → Access & security → OAuth → GitHub provider).
- [ ] Move registrar/hosting/Microsoft 365 passwords from the Word document into a password manager.
