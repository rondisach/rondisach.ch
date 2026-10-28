// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://rondisach.ch',
  // Seiten als /impressum.html usw. ausgeben, damit alte Links weiter funktionieren.
  build: { format: 'file' },
  integrations: [sitemap()],
  // Die Entwickler-Leiste unten im Browser nur ausblenden – sie erscheint ohnehin nie auf der echten Website.
  devToolbar: { enabled: false },
  // Three.js wird nur für den 3D-Hero nachgeladen; die Grösse ist bewusst.
  vite: { build: { chunkSizeWarningLimit: 700 } },
});
