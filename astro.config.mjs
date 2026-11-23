import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import settings from './src/data/settings.json' with { type: 'json' };

export default defineConfig({
  site: settings.siteUrl,
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/admin/') })],
});
