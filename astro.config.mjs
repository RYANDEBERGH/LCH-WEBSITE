import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import settings from './src/data/settings.json' with { type: 'json' };

export default defineConfig({
  site: settings.siteUrl,
  trailingSlash: 'always',
  // Pages that should never be in Google: the CMS, the form thank-you page and the 404 page
  integrations: [sitemap({ filter: (page) => !/\/(admin|thank-you|404)\/?$|\/admin\//.test(new URL(page).pathname) })],
});
