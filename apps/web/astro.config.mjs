import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// PureSip frontend. SSR via @astrojs/cloudflare (workerd adapter) so pages can
// call the API with server-side caching and no CORS friction in production.
export default defineConfig({
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  vite: {
    plugins: [tailwindcss()],
    server: {
      // Local dev: forward /api to `wrangler dev` on :8787 so an empty
      // PUBLIC_API_BASE_URL works out of the box. No effect on production builds.
      proxy: {
        '/api': 'http://localhost:8787',
      },
    },
  },
});
