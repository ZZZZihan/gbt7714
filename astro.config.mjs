import { defineConfig } from 'astro/config';

const site = process.env.PUBLIC_SITE_URL || 'https://softcloudnote.top';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  build: {
    format: 'directory',
  },
});
