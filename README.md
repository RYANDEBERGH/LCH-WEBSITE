# LCH Developments — Website

The new lchdevelopments.com. It's a fast, modern static site built with [Astro](https://astro.build), with a **content manager at `/admin`** so anyone on the team can update projects, news, team bios, photos and page text without touching code.

---

## Editing the website (for the team)

1. Go to **https://lchdevelopments.com/admin/** and log in with GitHub.
2. Pick what you want to change from the left menu:

| Section | What's in it |
|---|---|
| **Projects** | Every community. Status, unit count, address, partners, logo, main photo, gallery, description. Tick **Featured on homepage** for the big homepage section. **Order** sets the order. |
| **News & Media** | Project updates and press. For press coverage, paste the link in **Link to original article** and a "Read the full article" button is added. Tick **Save as draft** to hide an article. |
| **Team** | Names, roles, credentials, headshots and bios. **Order** sets the order. |
| **Legal Pages** | The privacy/legal page (and any other simple text page). |
| **Site Settings & Pages** | Phone, email, address, social links, the **orange announcement banner**, the **brand accent colour**, the newsletter box, and all the text on the Homepage, Story, Contact and Corporate pages. |

3. Click **Publish → Publish now**. The live site updates in about 1–2 minutes.

**Photos:** drag images into any image field. Upload big, high-quality JPGs (landscape, 2000px+ wide for main images). The site automatically creates smaller, fast-loading versions for phones and laptops.

---

## One-time setup (to go live)

### 1. Put the code on GitHub
Create a private repository (e.g. `lch-website`) and push this folder to it.

### 2. Connect it to Netlify (free)
1. On [netlify.com](https://netlify.com), click **Add new site → Import an existing project**, and choose the GitHub repo. The build settings are picked up from `netlify.toml`.
2. In **Site configuration → Forms**, enable form detection. The contact form and newsletter sign-ups then appear in the Netlify dashboard, and you can set up email notifications to info@lch.to.

### 3. Turn on the `/admin` login
1. In GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - Homepage URL: your site URL
   - Authorization callback URL: `https://api.netlify.com/auth/done`
2. In Netlify: **Site configuration → Access & security → OAuth → Install provider → GitHub**, then paste the Client ID and Secret.
3. In `public/admin/config.yml`, change `repo: YOUR-GITHUB-USERNAME/lch-website` to your repo.

Anyone who should edit the site needs a GitHub account with write access to the repo.

### 4. Point the domain
In Netlify, go to **Domain management → Add a domain → lchdevelopments.com** and follow the DNS instructions. Old WordPress links (`/media/`, `/2026/11/06/post-name/`, `/privacy-policy`) automatically redirect to the new pages.

### 5. Newsletter → Mailchimp (optional)
The old site sent sign-ups to Mailchimp. To keep that, go to **Site Settings → General → Newsletter** and paste your Mailchimp embedded-form URL. If you leave it blank, sign-ups are collected in Netlify Forms.

---

## For developers

```bash
npm install
npm run dev          # http://localhost:4321  (generates image sizes first)
npm run cms          # in a second terminal: lets /admin edit your local files without logging in
npm run build        # production build → dist/
```

```
src/
  content/projects/  one Markdown file per project
  content/news/      one Markdown file per article
  content/team/      one Markdown file per person
  content/pages/     simple pages (legal)
  data/*.json        site settings + homepage/story/contact/corporate text
  content.config.ts  content schema — keep in sync with public/admin/config.yml
  pages/             routes
  components/ layouts/ styles/
public/
  uploads/           all images (the CMS uploads here)
  admin/             Decap CMS (config.yml + bundled CMS 3.18.0)
scripts/
  optimize-images.mjs   makes responsive WebP sizes into public/_img (runs before dev/build)
  import-wordpress.mjs  one-time import used to pull content from the old WordPress site
```

**Adding a field:** add it to the collection in `public/admin/config.yml`, then to the matching schema in `src/content.config.ts`, then use it in the page template.

**Hosting elsewhere:** the site is plain static files (`dist/`), so it works on Cloudflare Pages, Vercel or anywhere else. Only the forms (Netlify Forms) and the `/admin` GitHub login (Netlify's OAuth) are Netlify-specific. Elsewhere, swap the forms for a service such as Formspree and use a small OAuth proxy for Decap.
