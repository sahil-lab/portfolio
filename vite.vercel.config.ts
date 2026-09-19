import { defineConfig } from 'vite';
import vinext from 'vinext';
import { nitro } from 'nitro/vite';
import tailwindcss from '@tailwindcss/vite';

// Separate adapter: the existing Sites/Cloudflare build remains in vite.config.ts.
export default defineConfig({
  plugins: [tailwindcss(), vinext(), nitro({ preset: 'vercel' })],
});
